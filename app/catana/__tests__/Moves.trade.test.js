import { describe, expect, it } from "vitest";
import {
  createEmptyState,
  buildTopology,
  ResourceType,
  TileTypes
} from "@settlex/game-core";
import { maritimeTrade } from "../Moves";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: { EAST: [1, 2] }
    }
  }
];

const coreTopology = buildTopology(tiles);

describe("maritimeTrade move", () => {
  it("accepts a mixed give selection and logs aggregated counts", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.bank = 4;
    state.playerStateById["0"].resources = [
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT
    ];
    const context = {
      G: {
        core: state,
        coreTopology,
        gameLog: [],
        gameLogSeq: 0
      },
      playerID: "0",
      ctx: { currentPlayer: "0", turn: 4, phase: "main" }
    };

    maritimeTrade.move(context, {
      give: [
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT
      ],
      receive: [
        ResourceType.BRICK,
        ResourceType.WOOD,
        ResourceType.SHEEP
      ]
    });

    expect(state.playerStateById["0"].resources).toEqual([
      ResourceType.BRICK,
      ResourceType.WOOD,
      ResourceType.SHEEP
    ]);
    expect(context.G.gameLog).toContainEqual(
      expect.objectContaining({
        type: "trade:maritime",
        actorId: "0",
        data: {
          give: {
            [ResourceType.ORE]: 8,
            [ResourceType.WHEAT]: 4
          },
          receive: {
            [ResourceType.BRICK]: 1,
            [ResourceType.WOOD]: 1,
            [ResourceType.SHEEP]: 1
          }
        }
      })
    );
  });
});
