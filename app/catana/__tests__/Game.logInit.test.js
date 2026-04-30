import { describe, expect, it } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import { Catan } from "../Game";

describe("Catan setup", () => {
  it("initializes gameLog and gameLogSeq", () => {
    const G = Catan.setup({
      ctx: { numPlayers: 2, phase: "placement" },
      random: { Number: makeDeterministicRng(123), Shuffle: (items) => items }
    });
    expect(G.gameLog).toEqual([]);
    expect(G.gameLogSeq).toBe(0);
  });
});
