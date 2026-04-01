import { describe, it, expect, vi } from "vitest";
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
