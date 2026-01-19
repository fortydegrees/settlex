import { describe, expect, it } from "vitest";
import { Catan } from "../Game";

const makeContext = () => {
  const G = Catan.setup({
    ctx: { numPlayers: 2, phase: "placement" },
    random: { Number: () => 0.5, Shuffle: (items) => items }
  });
  return {
    G,
    ctx: {
      phase: "placement",
      currentPlayer: "0",
      activePlayers: { "0": "settlement" },
      numPlayers: 2
    },
    playerID: "0"
  };
};

describe("phase log entries", () => {
  it("logs placement phase start", () => {
    const context = makeContext();
    Catan.phases.placement.turn.onBegin(context);
    expect(context.G.gameLog.some((entry) => entry.type === "phase:placement")).toBe(true);
  });
});
