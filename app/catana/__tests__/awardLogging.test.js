import { describe, expect, it, vi } from "vitest";
import { createEmptyState } from "@settlex/game-core";
import { logAwardChanges } from "../moves/awardLogging";

const makeRoadTopology = (edges) => {
  const edgeNodes = {};
  const nodeEdges = {};
  const nodeIds = [];
  const seenNodes = new Set();

  edges.forEach(([a, b]) => {
    const edgeId = a < b ? `${a},${b}` : `${b},${a}`;
    edgeNodes[edgeId] = [a, b];
    [a, b].forEach((nodeId) => {
      if (!seenNodes.has(nodeId)) {
        seenNodes.add(nodeId);
        nodeIds.push(nodeId);
      }
      nodeEdges[nodeId] = nodeEdges[nodeId] ?? [];
      nodeEdges[nodeId].push(edgeId);
    });
  });

  return {
    tiles: [],
    nodeIds,
    landNodeIds: nodeIds,
    edgeIds: Object.keys(edgeNodes),
    edgeNodes,
    nodeEdges,
    nodeNeighbors: {},
    portsByNodeId: {}
  };
};

describe("award logging", () => {
  it("logs longest road changes and emits the exact award path", () => {
    const core = createEmptyState(["0", "1"]);
    core.awards.longestRoadOwnerId = "0";
    core.roadsByEdgeId = {
      "1,2": "0",
      "2,3": "0",
      "3,4": "0",
      "4,5": "0",
      "5,6": "0",
      "3,30": "0"
    };
    const G = {
      core,
      coreTopology: makeRoadTopology([
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [3, 30]
      ]),
      gameLog: [],
      gameLogSeq: 0
    };
    const effects = { awardClaimed: vi.fn() };

    logAwardChanges(
      G,
      { turn: 4 },
      { longestRoadOwnerId: "1", largestArmyOwnerId: null },
      { forced: true },
      effects
    );

    expect(G.gameLog).toEqual([
      expect.objectContaining({
        type: "award:longestRoad",
        actorId: "0",
        data: { previousOwnerId: "1" },
        forced: true
      })
    ]);
    expect(effects.awardClaimed).toHaveBeenCalledWith(
      expect.objectContaining({
        effectId: "award:longest-road:0:turn-4",
        awardType: "longestRoad",
        playerId: "0",
        previousOwnerId: "1",
        roadIds: ["1,2", "2,3", "3,4", "4,5", "5,6"],
        forced: true
      })
    );
  });

  it("logs largest army changes without emitting longest-road effects", () => {
    const core = createEmptyState(["0", "1"]);
    core.awards.largestArmyOwnerId = "1";
    const G = {
      core,
      gameLog: [],
      gameLogSeq: 0
    };
    const effects = { awardClaimed: vi.fn() };

    logAwardChanges(
      G,
      { turn: 5 },
      { longestRoadOwnerId: null, largestArmyOwnerId: "0" },
      {},
      effects
    );

    expect(G.gameLog).toEqual([
      expect.objectContaining({
        type: "award:largestArmy",
        actorId: "1",
        data: { previousOwnerId: "0" }
      })
    ]);
    expect(effects.awardClaimed).not.toHaveBeenCalled();
  });
});
