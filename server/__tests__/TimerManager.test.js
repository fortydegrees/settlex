import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TimerManager } from "../timers/TimerManager";

const baseState = (overrides = {}) => ({
  G: { core: {} },
  ctx: {
    phase: "main",
    currentPlayer: "0",
    activePlayers: { "0": "preRoll" },
    turn: 1
  },
  ...overrides
});

describe("TimerManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules a stage timer and dispatches auto-roll on expiry", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState("match-1", baseState());

    vi.advanceTimersByTime(5000);

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoRoll",
      playerID: "0"
    });
  });

  it("auto-places settlement after placement stage timeout", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "placement",
          currentPlayer: "0",
          activePlayers: { "0": "settlement" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(60000);

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoPlaceSettlement",
      playerID: "0"
    });
  });

  it("auto-places road after placement stage timeout", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "placement",
          currentPlayer: "0",
          activePlayers: { "0": "road" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(10000);

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoPlaceRoad",
      playerID: "0"
    });
  });

  it("auto-moves robber after timeout", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "moveRobber" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(20000);

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoMoveRobber",
      playerID: "0"
    });
  });

  it("auto-places road during roadBuilding dev card play", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState("match-1", {
      G: { devCardPlay: { type: "roadBuilding", playerId: "0", pendingRoads: 1 } },
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "postRoll" },
        turn: 1
      }
    });

    vi.advanceTimersByTime(10000);

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoPlaceRoad",
      playerID: "0"
    });
  });

  it("pauses turn timer while stage timer runs, then resumes", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "postRoll" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(20000);

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "robberDiscard" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(20000);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoDiscard",
      playerID: "0"
    });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "postRoll" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(25000);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoEndTurn",
      playerID: "0"
    });
  });

  it("pauses turn timer while roadBuilding timeout runs", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "postRoll" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(20000);

    manager.onState("match-1", {
      G: { devCardPlay: { type: "roadBuilding", playerId: "0", pendingRoads: 1 } },
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "postRoll" },
        turn: 1
      }
    });

    vi.advanceTimersByTime(10000);

    expect(dispatch).not.toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoEndTurn",
      playerID: "0"
    });
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoPlaceRoad",
      playerID: "0"
    });
  });

  it("adds time for bonus actions up to cap", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });
    const state = baseState({
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "postRoll" },
        turn: 1
      }
    });

    manager.onState("match-1", state, [
      { action: { type: "MAKE_MOVE", payload: { type: "maritimeTrade" } } }
    ]);

    expect(manager.getTurnRemaining("match-1")).toBeGreaterThan(45000);
  });

  it("returns stage timer snapshot when stage timer is active", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "placement",
          currentPlayer: "0",
          activePlayers: { "0": "settlement" },
          turn: 1
        }
      })
    );

    const snapshot = manager.getTimerSnapshot("match-1");

    expect(snapshot?.kind).toBe("stage");
    expect(snapshot?.remainingMs).toBeGreaterThan(0);
  });

  it("returns turn timer snapshot when no stage timer is active", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState(
      "match-1",
      baseState({
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "postRoll" },
          turn: 1
        }
      })
    );

    const snapshot = manager.getTimerSnapshot("match-1");

    expect(snapshot?.kind).toBe("turn");
    expect(snapshot?.remainingMs).toBeGreaterThan(0);
  });

});
