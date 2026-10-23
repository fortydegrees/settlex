import { describe, expect, it, vi } from "vitest";
import {
  buildTopology,
  createBalancedDiceState,
  createEmptyState,
  TileTypes
} from "@settlex/game-core";
import { rollDice } from "../moves/turnMoves";

const sequenceRng = (...values) => {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
};

describe("rollDice balanced dice policy", () => {
  it("draws from balanced dice state instead of random D6 when the ruleset asks for it", () => {
    const core = createEmptyState(["0", "1"]);
    core.phase = "normal";
    core.ruleset.diceMode = "balanced";
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", number: 2, nodes: {}, edges: {} }
      }
    ];
    const context = {
      G: {
        core,
        coreTopology: buildTopology(tiles),
        tiles,
        diceState: createBalancedDiceState(["0", "1"]),
        gameLog: [],
        gameLogSeq: 0
      },
      ctx: {
        currentPlayer: "0",
        playOrder: ["0", "1"],
        activePlayers: { "0": "preRoll" }
      },
      random: {
        Number: sequenceRng(0, 0),
        D6: vi.fn(() => [6, 6])
      },
      events: { setStage: vi.fn() },
      effects: { roll: vi.fn() }
    };

    rollDice.move(context);

    expect(context.random.D6).not.toHaveBeenCalled();
    expect(context.G.diceRoll).toEqual([1, 1]);
    expect(context.G.core.turn.lastRollTotal).toBe(2);
    expect(context.G.diceState.cardsLeft).toBe(35);
  });
});
