import { describe, expect, it } from "vitest";
import { Catan } from "../Game";

describe("Catan setup", () => {
  it("initializes gameLog and gameLogSeq", () => {
    const G = Catan.setup({
      ctx: { numPlayers: 2, phase: "placement" },
      random: { Number: () => 0.5, Shuffle: (items) => items }
    });
    expect(G.gameLog).toEqual([]);
    expect(G.gameLogSeq).toBe(0);
  });
});
