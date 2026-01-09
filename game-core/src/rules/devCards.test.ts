import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { ResourceType, TileTypes } from "../types";
import { buildTopology } from "../core/topology";
import {
  createStandardDevDeck,
  buyDevCard,
  canPlayDevCard,
  applyYearOfPlenty,
  applyMonopoly,
  applyKnight,
  applyRoadBuilding
} from "./devCards";

describe("dev cards - deck", () => {
  it("creates a 25-card deck with standard counts", () => {
    const deck = createStandardDevDeck();
    expect(deck).toHaveLength(25);
    expect(deck.filter((c) => c === "knight")).toHaveLength(14);
    expect(deck.filter((c) => c === "victoryPoint")).toHaveLength(5);
    expect(deck.filter((c) => c === "roadBuilding")).toHaveLength(2);
    expect(deck.filter((c) => c === "yearOfPlenty")).toHaveLength(2);
    expect(deck.filter((c) => c === "monopoly")).toHaveLength(2);
  });
});

describe("dev cards - purchase", () => {
  it("buys a card when resources are sufficient", () => {
    const state = createEmptyState(["0"]);
    state.devDeck = ["knight"];
    state.playerStateById["0"].resources = [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];

    const result = buyDevCard(state, "0");

    expect(result.ok).toBe(true);
    expect(state.devDeck).toHaveLength(0);
    expect(state.playerStateById["0"].devCards).toEqual(["knight"]);
  });
});
const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2, SOUTHEAST: 3 },
      edges: { EAST: [1, 2], WEST: [1, 3] }
    }
  }
];

const board = buildTopology(tiles);
const chainBoard = buildTopology([
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: {
      id: 2,
      resource: ResourceType.WOOD,
      number: 6,
      nodes: { NORTH: 1, SOUTH: 2, SOUTHEAST: 3 },
      edges: { EAST: [1, 2], SOUTH: [2, 3] }
    }
  }
]);

it("prevents playing more than one dev card per turn", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["knight"];
  state.playerStateById["0"].devCardsPlayedThisTurn = 1;

  expect(canPlayDevCard(state, "0", "knight")).toBe(false);
});

it("prevents playing a dev card bought this turn", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["knight"];
  state.playerStateById["0"].devCardsBoughtThisTurn = ["knight"];

  expect(canPlayDevCard(state, "0", "knight")).toBe(false);
});

it("year of plenty takes two resources if bank has them", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD, ResourceType.BRICK];
  const result = applyYearOfPlenty(state, "0", [ResourceType.WOOD, ResourceType.BRICK]);
  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD, ResourceType.BRICK]);
});

it("monopoly transfers resources from other players", () => {
  const state = createEmptyState(["0", "1"]);
  state.playerStateById["1"].resources = [ResourceType.WOOD, ResourceType.WOOD];
  const result = applyMonopoly(state, "0", ResourceType.WOOD);
  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD, ResourceType.WOOD]);
  expect(state.playerStateById["1"].resources).toEqual([]);
});

it("knight increments knightsPlayed", () => {
  const state = createEmptyState(["0"]);
  const result = applyKnight(state, "0");
  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].knightsPlayed).toBe(1);
});

it("road building rejects duplicate edges", () => {
  const state = createEmptyState(["0"]);
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  const result = applyRoadBuilding(state, board, "0", ["1,2", "1,2"]);
  expect(result.ok).toBe(false);
});

it("road building places two distinct roads when legal", () => {
  const state = createEmptyState(["0"]);
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  const result = applyRoadBuilding(state, board, "0", ["1,2", "1,3"]);
  expect(result.ok).toBe(true);
  expect(state.roadsByEdgeId["1,2"]).toBe("0");
  expect(state.roadsByEdgeId["1,3"]).toBe("0");
});

it("road building allows chaining the second road", () => {
  const state = createEmptyState(["0"]);
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  const result = applyRoadBuilding(state, chainBoard, "0", ["1,2", "2,3"]);
  expect(result.ok).toBe(true);
  expect(state.roadsByEdgeId["1,2"]).toBe("0");
  expect(state.roadsByEdgeId["2,3"]).toBe("0");
});

it("year of plenty fails when bank lacks a requested resource", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD];
  const result = applyYearOfPlenty(state, "0", [ResourceType.WOOD, ResourceType.BRICK]);
  expect(result.ok).toBe(false);
  expect(state.playerStateById["0"].resources).toEqual([]);
});
