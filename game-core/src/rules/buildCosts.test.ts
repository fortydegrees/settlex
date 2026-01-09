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
import {
  applyBuildRoad,
  applyBuildSettlement,
  applyBuildCity,
  canBuildRoad,
  canBuildSettlement,
  canBuildCity
} from "./buildActions";

const tiles = [
  {
    coordinate: [0, 0, 0] as [number, number, number],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: { EAST: [1, 2] as [number, number] }
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

import { applyPlaceSettlement, applyPlaceRoad } from "./apply";

it("applyPlaceSettlement fails when no settlements remain", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].settlementsRemaining = 0;
  const result = applyPlaceSettlement(state, board, 1, "0", { initialPlacement: true });
  expect(result.ok).toBe(false);
});

it("applyPlaceRoad fails when no roads remain", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].roadsRemaining = 0;
  const node = 1;
  state.pendingRoadFromNodeIdByPlayer["0"] = node;
  const edgeId = "1,2";
  const result = applyPlaceRoad(state, board, edgeId, "0", { initialPlacement: true });
  expect(result.ok).toBe(false);
});

describe("canBuild* functions", () => {
  describe("canBuildRoad", () => {
    it("returns ok when player has resources and pieces", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.BRICK];
      expect(canBuildRoad(state, "0")).toEqual({ ok: true });
    });

    it("returns error when player lacks resources", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [ResourceType.WOOD]; // missing brick
      expect(canBuildRoad(state, "0")).toEqual({ ok: false, error: "insufficient-resources" });
    });

    it("returns error when player has no roads left", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.BRICK];
      state.playerStateById["0"].roadsRemaining = 0;
      expect(canBuildRoad(state, "0")).toEqual({ ok: false, error: "no-pieces-left" });
    });

    it("returns error for unknown player", () => {
      const state = createEmptyState(["0"]);
      expect(canBuildRoad(state, "unknown")).toEqual({ ok: false, error: "unknown-player" });
    });
  });

  describe("canBuildSettlement", () => {
    it("returns ok when player has resources and pieces", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [
        ResourceType.WOOD,
        ResourceType.BRICK,
        ResourceType.SHEEP,
        ResourceType.WHEAT
      ];
      expect(canBuildSettlement(state, "0")).toEqual({ ok: true });
    });

    it("returns error when player lacks resources", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.BRICK];
      expect(canBuildSettlement(state, "0")).toEqual({ ok: false, error: "insufficient-resources" });
    });

    it("returns error when player has no settlements left", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [
        ResourceType.WOOD,
        ResourceType.BRICK,
        ResourceType.SHEEP,
        ResourceType.WHEAT
      ];
      state.playerStateById["0"].settlementsRemaining = 0;
      expect(canBuildSettlement(state, "0")).toEqual({ ok: false, error: "no-pieces-left" });
    });
  });

  describe("canBuildCity", () => {
    it("returns ok when player has resources and pieces", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE
      ];
      expect(canBuildCity(state, "0")).toEqual({ ok: true });
    });

    it("returns error when player lacks resources", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [ResourceType.WHEAT, ResourceType.ORE];
      expect(canBuildCity(state, "0")).toEqual({ ok: false, error: "insufficient-resources" });
    });

    it("returns error when player has no cities left", () => {
      const state = createEmptyState(["0"]);
      state.playerStateById["0"].resources = [
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE
      ];
      state.playerStateById["0"].citiesRemaining = 0;
      expect(canBuildCity(state, "0")).toEqual({ ok: false, error: "no-pieces-left" });
    });
  });
});
