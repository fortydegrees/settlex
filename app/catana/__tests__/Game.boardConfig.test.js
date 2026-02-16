import { describe, expect, it } from "vitest";
import { Catan } from "../Game";

describe("Catan setup board config", () => {
  it("uses boardConfigId from setupData", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const random = {
      Number: () => 0.5,
      Shuffle: (items) => items
    };
    const setupData = { boardConfigId: "standard-random" };

    const G = Catan.setup({ ctx, random }, setupData);

    expect(G.boardConfigId).toBe("standard-random");
  });

  it("defaults 2-player setup to duel ruleset", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const random = {
      Number: () => 0.5,
      Shuffle: (items) => items
    };

    const G = Catan.setup({ ctx, random }, {});

    expect(G.core.ruleset.victoryPointsToWin).toBe(15);
    expect(G.core.ruleset.discardLimit).toBe(9);
  });

  it("keeps standard ruleset defaults for 3+ players", () => {
    const ctx = { numPlayers: 3, phase: "placement" };
    const random = {
      Number: () => 0.5,
      Shuffle: (items) => items
    };

    const G = Catan.setup({ ctx, random }, {});

    expect(G.core.ruleset.victoryPointsToWin).toBe(10);
    expect(G.core.ruleset.discardLimit).toBe(7);
  });
});
