import { describe, expect, it, vi } from "vitest";
import { IdlePresenceManager } from "../presence/IdlePresenceManager";

const createState = ({
  currentPlayer = "0",
  turn = 1,
  phase = "main",
  activeStage = "postRoll",
  gameLogSeq = 3,
  core = {}
} = {}) => ({
  G: {
    core: {
      players: ["0", "1"],
      gameOver: null,
      ...core
    },
    gameLogSeq
  },
  ctx: {
    phase,
    currentPlayer,
    activePlayers:
      phase === "main"
        ? { [currentPlayer]: activeStage }
        : { [currentPlayer]: activeStage },
    turn,
    gameover: undefined
  }
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

const createMatchData = ({ connected0 = true, connected1 = true } = {}) => [
  { id: "0", name: "Alice", isConnected: connected0 },
  { id: "1", name: "Bren", isConnected: connected1 }
];

const simulateAutoResolvedTurn = ({
  manager,
  matchID,
  playerID,
  startTurn,
  gameLogSeq = 3
}) => {
  const nextPlayerId = playerID === "0" ? "1" : "0";

  manager.onState(
    matchID,
    createState({
      currentPlayer: playerID,
      turn: startTurn,
      gameLogSeq
    })
  );
  manager.onState(
    matchID,
    createState({
      currentPlayer: playerID,
      turn: startTurn,
      gameLogSeq
    }),
    [moveEntry("autoRoll", playerID)]
  );
  manager.onState(
    matchID,
    createState({
      currentPlayer: nextPlayerId,
      turn: startTurn + 1,
      gameLogSeq
    }),
    [moveEntry("autoEndTurn", playerID)]
  );
};

describe("IdlePresenceManager", () => {
  it("counts an idle strike after a fully auto-resolved normal turn", () => {
    const manager = new IdlePresenceManager({
      dispatch: vi.fn(),
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    simulateAutoResolvedTurn({
      manager,
      matchID: "match-1",
      playerID: "1",
      startTurn: 4
    });

    const snapshot = manager.getSnapshot("match-1");
    expect(snapshot.activeIdlePlayerId).toBe(null);
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "connected",
      idleStrikeCount: 1
    });
    expect(snapshot.events).toEqual([]);
  });

  it("does not count setup or placement auto-moves as idle strikes", () => {
    const manager = new IdlePresenceManager({
      dispatch: vi.fn(),
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    manager.onState(
      "match-2",
      createState({
        phase: "placement",
        currentPlayer: "1",
        activeStage: "settlement",
        turn: 1
      })
    );
    manager.onState(
      "match-2",
      createState({
        phase: "placement",
        currentPlayer: "0",
        activeStage: "road",
        turn: 2
      }),
      [moveEntry("autoPlaceSettlement", "1")]
    );

    const snapshot = manager.getSnapshot("match-2");
    expect(snapshot.activeIdlePlayerId).toBe(null);
    expect(snapshot.statusByPlayerId["1"]?.idleStrikeCount ?? 0).toBe(0);
  });

  it("resets idle strikes after a genuine human-authored move", () => {
    const manager = new IdlePresenceManager({
      dispatch: vi.fn(),
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    simulateAutoResolvedTurn({
      manager,
      matchID: "match-3",
      playerID: "1",
      startTurn: 4
    });

    manager.onState(
      "match-3",
      createState({
        currentPlayer: "1",
        turn: 6
      })
    );
    manager.onState(
      "match-3",
      createState({
        currentPlayer: "1",
        turn: 6
      }),
      [moveEntry("rollDice", "1")]
    );
    manager.onState(
      "match-3",
      createState({
        currentPlayer: "0",
        turn: 7
      }),
      [moveEntry("endTurn", "1")]
    );

    const snapshot = manager.getSnapshot("match-3");
    expect(snapshot.activeIdlePlayerId).toBe(null);
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "connected",
      idleStrikeCount: 0
    });
  });

  it("starts idle grace after two consecutive fully auto-resolved normal turns", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00Z"));

    const manager = new IdlePresenceManager({
      dispatch: vi.fn(),
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    simulateAutoResolvedTurn({
      manager,
      matchID: "match-4",
      playerID: "1",
      startTurn: 4,
      gameLogSeq: 9
    });
    simulateAutoResolvedTurn({
      manager,
      matchID: "match-4",
      playerID: "1",
      startTurn: 6,
      gameLogSeq: 9
    });

    const snapshot = manager.getSnapshot("match-4");
    expect(snapshot.activeIdlePlayerId).toBe("1");
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "idle",
      idleStrikeCount: 2
    });
    expect(snapshot.events.at(-1)).toMatchObject({
      type: "server:idle",
      playerId: "1",
      afterGameLogSeq: 9
    });

    vi.useRealTimers();
  });

  it("acknowledges idle grace by clearing the active window and strikes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00Z"));

    const manager = new IdlePresenceManager({
      dispatch: vi.fn(),
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    simulateAutoResolvedTurn({
      manager,
      matchID: "match-5",
      playerID: "1",
      startTurn: 4
    });
    simulateAutoResolvedTurn({
      manager,
      matchID: "match-5",
      playerID: "1",
      startTurn: 6
    });

    expect(manager.acknowledge("match-5", "1")).toBe(true);

    const snapshot = manager.getSnapshot("match-5");
    expect(snapshot.activeIdlePlayerId).toBe(null);
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "connected",
      idleStrikeCount: 0
    });
    expect(snapshot.events.at(-1)).toMatchObject({
      type: "server:idleAck",
      playerId: "1"
    });

    vi.useRealTimers();
  });

  it("dispatches an AFK forfeit when the idle grace window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00Z"));

    const dispatch = vi.fn();
    const manager = new IdlePresenceManager({
      dispatch,
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    simulateAutoResolvedTurn({
      manager,
      matchID: "match-6",
      playerID: "1",
      startTurn: 4,
      gameLogSeq: 11
    });
    simulateAutoResolvedTurn({
      manager,
      matchID: "match-6",
      playerID: "1",
      startTurn: 6,
      gameLogSeq: 11
    });

    vi.advanceTimersByTime(59_999);
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-6",
      move: "resolveIdleForfeit",
      playerID: "1"
    });

    const snapshot = manager.getSnapshot("match-6");
    expect(snapshot.events.at(-1)).toMatchObject({
      type: "server:idleForfeit",
      playerId: "1",
      afterGameLogSeq: 11
    });

    vi.useRealTimers();
  });

  it("deleteMatch clears pending idle forfeit timers and record state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00Z"));

    const dispatch = vi.fn();
    const manager = new IdlePresenceManager({
      dispatch,
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    simulateAutoResolvedTurn({
      manager,
      matchID: "match-delete",
      playerID: "1",
      startTurn: 4
    });
    simulateAutoResolvedTurn({
      manager,
      matchID: "match-delete",
      playerID: "1",
      startTurn: 6
    });

    manager.deleteMatch("match-delete");
    vi.advanceTimersByTime(60_000);

    expect(dispatch).not.toHaveBeenCalled();
    expect(manager.matches.has("match-delete")).toBe(false);

    vi.useRealTimers();
  });

  it("clears active idle state when the player later disconnects for real", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00Z"));

    const manager = new IdlePresenceManager({
      dispatch: vi.fn(),
      idleStrikeThreshold: 2,
      idleTimeoutMs: 60_000
    });

    manager.onMatchData("match-7", createMatchData());
    simulateAutoResolvedTurn({
      manager,
      matchID: "match-7",
      playerID: "1",
      startTurn: 4
    });
    simulateAutoResolvedTurn({
      manager,
      matchID: "match-7",
      playerID: "1",
      startTurn: 6
    });

    manager.onMatchData("match-7", createMatchData({ connected1: false }));

    const snapshot = manager.getSnapshot("match-7");
    expect(snapshot.activeIdlePlayerId).toBe(null);
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "connected",
      idleStrikeCount: 0
    });

    vi.useRealTimers();
  });
});
