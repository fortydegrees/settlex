import { describe, it, expect, vi } from "vitest";
import { PufferBotManager } from "../bots/pufferBotManager";
import { IdlePresenceManager } from "../presence/IdlePresenceManager";
import { TimerManager } from "../timers/TimerManager";
import { createTimerPubSub } from "../timers/timerPubSub";

it("forwards publish payloads to TimerManager", () => {
  const manager = { onState: vi.fn(), getTimerSnapshot: vi.fn() };
  const pubSub = createTimerPubSub(manager);
  const payload = {
    type: "update",
    args: [
      "1",
      {
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "preRoll" }
        }
      }
    ]
  };

  pubSub.publish("MATCH-1", payload);

  expect(manager.onState).toHaveBeenCalledWith("1", payload.args[1], null);
  expect(manager.getTimerSnapshot).toHaveBeenCalledWith("1", payload.args[1]);
});

it("deleteMatch drops cached match state and subscribers", () => {
  const manager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const pubSub = createTimerPubSub(manager);
  const received = vi.fn();

  pubSub.subscribe("MATCH-1", received);
  pubSub.publish("MATCH-1", {
    type: "update",
    args: ["1", { G: {}, ctx: { phase: "main" } }]
  });
  expect(received).toHaveBeenCalledTimes(1);

  pubSub.deleteMatch("1");
  pubSub.publish("MATCH-1", {
    type: "update",
    args: ["1", { G: {}, ctx: { phase: "main" } }]
  });

  expect(received).toHaveBeenCalledTimes(1);
});

it("attaches timer snapshot to update payloads", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

  const manager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue({
      kind: "turn",
      remainingMs: 5000,
      totalMs: 60000,
      stageKey: "main:"
    })
  };
  const pubSub = createTimerPubSub(manager);
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const payload = {
    type: "update",
    args: [
      "1",
      {
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "preRoll" }
        }
      }
    ]
  };

  pubSub.publish("MATCH-1", payload);

  expect(received).toHaveBeenCalledTimes(1);
  const forwarded = received.mock.calls[0][0];
  expect(forwarded.args[1].timerSnapshot).toEqual({
    kind: "turn",
    remainingMs: 5000,
    totalMs: 60000,
    stageKey: "main:"
  });
  expect(forwarded.args[1].timerServerTimeMs).toBe(Date.now());

  vi.useRealTimers();
});

it("attaches timer snapshot to patch payloads", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

  const manager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue({
      kind: "stage",
      remainingMs: 2000,
      totalMs: 10000,
      stageKey: "main:postRoll"
    })
  };
  const pubSub = createTimerPubSub(manager);
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const payload = {
    type: "patch",
    args: ["1", 10, { ctx: {} }, { ctx: { phase: "main" } }]
  };

  pubSub.publish("MATCH-1", payload);

  const forwarded = received.mock.calls[0][0];
  expect(forwarded.args[3].timerSnapshot).toEqual({
    kind: "stage",
    remainingMs: 2000,
    totalMs: 10000,
    stageKey: "main:postRoll"
  });
  expect(forwarded.args[3].timerServerTimeMs).toBe(Date.now());

  vi.useRealTimers();
});

it("forwards matchData to disconnect presence and rebroadcasts cached state with presence attached", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-01T10:00:00Z"));

  const timerManager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const disconnectManager = {
    onMatchData: vi.fn(),
    onState: vi.fn(),
    getSnapshot: vi.fn().mockReturnValue({
      activeDisconnectPlayerId: "1",
      statusByPlayerId: {
        "0": { status: "connected" },
        "1": { status: "disconnected" }
      },
      events: []
    })
  };
  const pubSub = createTimerPubSub(timerManager, { disconnectManager });
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const state = {
    G: { gameLogSeq: 0 },
    ctx: {
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" }
    }
  };

  pubSub.publish("MATCH-1", {
    type: "update",
    args: ["1", state]
  });
  received.mockClear();

  const matchData = [
    { id: "0", name: "Alice", isConnected: true },
    { id: "1", name: "Bren", isConnected: false }
  ];

  pubSub.publish("MATCH-1", {
    type: "matchData",
    args: ["1", matchData]
  });

  expect(disconnectManager.onMatchData).toHaveBeenCalledWith("1", matchData);
  expect(disconnectManager.onState).toHaveBeenCalledWith("1", state, null);

  const payloads = received.mock.calls.map(([payload]) => payload);
  expect(
    payloads.some(
      (payload) =>
        payload.type === "update" &&
        payload.args?.[1]?.disconnectPresence?.activeDisconnectPlayerId === "1" &&
        payload.args?.[1]?.disconnectServerTimeMs === Date.now()
    )
  ).toBe(true);

  vi.useRealTimers();
});

it("loads current state on matchData when no cached state exists", async () => {
  const timerManager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const disconnectManager = {
    onMatchData: vi.fn(),
    onState: vi.fn(),
    getSnapshot: vi.fn().mockReturnValue({
      activeDisconnectPlayerId: null,
      statusByPlayerId: {
        "0": { status: "connected" },
        "1": { status: "connected" }
      },
      events: [
        {
          id: 2,
          type: "server:reconnect",
          playerId: "1",
          createdAtMs: Date.now(),
          afterGameLogSeq: 4
        }
      ]
    })
  };
  const state = {
    G: { gameLogSeq: 4 },
    ctx: {
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" }
    }
  };
  const stateLoader = vi.fn().mockResolvedValue(state);
  const pubSub = createTimerPubSub(timerManager, {
    disconnectManager,
    stateLoader
  });
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const matchData = [
    { id: "0", name: "Alice", isConnected: true },
    { id: "1", name: "Bren", isConnected: true }
  ];

  pubSub.publish("MATCH-1", {
    type: "matchData",
    args: ["1", matchData]
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(stateLoader).toHaveBeenCalledWith("1");
  expect(disconnectManager.onState).toHaveBeenCalledWith("1", state, null);

  const payloads = received.mock.calls.map(([payload]) => payload);
  expect(
    payloads.some(
      (payload) =>
        payload.type === "update" &&
        payload.args?.[1]?.disconnectPresence?.events?.[0]?.type ===
          "server:reconnect"
      )
  ).toBe(true);
});

it("forwards state and matchData to idle presence and attaches idle snapshots", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-03T09:00:00Z"));

  const timerManager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const idleManager = {
    onState: vi.fn(),
    onMatchData: vi.fn(),
    getSnapshot: vi.fn().mockReturnValue({
      activeIdlePlayerId: "1",
      statusByPlayerId: {
        "1": { status: "idle", idleStrikeCount: 2 }
      },
      events: []
    })
  };
  const pubSub = createTimerPubSub(timerManager, { idleManager });
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const state = {
    G: { gameLogSeq: 2 },
    ctx: {
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" }
    }
  };
  const matchData = [
    { id: "0", name: "Alice", isConnected: true },
    { id: "1", name: "Bren", isConnected: true }
  ];

  pubSub.publish("MATCH-1", {
    type: "update",
    args: ["1", state]
  });
  pubSub.publish("MATCH-1", {
    type: "matchData",
    args: ["1", matchData]
  });

  expect(idleManager.onState).toHaveBeenCalledWith("1", state, null);
  expect(idleManager.onMatchData).toHaveBeenCalledWith("1", matchData);

  const payloads = received.mock.calls.map(([payload]) => payload);
  expect(
    payloads.some(
      (payload) =>
        payload.type === "update" &&
        payload.args?.[1]?.idlePresence?.activeIdlePlayerId === "1" &&
        payload.args?.[1]?.idleServerTimeMs === Date.now()
    )
  ).toBe(true);

  vi.useRealTimers();
});

it("passes raw master update deltalogs through to idle tracking", () => {
  const timerManager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const idleManager = new IdlePresenceManager({
    dispatch: vi.fn(),
    idleStrikeThreshold: 2,
    idleTimeoutMs: 60_000
  });
  const pubSub = createTimerPubSub(timerManager, { idleManager });

  const createState = ({
    currentPlayer = "0",
    turn = 1,
    activeStage = "postRoll",
    gameLogSeq = 0,
    deltalog = []
  } = {}) => ({
    G: {
      core: {
        players: ["0", "1"],
        gameOver: null
      },
      gameLogSeq,
      deltalog
    },
    ctx: {
      phase: "main",
      currentPlayer,
      activePlayers: { [currentPlayer]: activeStage },
      turn,
      gameover: undefined
    },
    deltalog
  });

  const moveEntry = (type, playerID) => ({
    action: {
      type: "MAKE_MOVE",
      payload: {
        type,
        playerID: String(playerID)
      }
    }
  });

  pubSub.publish("MATCH-raw", {
    type: "update",
    args: [
      "raw",
      createState({
        currentPlayer: "1",
        turn: 4,
        activeStage: "preRoll"
      })
    ]
  });
  pubSub.publish("MATCH-raw", {
    type: "update",
    args: [
      "raw",
      createState({
        currentPlayer: "1",
        turn: 4,
        activeStage: "postRoll",
        deltalog: [moveEntry("autoRoll", "1")]
      })
    ]
  });
  pubSub.publish("MATCH-raw", {
    type: "update",
    args: [
      "raw",
      createState({
        currentPlayer: "0",
        turn: 5,
        activeStage: "preRoll",
        deltalog: [moveEntry("autoEndTurn", "1")]
      })
    ]
  });

  const snapshot = idleManager.getSnapshot("raw");
  expect(snapshot.statusByPlayerId["1"]).toMatchObject({
    status: "connected",
    idleStrikeCount: 1
  });
});

it("seeds bot seats from matchData before a pregame update schedules bot ready-up", () => {
  vi.useFakeTimers();

  const dispatch = vi.fn();
  const botManager = new PufferBotManager();
  const timerManager = new TimerManager({
    dispatch,
    botMoveDelayMs: 250,
    isBotPlayer: ({ matchID, playerID }) =>
      botManager.isBotPlayerForMatch(matchID, playerID)
  });
  const pubSub = createTimerPubSub(timerManager, { botManager });

  pubSub.publish("MATCH-bot", {
    type: "matchData",
    args: [
      "bot",
      [
        { id: "0", name: "Alice", data: { color: "red" } },
        {
          id: "1",
          name: "[BOT] Puffer 2",
          data: { bot: "puffer", isBot: true, emoji: "🤖" }
        }
      ]
    ]
  });

  pubSub.publish("MATCH-bot", {
    type: "update",
    args: [
      "bot",
      {
        _stateID: 7,
        G: {
          core: {
            players: ["0", "1"]
          },
          preGame: {
            readyByPlayerId: { "0": true }
          }
        },
        ctx: {
          phase: "preGame",
          currentPlayer: "0",
          activePlayers: { all: "waiting" },
          turn: 1
        }
      }
    ]
  });

  vi.advanceTimersByTime(249);
  expect(dispatch).not.toHaveBeenCalledWith({
    matchID: "bot",
    move: "autoBot",
    playerID: "1"
  });

  vi.advanceTimersByTime(1);
  expect(dispatch).toHaveBeenCalledWith({
    matchID: "bot",
    move: "autoBot",
    playerID: "1"
  });

  vi.useRealTimers();
});

it("forwards state and matchData to the archive manager", () => {
  const timerManager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const archiveManager = {
    onState: vi.fn(),
    onMatchData: vi.fn()
  };
  const pubSub = createTimerPubSub(timerManager, { archiveManager });

  const state = {
    G: { gameLogSeq: 3 },
    ctx: {
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" },
      gameover: undefined
    }
  };
  const matchData = [
    { id: "0", name: "Ada", data: { accountId: "acct_1" } },
    { id: "1", name: "[BOT] Puffer 2", data: { bot: "puffer", isBot: true } }
  ];

  pubSub.publish("MATCH-archive", {
    type: "update",
    args: ["archive", state]
  });
  pubSub.publish("MATCH-archive", {
    type: "matchData",
    args: ["archive", matchData]
  });

  expect(archiveManager.onState).toHaveBeenCalledWith("archive", state);
  expect(archiveManager.onMatchData).toHaveBeenCalledWith("archive", matchData);
});

it("captures live chat payloads for archival retention", () => {
  const timerManager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const chatStore = {
    onChatMessage: vi.fn()
  };
  const pubSub = createTimerPubSub(timerManager, { chatStore });

  const chatMessage = {
    id: "chat_1",
    sender: "0",
    payload: { message: "gg" }
  };

  pubSub.publish("MATCH-chat", {
    type: "chat",
    args: ["chat", chatMessage]
  });

  expect(chatStore.onChatMessage).toHaveBeenCalledWith("chat", chatMessage);
});

it("forwards finished-match state and matchData to the retention manager", () => {
  const timerManager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue(null)
  };
  const finishedMatchRetentionManager = {
    onState: vi.fn(),
    onMatchData: vi.fn()
  };
  const pubSub = createTimerPubSub(timerManager, {
    finishedMatchRetentionManager
  });

  const state = {
    G: { gameLogSeq: 7 },
    ctx: {
      phase: "gameOver",
      gameover: { winner: "0" }
    }
  };
  const matchData = [
    { id: "0", isConnected: false },
    { id: "1", isConnected: false }
  ];

  pubSub.publish("MATCH-retain", {
    type: "update",
    args: ["retain", state]
  });
  pubSub.publish("MATCH-retain", {
    type: "matchData",
    args: ["retain", matchData]
  });

  expect(finishedMatchRetentionManager.onState).toHaveBeenCalledWith(
    "retain",
    state
  );
  expect(finishedMatchRetentionManager.onMatchData).toHaveBeenCalledWith(
    "retain",
    matchData
  );
});
