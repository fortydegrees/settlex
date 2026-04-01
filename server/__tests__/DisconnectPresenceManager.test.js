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

  it("ignores disconnect transitions after the match is already over", () => {
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
    expect(snapshot.events).toEqual([]);
    expect(dispatch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
