import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";

describe("build costs - state init", () => {
  it("initializes piece counts from ruleset", () => {
    const state = createEmptyState(["0"]);
    expect(state.playerStateById["0"].roadsRemaining).toBeGreaterThan(0);
    expect(state.playerStateById["0"].settlementsRemaining).toBeGreaterThan(0);
    expect(state.playerStateById["0"].citiesRemaining).toBeGreaterThan(0);
  });
});

import { TileTypes, ResourceType } from "../types";
import { buildTopology } from "../core/topology";
import { applyBuildRoad, applyBuildSettlement, applyBuildCity } from "./buildActions";

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

const board = buildTopology(tiles);

it("applyBuildRoad spends resources and decrements pieces", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.BRICK];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyBuildRoad(state, board, "1,2", "0");

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([]);
  expect(state.playerStateById["0"].roadsRemaining).toBe(
    state.ruleset.pieceLimits.roads - 1
  );
});

it("applyBuildSettlement enforces cost and connectivity", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].resources = [
    ResourceType.WOOD,
    ResourceType.BRICK,
    ResourceType.SHEEP,
    ResourceType.WHEAT
  ];
  state.roadsByEdgeId["1,2"] = "0";

  const result = applyBuildSettlement(state, board, 1, "0");

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].settlementsRemaining).toBe(
    state.ruleset.pieceLimits.settlements - 1
  );
});

it("applyBuildCity upgrades settlement and adjusts pieces", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].resources = [
    ResourceType.WHEAT,
    ResourceType.WHEAT,
    ResourceType.ORE,
    ResourceType.ORE,
    ResourceType.ORE
  ];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyBuildCity(state, board, 1, "0");

  expect(result.ok).toBe(true);
  expect(state.buildingsByNodeId[1].type).toBe("city");
  expect(state.playerStateById["0"].citiesRemaining).toBe(
    state.ruleset.pieceLimits.cities - 1
  );
  expect(state.playerStateById["0"].settlementsRemaining).toBe(
    state.ruleset.pieceLimits.settlements + 1
  );
});
