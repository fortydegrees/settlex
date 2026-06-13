import { describe, expect, it, vi } from "vitest";
import { DisconnectPresenceManager } from "../presence/DisconnectPresenceManager";

const createLiveState = (overrides = {}) => ({
  G: {
    core: {
      players: ["0", "1"],
      gameOver: null
    },
    gameLogSeq: 3,
    ...(overrides.G ?? {})
  },
  ctx: {
    phase: "main",
    currentPlayer: "0",
    activePlayers: { "0": "postRoll" },
    turn: 4,
    gameover: undefined,
    ...(overrides.ctx ?? {})
  },
  ...overrides
});

const createMatchData = ({ connected0 = true, connected1 = true } = {}) => [
  { id: "0", name: "Alice", isConnected: connected0 },
  { id: "1", name: "Bren", isConnected: connected1 }
];

describe("DisconnectPresenceManager", () => {
  it("starts a reconnect window and clears it on reconnect", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T10:00:00Z"));

    const dispatch = vi.fn();
    const manager = new DisconnectPresenceManager({
      dispatch,
      disconnectTimeoutMs: 60_000
    });

    manager.onState("match-1", createLiveState());
    manager.onMatchData("match-1", createMatchData());
    manager.onMatchData("match-1", createMatchData({ connected1: false }));

    let snapshot = manager.getSnapshot("match-1");
    expect(snapshot.activeDisconnectPlayerId).toBe("1");
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "disconnected"
    });
    expect(snapshot.events.at(-1)).toMatchObject({
      type: "server:disconnect",
      playerId: "1",
      afterGameLogSeq: 3
    });

    vi.advanceTimersByTime(20_000);
    manager.onMatchData("match-1", createMatchData());

    snapshot = manager.getSnapshot("match-1");
    expect(snapshot.activeDisconnectPlayerId).toBe(null);
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "connected"
    });
    expect(snapshot.events.at(-1)).toMatchObject({
      type: "server:reconnect",
      playerId: "1"
    });
    expect(dispatch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("dispatches a disconnect forfeit after the reconnect window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T10:00:00Z"));

    const dispatch = vi.fn();
    const manager = new DisconnectPresenceManager({
      dispatch,
      disconnectTimeoutMs: 60_000
    });

    manager.onState("match-2", createLiveState({ G: { gameLogSeq: 7 } }));
    manager.onMatchData("match-2", createMatchData());
    manager.onMatchData("match-2", createMatchData({ connected1: false }));

    vi.advanceTimersByTime(59_999);
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-2",
      move: "resolveDisconnectForfeit",
      playerID: "1"
    });

    const snapshot = manager.getSnapshot("match-2");
    expect(snapshot.events.at(-1)).toMatchObject({
      type: "server:disconnectForfeit",
      playerId: "1",
      afterGameLogSeq: 7
    });

    vi.useRealTimers();
  });

  it("deleteMatch clears pending disconnect timers and record state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T10:00:00Z"));

    const dispatch = vi.fn();
    const manager = new DisconnectPresenceManager({
      dispatch,
      disconnectTimeoutMs: 60_000
    });

    manager.onState("match-delete", createLiveState());
    manager.onMatchData("match-delete", createMatchData());
    manager.onMatchData("match-delete", createMatchData({ connected1: false }));

    manager.deleteMatch("match-delete");
    vi.advanceTimersByTime(60_000);

    expect(dispatch).not.toHaveBeenCalled();
    expect(manager.matches.has("match-delete")).toBe(false);

    vi.useRealTimers();
  });

  it("keeps another seat's reconnect window active when a different player refreshes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T10:00:00Z"));

    const dispatch = vi.fn();
    const manager = new DisconnectPresenceManager({
      dispatch,
      disconnectTimeoutMs: 60_000
    });

    manager.onState("match-4", createLiveState());
    manager.onMatchData("match-4", createMatchData());
    manager.onMatchData("match-4", createMatchData({ connected1: false }));

    vi.advanceTimersByTime(5_000);
    manager.onMatchData("match-4", createMatchData({ connected0: false, connected1: false }));
    manager.onMatchData("match-4", createMatchData({ connected0: true, connected1: false }));

    const snapshot = manager.getSnapshot("match-4");
    expect(snapshot.statusByPlayerId["0"]).toMatchObject({
      status: "connected"
    });
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "disconnected"
    });
    expect(snapshot.activeDisconnectPlayerId).toBe("1");

    vi.advanceTimersByTime(54_999);
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-4",
      move: "resolveDisconnectForfeit",
      playerID: "1"
    });

    vi.useRealTimers();
  });

  it("does not start a reconnect window after the match is already over", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T10:00:00Z"));

    const dispatch = vi.fn();
    const manager = new DisconnectPresenceManager({
      dispatch,
      disconnectTimeoutMs: 60_000
    });

    manager.onState(
      "match-3",
      createLiveState({
        G: {
          core: {
            players: ["0", "1"],
            gameOver: { winnerId: "0", reason: "Victory Points" }
          },
          gameLogSeq: 9
        },
        ctx: {
          gameover: { winnerId: "0", reason: "Victory Points" }
        }
      })
    );
    manager.onMatchData("match-3", createMatchData());
    manager.onMatchData("match-3", createMatchData({ connected1: false }));

    const snapshot = manager.getSnapshot("match-3");
    expect(snapshot.activeDisconnectPlayerId).toBe(null);
    expect(snapshot.events).toEqual([
      expect.objectContaining({
        type: "server:leave",
        playerId: "1",
        afterGameLogSeq: 9
      })
    ]);
    expect(dispatch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("logs leave and rejoin events after game over without starting a reconnect window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T10:00:00Z"));

    const dispatch = vi.fn();
    const manager = new DisconnectPresenceManager({
      dispatch,
      disconnectTimeoutMs: 60_000
    });

    manager.onState(
      "match-5",
      createLiveState({
        G: {
          core: {
            players: ["0", "1"],
            gameOver: { winnerId: "0", reason: "Victory Points" }
          },
          gameLogSeq: 11
        },
        ctx: {
          gameover: { winnerId: "0", reason: "Victory Points" }
        }
      })
    );
    manager.onMatchData("match-5", createMatchData());
    manager.onMatchData("match-5", createMatchData({ connected1: false }));
    manager.onMatchData("match-5", createMatchData({ connected1: true }));

    const snapshot = manager.getSnapshot("match-5");
    expect(snapshot.activeDisconnectPlayerId).toBe(null);
    expect(snapshot.deadlineAtMs).toBe(null);
    expect(snapshot.statusByPlayerId["1"]).toMatchObject({
      status: "connected"
    });
    expect(snapshot.events.slice(-2)).toEqual([
      expect.objectContaining({
        type: "server:leave",
        playerId: "1",
        afterGameLogSeq: 11
      }),
      expect.objectContaining({
        type: "server:return",
        playerId: "1",
        afterGameLogSeq: 11
      })
    ]);
    expect(dispatch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
