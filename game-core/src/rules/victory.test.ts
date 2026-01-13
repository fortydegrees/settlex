import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import {
  recomputeLargestArmy,
  recomputeLongestRoad,
  getVictoryPoints,
  checkWin,
  checkAndApplyWin
} from "./victory";
import { applyBuildCity, applyBuildRoad } from "./buildActions";
import { applyKnight, buyDevCard } from "./devCards";
import { ResourceType } from "../types";
import { BoardTopology, buildTopology } from "../core/topology";
import { generateBoard } from "../board/generateBoard";
import { spec } from "../spec";
import { makeDeterministicRng } from "../testUtils";

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

describe("victory points", () => {
  it("computes victory points from board, dev cards, and awards", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    state.buildingsByNodeId[2] = { ownerId: "0", type: "city" };
    state.playerStateById["0"].devCards = ["victoryPoint"];
    state.awards.longestRoadOwnerId = "0";

    expect(getVictoryPoints(state, "0")).toBe(6);
  });

  it("checks win immediately", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.victoryPointsToWin = 3;
    state.buildingsByNodeId[1] = { ownerId: "0", type: "city" };
    state.awards.largestArmyOwnerId = "0";

    expect(checkWin(state, "0")).toBe(true);
  });
});

describe("game over", () => {
  it("sets gameOver when current player reaches threshold in normal phase", () => {
    const state = createEmptyState(["0"]);
    state.phase = "normal";
    state.turn.currentPlayerId = "0";
    state.ruleset.victoryPointsToWin = 1;
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

    checkAndApplyWin(state, "0");

    expect(state.gameOver).toEqual({ winnerId: "0", reason: "victoryPoints" });
  });

  it("ignores wins outside normal phase", () => {
    const state = createEmptyState(["0"]);
    state.phase = "placement";
    state.turn.currentPlayerId = "0";
    state.ruleset.victoryPointsToWin = 1;
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

    checkAndApplyWin(state, "0");

    expect(state.gameOver).toBe(null);
  });

  it("ignores wins when acting player is not current player", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.turn.currentPlayerId = "0";
    state.ruleset.victoryPointsToWin = 1;
    state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };

    checkAndApplyWin(state, "1");

    expect(state.gameOver).toBe(null);
  });
});

describe("game over wiring", () => {
  it("sets gameOver after building a city in normal play", () => {
    const tiles = generateBoard(spec, makeDeterministicRng(1));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0"]);
    state.phase = "normal";
    state.turn.currentPlayerId = "0";
    state.ruleset.victoryPointsToWin = 2;
    const node = board.landNodeIds[0];
    state.buildingsByNodeId[node] = { ownerId: "0", type: "settlement" };
    state.playerStateById["0"].resources = [
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE
    ];

    const result = applyBuildCity(state, board, node, "0");

    expect(result.ok).toBe(true);
    expect(state.gameOver?.winnerId).toBe("0");
  });

  it("sets gameOver when buying a victory point dev card", () => {
    const state = createEmptyState(["0"]);
    state.phase = "normal";
    state.turn.currentPlayerId = "0";
    state.ruleset.victoryPointsToWin = 1;
    state.devDeck = ["victoryPoint"];
    state.playerStateById["0"].resources = [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];

    const result = buyDevCard(state, "0");

    expect(result.ok).toBe(true);
    expect(state.gameOver?.winnerId).toBe("0");
  });
});

describe("award updates", () => {
  it("updates longest road after building roads", () => {
    const board = makeBoard([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6]
    ]);
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    state.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WOOD,
      ResourceType.BRICK
    ];

    applyBuildRoad(state, board, "1,2", "0");
    applyBuildRoad(state, board, "2,3", "0");
    applyBuildRoad(state, board, "3,4", "0");
    applyBuildRoad(state, board, "4,5", "0");
    applyBuildRoad(state, board, "5,6", "0");

    expect(state.awards.longestRoadOwnerId).toBe("0");
  });

  it("updates largest army after knight play", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["knight"];
    state.playerStateById["0"].devCardsBoughtThisTurn = [];
    state.playerStateById["0"].knightsPlayed = 2;

    applyKnight(state, "0");

    expect(state.awards.largestArmyOwnerId).toBe("0");
  });
});
