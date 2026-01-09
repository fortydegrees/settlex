import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { buildTopology } from "../core/topology";
import { ResourceType, TileTypes } from "../types";
import { applyMaritimeTrade, canUsePort } from "./trading";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.PORT,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: {}
    }
  }
];

const board = buildTopology(tiles);

describe("trading", () => {
  it("detects port eligibility from player buildings", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

    expect(canUsePort(state, board, "0", ResourceType.WOOD)).toBe(true);
  });

  it("applies 2:1 trade when specific port owned", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    state.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.WOOD
    ];

    const result = applyMaritimeTrade(state, board, "0", {
      give: ResourceType.WOOD,
      receive: ResourceType.BRICK
    });

    expect(result.ok).toBe(true);
    expect(state.playerStateById["0"].resources).toEqual([ResourceType.BRICK]);
  });
});
