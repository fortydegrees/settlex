import { describe, it, expect } from "vitest";
import { TileTypes, ResourceType } from "../types";
import { buildTopology } from "../core/topology";
import { createEmptyState } from "../core/state";
import { playersNeedingDiscard, applyDiscard } from "./turnFlow";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: {}
    }
  }
];

const board = buildTopology(tiles);

describe("turnFlow - discard", () => {
  it("flags players over discard limit", () => {
    const state = createEmptyState(["0", "1"]);
    state.ruleset.discardLimit = 7;
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);
    state.playerStateById["1"].resources = Array(7).fill(ResourceType.WOOD);

    expect(playersNeedingDiscard(state)).toEqual(["0"]);
  });

  it("applyDiscard removes cards and advances phase when all done", () => {
    const state = createEmptyState(["0", "1"]);
    state.ruleset.discardLimit = 7;
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0"];
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);

    const result = applyDiscard(state, "0", Array(4).fill(ResourceType.WOOD));

    expect(result.ok).toBe(true);
    expect(state.playerStateById["0"].resources).toHaveLength(4);
    expect(state.turn.pendingDiscards).toEqual([]);
    expect(state.turn.phase).toBe("robberMove");
  });
});
