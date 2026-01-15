import { describe, expect, it, vi } from "vitest";
import { buildTopology, createEmptyState, TileTypes } from "@settlex/game-core";
import { autoMoveRobber, moveRobber, rollDice } from "../Moves";

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
      events,
      random: { Number: () => 0 }
    };

    moveRobber.move(context, 1);

    expect(state.turn.phase).toBe("postRoll");
    expect(events.setStage).toHaveBeenCalledWith("postRoll");
  });

  it("autoMoveRobber skips illegal robber tiles", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.ruleset.friendlyRobber = { enabled: true, vpThreshold: 2 };
    state.robberTileId = 99;
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", nodes: { a: 10 } }
      },
      {
        coordinate: [1, 0, -1],
        type: TileTypes.LAND,
        tile: { id: 2, resource: "Brick", nodes: {} }
      }
    ];
    const coreTopology = buildTopology(tiles);
    state.buildingsByNodeId[10] = { ownerId: "0", type: "settlement" };

    const events = { setStage: vi.fn() };
    const context = {
      G: { core: state, coreTopology, tiles },
      ctx: { currentPlayer: "1", activePlayers: { "1": "moveRobber" } },
      random: { Number: () => 0, Shuffle: (arr) => arr },
      events,
      log: { setMetadata: vi.fn() }
    };

    autoMoveRobber.move(context);

    expect(state.robberTileId).toBe(2);
  });
});
