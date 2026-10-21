import { describe, expect, it } from "vitest";
import {
  createBalancedDiceState,
  drawBalancedDice
} from "./balancedDice";

const sequenceRng = (...values: number[]) => {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
};

const clearDeck = (state: ReturnType<typeof createBalancedDiceState>) => {
  for (const entry of state.deck) {
    entry.dicePairs = [];
    entry.recentlyRolledCount = 0;
  }
};

describe("balanced dice", () => {
  it("draws exact dice pairs from a 36-card deck and tracks recent totals", () => {
    const state = createBalancedDiceState(["0", "1"]);

    const dice = drawBalancedDice(state, {
      playerId: "0",
      playerIds: ["0", "1"],
      rng: sequenceRng(0, 0)
    });

    expect(dice).toEqual([1, 1]);
    expect(state.cardsLeft).toBe(35);
    expect(state.recentTotals).toEqual([2]);
    expect(state.deck.find((entry) => entry.totalDice === 2)?.dicePairs).toHaveLength(0);
  });

  it("rehydrates a masked balanced state before drawing", () => {
    const state = { mode: "balanced" } as ReturnType<typeof createBalancedDiceState>;

    const dice = drawBalancedDice(state, {
      playerId: "0",
      playerIds: ["0", "1"],
      rng: sequenceRng(0, 0)
    });

    expect(dice).toEqual([1, 1]);
    expect(state.cardsLeft).toBe(35);
    expect(state.recentTotals).toEqual([2]);
    expect(state.sevensRolledByPlayer).toEqual({ "0": 0, "1": 0 });
    expect(state.sevenStreak).toEqual({ playerId: null, streakCount: 0 });
    expect(state.deck.find((entry) => entry.totalDice === 2)?.dicePairs).toHaveLength(0);
  });

  it("suppresses totals that exceed the recent-roll penalty", () => {
    const state = createBalancedDiceState(["0", "1"]);
    clearDeck(state);
    state.cardsLeft = 13;
    const six = state.deck.find((entry) => entry.totalDice === 6);
    const eight = state.deck.find((entry) => entry.totalDice === 8);
    six!.dicePairs = [[1, 5], [2, 4], [3, 3], [4, 2], [5, 1]];
    six!.recentlyRolledCount = 3;
    eight!.dicePairs = [[4, 4]];
    state.recentTotals = [6, 6, 6];

    const dice = drawBalancedDice(state, {
      playerId: "0",
      playerIds: ["0", "1"],
      rng: sequenceRng(0, 0)
    });

    expect(dice).toEqual([4, 4]);
  });

  it("suppresses 7s for the player already ahead on 7s", () => {
    const state = createBalancedDiceState(["0", "1"]);
    clearDeck(state);
    state.cardsLeft = 13;
    state.deck.find((entry) => entry.totalDice === 7)!.dicePairs = [[3, 4]];
    state.deck.find((entry) => entry.totalDice === 8)!.dicePairs = [[4, 4]];
    state.sevensRolledByPlayer = { "0": 2, "1": 0 };
    state.sevenStreak = { playerId: "0", streakCount: 2 };

    const dice = drawBalancedDice(state, {
      playerId: "0",
      playerIds: ["0", "1"],
      rng: sequenceRng(0, 0)
    });

    expect(dice).toEqual([4, 4]);
  });

  it("boosts 7s for the player behind on 7s", () => {
    const state = createBalancedDiceState(["0", "1"]);
    clearDeck(state);
    state.cardsLeft = 13;
    state.deck.find((entry) => entry.totalDice === 7)!.dicePairs = [[3, 4]];
    state.deck.find((entry) => entry.totalDice === 8)!.dicePairs = [[4, 4]];
    state.sevensRolledByPlayer = { "0": 2, "1": 0 };
    state.sevenStreak = { playerId: "0", streakCount: 2 };

    const dice = drawBalancedDice(state, {
      playerId: "1",
      playerIds: ["0", "1"],
      rng: sequenceRng(0, 0)
    });

    expect(dice).toEqual([3, 4]);
  });

  it("clamps early seven-streak boosts to the configured maximum", () => {
    const state = createBalancedDiceState(["0", "1", "2", "3"]);
    clearDeck(state);
    state.cardsLeft = 13;
    state.deck.find((entry) => entry.totalDice === 7)!.dicePairs = [[3, 4]];
    state.deck.find((entry) => entry.totalDice === 8)!.dicePairs = [[4, 4]];
    state.sevensRolledByPlayer = { "0": 3, "1": 0, "2": 0, "3": 0 };
    state.sevenStreak = { playerId: "0", streakCount: 3 };

    const dice = drawBalancedDice(state, {
      playerId: "1",
      playerIds: ["0", "1", "2", "3"],
      rng: sequenceRng(0.68, 0)
    });

    expect(dice).toEqual([4, 4]);
  });
});
