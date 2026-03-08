import { describe, it, expect } from "vitest";
import { generateBoard } from "../board/generateBoard";
import { makeDeterministicRng } from "../testUtils";
import { BoardTopology, buildTopology } from "../core/topology";
import { createEmptyState } from "../core/state";
import { buildableNodes, buildableEdges } from "./buildability";
import { applyPlaceSettlement, applyPlaceRoad } from "./apply";
import { resolveBoardConfig } from "../board/boardConfigs";

const randomConfig = resolveBoardConfig("standard-random");

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

describe("buildability - initial placement", () => {
  it("returns all land nodes when no buildings exist", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(1));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const nodes = buildableNodes(state, board, "0", { initialPlacement: true });

    expect(nodes.slice().sort((a, b) => a - b)).toEqual(
      board.landNodeIds.slice().sort((a, b) => a - b)
    );
  });

  it("excludes nodes adjacent to an existing settlement", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(2));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const occupied = board.landNodeIds[0];
    state.buildingsByNodeId[occupied] = { ownerId: "0", type: "settlement" };

    const nodes = buildableNodes(state, board, "0", { initialPlacement: true });
    const neighbors = board.nodeNeighbors[occupied] ?? [];

    expect(nodes).not.toContain(occupied);
    for (const n of neighbors) {
      expect(nodes).not.toContain(n);
    }
  });

  it("returns unoccupied edges adjacent to a specific node in setup", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(4));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const node = board.landNodeIds[0];
    const edges = buildableEdges(state, board, "0", {
      initialPlacement: true,
      fromNodeId: node
    });

    const expected = board.nodeEdges[node];
    expect(edges.slice().sort()).toEqual(expected.slice().sort());
  });
});

describe("buildability - normal play", () => {
  it("requires road connectivity in normal play", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(3));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";

    const [edgeId] = board.edgeIds;
    state.roadsByEdgeId[edgeId] = "0";

    const nodes = buildableNodes(state, board, "0", { initialPlacement: false });
    const [a, b] = board.edgeNodes[edgeId];

    expect(nodes).toContain(a);
    expect(nodes).toContain(b);
  });

  it("returns unoccupied edges adjacent to player roads/buildings in normal play", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(5));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const [edgeId] = board.edgeIds;
    state.roadsByEdgeId[edgeId] = "0";

    const edges = buildableEdges(state, board, "0", {
      initialPlacement: false
    });

    const [a, b] = board.edgeNodes[edgeId];
    const expected = new Set([
      ...(board.nodeEdges[a] ?? []),
      ...(board.nodeEdges[b] ?? [])
    ]);
    expected.delete(edgeId);
    for (const e of expected) {
      expect(edges).toContain(e);
    }
  });

  it("does not allow extending a road through an opponent settlement", () => {
    const board = makeBoard([
      [1, 2],
      [2, 3],
      [1, 4]
    ]);
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.roadsByEdgeId["1,2"] = "0";
    state.buildingsByNodeId[2] = { ownerId: "1", type: "settlement" };

    const edges = buildableEdges(state, board, "0", { initialPlacement: false });

    expect(edges).toContain("1,4");
    expect(edges).not.toContain("2,3");
  });
});

describe("apply placement", () => {
  it("applyPlaceSettlement adds building and updates caches", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(6));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const node = board.landNodeIds[0];
    const result = applyPlaceSettlement(state, board, node, "0", { initialPlacement: true });

    expect(result.ok).toBe(true);
    expect(result.state.buildingsByNodeId[node]).toBeTruthy();
    expect(result.state.pendingRoadFromNodeIdByPlayer["0"]).toBe(node);
    expect(result.state.caches.buildableNodeIdsByPlayer["0"].length).toBeGreaterThan(0);
  });

  it("applyPlaceRoad adds road and clears pending placement", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(7));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const node = board.landNodeIds[0];
    const edge = board.nodeEdges[node][0];
    state.pendingRoadFromNodeIdByPlayer["0"] = node;

    const result = applyPlaceRoad(state, board, edge, "0", { initialPlacement: true });

    expect(result.ok).toBe(true);
    expect(result.state.roadsByEdgeId[edge]).toBe("0");
    expect(result.state.pendingRoadFromNodeIdByPlayer["0"]).toBe(null);
  });
});
