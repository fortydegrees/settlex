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
});
