import { describe, it, expect } from "vitest";
import { createRuleset, STANDARD_RULESET, DUEL_RULESET } from "./ruleset";

describe("ruleset factory", () => {
  it("creates a deep copy of the standard ruleset", () => {
    const ruleset = createRuleset(STANDARD_RULESET);
    ruleset.bank.resourceCounts.Wood = 0;
    expect(STANDARD_RULESET.bank.resourceCounts.Wood).toBe(19);
  });

  it("creates a duel ruleset with expected defaults", () => {
    const duel = createRuleset(DUEL_RULESET);
    expect(duel.victoryPointsToWin).toBe(15);
    expect(duel.discardLimit).toBe(9);
    expect(duel.friendlyRobber.enabled).toBe(true);
    expect(duel.allowPlayerTrades).toBe(false);
  });
});
