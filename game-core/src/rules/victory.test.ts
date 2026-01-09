import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { recomputeLargestArmy, recomputeLongestRoad } from "./victory";
import { BoardTopology } from "../core/topology";

function makeBoard(edges: Array<[number, number]>): BoardTopology {
  const edgeNodes: Record<string, [number, number]> = {};
  const nodeEdges: Record<number, string[]> = {};
  const nodeNeighbors: Record<number, number[]> = {};
  const nodeSet = new Set<number>();

  for (const [a, b] of edges) {
    const id = a < b ? `${a},${b}` : `${b},${a}`;
    edgeNodes[id] = [a, b];
    nodeSet.add(a);
    nodeSet.add(b);
    nodeEdges[a] = nodeEdges[a] ?? [];
    nodeEdges[b] = nodeEdges[b] ?? [];
    nodeEdges[a].push(id);
    nodeEdges[b].push(id);
    nodeNeighbors[a] = nodeNeighbors[a] ?? [];
    nodeNeighbors[b] = nodeNeighbors[b] ?? [];
    if (!nodeNeighbors[a].includes(b)) nodeNeighbors[a].push(b);
    if (!nodeNeighbors[b].includes(a)) nodeNeighbors[b].push(a);
  }

  return {
    tiles: [],
    nodeIds: Array.from(nodeSet),
    landNodeIds: Array.from(nodeSet),
    edgeIds: Object.keys(edgeNodes),
    edgeNodes,
    nodeEdges,
    nodeNeighbors,
    portsByNodeId: {}
  };
}

describe("largest army", () => {
  it("awards largest army at threshold", () => {
    const state = createEmptyState(["0", "1"]);
    state.playerStateById["0"].knightsPlayed = 3;

    recomputeLargestArmy(state);

    expect(state.awards.largestArmyOwnerId).toBe("0");
  });

  it("keeps current owner on tie", () => {
    const state = createEmptyState(["0", "1"]);
    state.awards.largestArmyOwnerId = "0";
    state.playerStateById["0"].knightsPlayed = 3;
    state.playerStateById["1"].knightsPlayed = 3;

    recomputeLargestArmy(state);

    expect(state.awards.largestArmyOwnerId).toBe("0");
  });
});

describe("longest road", () => {
  it("awards longest road at threshold", () => {
    const board = makeBoard([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6]
    ]);
    const state = createEmptyState(["0"]);
    state.roadsByEdgeId = {
      "1,2": "0",
      "2,3": "0",
      "3,4": "0",
      "4,5": "0",
      "5,6": "0"
    };

    recomputeLongestRoad(state, board);

    expect(state.awards.longestRoadOwnerId).toBe("0");
  });

  it("keeps current owner on tie", () => {
    const board = makeBoard([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [14, 15]
    ]);
    const state = createEmptyState(["0", "1"]);
    state.awards.longestRoadOwnerId = "0";
    state.roadsByEdgeId = {
      "1,2": "0",
      "2,3": "0",
      "3,4": "0",
      "4,5": "0",
      "5,6": "0",
      "10,11": "1",
      "11,12": "1",
      "12,13": "1",
      "13,14": "1",
      "14,15": "1"
    };

    recomputeLongestRoad(state, board);

    expect(state.awards.longestRoadOwnerId).toBe("0");
  });

  it("breaks road through opponent settlement", () => {
    const board = makeBoard([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5]
    ]);
    const state = createEmptyState(["0", "1"]);
    state.roadsByEdgeId = {
      "1,2": "0",
      "2,3": "0",
      "3,4": "0",
      "4,5": "0"
    };
    state.buildingsByNodeId[3] = { ownerId: "1", type: "settlement" };

    recomputeLongestRoad(state, board);

    expect(state.awards.longestRoadOwnerId).toBe(null);
  });
});
