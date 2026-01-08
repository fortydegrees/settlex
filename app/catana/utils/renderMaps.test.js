import { describe, it, expect } from "vitest";
import { buildRenderMaps } from "./renderMaps";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: "Land",
    tile: {
      id: 1,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: { EAST: [1, 2] }
    }
  },
  {
    coordinate: [1, 0, -1],
    type: "Land",
    tile: {
      id: 2,
      nodes: { NORTH: 1, SOUTH: 3 },
      edges: { EAST: [1, 3] }
    }
  }
];

describe("buildRenderMaps", () => {
  it("dedupes shared node ids and keeps first render mapping", () => {
    const { nodeRenderById } = buildRenderMaps(tiles);
    expect(Object.keys(nodeRenderById)).toHaveLength(3);
    expect(nodeRenderById["1"]).toEqual({
      tile_coordinate: [0, 0, 0],
      direction: "NORTH",
      tileId: 1
    });
  });

  it("generates stable edge ids from node pairs", () => {
    const { edgeRenderById } = buildRenderMaps(tiles);
    expect(Object.keys(edgeRenderById)).toEqual(["1,2", "1,3"]);
    expect(edgeRenderById["1,2"]).toEqual({
      tile_coordinate: [0, 0, 0],
      direction: "EAST"
    });
  });
});
