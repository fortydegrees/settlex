import { describe, expect, it, vi } from "vitest";
import { buildTopology, createEmptyState, TileTypes } from "@settlex/game-core";
import { moveRobber, rollDice } from "../Moves";

describe("Moves robber flow", () => {
  it("rollDice sends players to moveRobber when a 7 is rolled", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    const coreTopology = buildTopology([]);
    const events = { setStage: vi.fn() };
    const effects = { roll: vi.fn() };
    const random = { D6: vi.fn(() => [3, 4]) };
    const context = {
      G: { core: state, coreTopology },
      random,
      events,
      effects
    };

    rollDice.move(context);

    expect(events.setStage).toHaveBeenCalledWith("moveRobber");
  });

  it("moveRobber advances the core turn phase to postRoll", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.turn.phase = "robberMove";
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", nodes: {} }
      }
    ];
    const coreTopology = buildTopology(tiles);
    const events = { setStage: vi.fn() };
    const context = {
      G: { core: state, coreTopology },
      ctx: { currentPlayer: "0", activePlayers: { "0": { returnTo: "postRoll" } } },
      events
    };

    moveRobber.move(context, 1);

    expect(state.turn.phase).toBe("postRoll");
    expect(events.setStage).toHaveBeenCalledWith("postRoll");
  });
});
