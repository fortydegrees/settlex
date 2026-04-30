import { describe, expect, it } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import { Catan } from "../Game";

describe("phase log entries", () => {
  it("does not log placement phase start by default", () => {
    const G = Catan.setup({
      ctx: { numPlayers: 2, phase: "placement" },
      random: { Number: makeDeterministicRng(123), Shuffle: (items) => items }
    });
    expect(G.gameLog.some((entry) => entry.type === "phase:placement")).toBe(false);
  });
});
