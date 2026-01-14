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
});
