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

  it("auto-starts preGame after timeout", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState("match-1", {
      G: { core: {} },
      ctx: {
        phase: "preGame",
        currentPlayer: "0",
        activePlayers: { all: "waiting" },
        turn: 1
      }
    });

    vi.advanceTimersByTime(15000);

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoStartGame",
      playerID: "0"
    });
  });

  it("auto-discards for all pending players even if current player is not active", async () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState("match-1", {
      G: {
        core: {
          turn: {
            phase: "robberDiscard",
            pendingDiscards: ["1", "2"]
          }
        }
      },
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "1": "robberDiscard", "2": "robberDiscard" },
        turn: 1
      }
    });

    vi.advanceTimersByTime(20000);
    await vi.runAllTicks();

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoDiscard",
      playerID: "1"
    });
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoDiscard",
      playerID: "2"
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

    manager.onState("match-1", {
      G: {
        core: {
          turn: {
            phase: "robberDiscard",
            pendingDiscards: ["0"]
          }
        }
      },
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "robberDiscard" },
        turn: 1
      }
    });

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

  it("starts postRoll turn timer immediately after a roll", () => {
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
      }),
      [{ action: { type: "MAKE_MOVE", payload: { type: "rollDice" } } }]
    );

    vi.advanceTimersByTime(45000 - 1);
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoEndTurn",
      playerID: "0"
    });
  });

  it("starts moveRobber stage timer immediately after a roll", () => {
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
      }),
      [{ action: { type: "MAKE_MOVE", payload: { type: "autoRoll" } } }]
    );

    vi.advanceTimersByTime(20000 - 1);
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoMoveRobber",
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

  it("adds bonus time during same-stage postRoll updates", () => {
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

    manager.onState("match-1", state);

    vi.advanceTimersByTime(5000);

    expect(manager.getTimerSnapshot("match-1")?.remainingMs).toBe(40000);

    manager.onState("match-1", state, [
      { action: { type: "MAKE_MOVE", payload: { type: "maritimeTrade" } } }
    ]);

    expect(manager.getTimerSnapshot("match-1")?.remainingMs).toBe(50000);
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

  it("clears armed stage timers once the match is over even if stage and turn are unchanged", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    const liveState = baseState({
      G: {
        core: {
          gameOver: null
        }
      },
      ctx: {
        phase: "placement",
        currentPlayer: "0",
        activePlayers: { "0": "road" },
        turn: 1
      }
    });

    manager.onState("match-1", liveState);
    manager.onState("match-1", {
      ...liveState,
      G: {
        core: {
          gameOver: { winnerId: "1", reason: "victoryPoints" }
        }
      },
      ctx: {
        ...liveState.ctx,
        gameover: { winner: "1" }
      }
    });

    vi.advanceTimersByTime(10000);

    expect(dispatch).not.toHaveBeenCalled();
    expect(manager.getTimerSnapshot("match-1")).toBe(null);
  });

  it("schedules a fast autoBot action for bot-controlled turns", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({
      dispatch,
      botMoveDelayMs: 250,
      isBotPlayer: ({ playerID }) => playerID === "1"
    });

    manager.onState(
      "match-bot",
      baseState({
        _stateID: 7,
        ctx: {
          phase: "main",
          currentPlayer: "1",
          activePlayers: { "1": "postRoll" },
          turn: 3
        }
      })
    );

    vi.advanceTimersByTime(249);
    expect(dispatch).not.toHaveBeenCalledWith({
      matchID: "match-bot",
      move: "autoBot",
      playerID: "1"
    });

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-bot",
      move: "autoBot",
      playerID: "1"
    });
  });

  it("re-schedules autoBot when state id changes in same stage and turn", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({
      dispatch,
      botMoveDelayMs: 250,
      isBotPlayer: ({ playerID }) => playerID === "1"
    });

    manager.onState(
      "match-bot",
      baseState({
        _stateID: 10,
        ctx: {
          phase: "main",
          currentPlayer: "1",
          activePlayers: { "1": "postRoll" },
          turn: 4
        }
      })
    );
    vi.advanceTimersByTime(250);

    manager.onState(
      "match-bot",
      baseState({
        _stateID: 11,
        ctx: {
          phase: "main",
          currentPlayer: "1",
          activePlayers: { "1": "postRoll" },
          turn: 4
        }
      })
    );
    vi.advanceTimersByTime(250);

    const botCalls = dispatch.mock.calls.filter(
      ([payload]) =>
        payload?.matchID === "match-bot" &&
        payload?.move === "autoBot" &&
        payload?.playerID === "1"
    );
    expect(botCalls).toHaveLength(2);
  });

  it("cancels pending autoBot dispatches once the match is over", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({
      dispatch,
      botMoveDelayMs: 250,
      isBotPlayer: ({ playerID }) => playerID === "1"
    });

    const liveState = baseState({
      _stateID: 7,
      G: {
        core: {
          gameOver: null
        }
      },
      ctx: {
        phase: "main",
        currentPlayer: "1",
        activePlayers: { "1": "postRoll" },
        turn: 3
      }
    });

    manager.onState("match-bot", liveState);
    manager.onState("match-bot", {
      ...liveState,
      G: {
        core: {
          gameOver: { winnerId: "1", reason: "victoryPoints" }
        }
      },
      ctx: {
        ...liveState.ctx,
        gameover: { winner: "1" }
      }
    });

    vi.advanceTimersByTime(250);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("auto-dispatches pregame autoBot for bot seats even when current player is human", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({
      dispatch,
      botMoveDelayMs: 250,
      isBotPlayer: ({ playerID }) => playerID === "1"
    });

    manager.onState(
      "match-bot",
      baseState({
        _stateID: 12,
        G: {
          core: {
            players: ["0", "1"]
          },
          preGame: {
            readyByPlayerId: {}
          }
        },
        ctx: {
          phase: "preGame",
          currentPlayer: "0",
          activePlayers: { all: "waiting" },
          turn: 1
        }
      })
    );

    vi.advanceTimersByTime(249);
    expect(dispatch).not.toHaveBeenCalledWith({
      matchID: "match-bot",
      move: "autoBot",
      playerID: "1"
    });

    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-bot",
      move: "autoBot",
      playerID: "1"
    });
  });

});
