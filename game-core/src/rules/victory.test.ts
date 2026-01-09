import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { recomputeLargestArmy } from "./victory";

describe("largest army", () => {
  it("awards largest army at threshold", () => {
    const state = createEmptyState(["0", "1"]);
    state.playerStateById["0"].knightsPlayed = 3;

    recomputeLargestArmy(state);

    expect(state.awards.largestArmyOwnerId).toBe("0");
  });

  it("keeps current owner on tie", () => {
    const state = createEmptyState(["0", "1"]);
    state.awards.largestArmyOwnerId = "0";
    state.playerStateById["0"].knightsPlayed = 3;
    state.playerStateById["1"].knightsPlayed = 3;

    recomputeLargestArmy(state);

    expect(state.awards.largestArmyOwnerId).toBe("0");
  });
});
