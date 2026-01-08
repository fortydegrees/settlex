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

import { applyResourceDistribution } from "./turnFlow";

it("distributes resources for matching roll when bank has enough", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD, ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD]);
  expect(state.bank.resources).toHaveLength(1);
});

it("gives none if bank lacks enough of a resource", () => {
  const state = createEmptyState(["0", "1"]);
  state.bank.resources = [ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "1", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([]);
  expect(state.playerStateById["1"].resources).toEqual([]);
  expect(state.bank.resources).toHaveLength(1);
});

import { canPlaceRobber, applyMoveRobber, getRobberVictims } from "./turnFlow";

it("blocks robber placement on tiles adjacent to players <= vp threshold", () => {
  const state = createEmptyState(["0"]);
  state.ruleset.friendlyRobber.enabled = true;
  state.ruleset.friendlyRobber.vpThreshold = 2;
  state.playerStateById["0"].victoryPoints = 2;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  expect(canPlaceRobber(state, board, 1)).toBe(false);
});

it("returns eligible victims on robber tile", () => {
  const state = createEmptyState(["0", "1"]);
  state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };

  const victims = getRobberVictims(state, board, 1, "0");
  expect(victims).toEqual(["1"]);
});

it("applyMoveRobber updates tile when legal", () => {
  const state = createEmptyState(["0", "1"]);
  const result = applyMoveRobber(state, board, 1, "0");
  expect(result.ok).toBe(true);
  expect(state.robberTileId).toBe(1);
});
