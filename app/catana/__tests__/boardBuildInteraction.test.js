import { describe, expect, it } from "vitest";
import {
  createEmptyState,
  ResourceType
} from "@settlex/game-core";
import {
  getBoardInteractionState,
  getExplicitBuildableRoads,
  getMainBuildableNodes,
  getOwnedSettlementNodeIds,
  getPassiveBuildTargets
} from "../utils/boardBuildInteraction";

const makeTopology = (edges) => {
  const edgeNodes = {};
  const nodeEdges = {};
  const nodeNeighbors = {};
  const nodeSet = new Set();

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
};

const makeGame = () => {
  const core = createEmptyState(["0", "1"]);
  core.phase = "normal";
  return {
    core,
    coreTopology: makeTopology([
      [1, 2],
      [2, 3],
      [3, 5],
      [1, 4]
    ]),
    devCardPlay: null
  };
};

const mainCtx = {
  phase: "main",
  currentPlayer: "0",
  activePlayers: { "0": "postRoll" }
};

describe("board build interaction helpers", () => {
  it("derives local stage ownership without requiring activePlayers", () => {
    expect(
      getBoardInteractionState({
        ctx: {
          phase: "placement",
          currentPlayer: "0",
          activePlayers: { "0": "settlement" }
        },
        playerID: "0"
      })
    ).toEqual({
      playerStage: "settlement",
      isCurrentPlayerPerspective: true,
      isInteractiveStageOwner: true,
      isPlacementSettlementStage: true,
      isPlacementRoadStage: false
    });

    expect(
      getBoardInteractionState({
        ctx: { phase: "main", currentPlayer: "0" },
        playerID: "1"
      })
    ).toMatchObject({
      playerStage: null,
      isCurrentPlayerPerspective: false,
      isInteractiveStageOwner: false
    });
  });

  it("returns city candidates from owned settlements only", () => {
    const G = makeGame();
    G.core.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    G.core.buildingsByNodeId[2] = { ownerId: "1", type: "settlement" };
    G.core.buildingsByNodeId[3] = { ownerId: "0", type: "city" };

    expect(getOwnedSettlementNodeIds(G.core, "0")).toEqual([1]);
    expect(
      getMainBuildableNodes({
        G,
        ctx: mainCtx,
        playerID: "0",
        playerAction: "placeCity",
        isCurrentPlayerPerspective: true
      })
    ).toEqual([1]);
    expect(
      getMainBuildableNodes({
        G,
        ctx: mainCtx,
        playerID: "0",
        playerAction: "placeCity",
        isCurrentPlayerPerspective: false
      })
    ).toEqual([]);

    expect(
      getMainBuildableNodes({
        G: { core: G.core },
        ctx: mainCtx,
        playerID: "0",
        playerAction: "placeCity",
        isCurrentPlayerPerspective: true
      })
    ).toEqual([1]);
  });

  it("returns explicit road targets only for the local explicit road actions", () => {
    const G = makeGame();
    G.core.roadsByEdgeId["1,2"] = "0";

    expect(
      getExplicitBuildableRoads({
        G,
        ctx: mainCtx,
        playerID: "0",
        playerAction: "placeRoad",
        isCurrentPlayerPerspective: true
      }).sort()
    ).toEqual(["1,4", "2,3"].sort());

    expect(
      getExplicitBuildableRoads({
        G,
        ctx: mainCtx,
        playerID: "0",
        playerAction: "placeSettlement",
        isCurrentPlayerPerspective: true
      })
    ).toEqual([]);
    expect(
      getExplicitBuildableRoads({
        G,
        ctx: mainCtx,
        playerID: "0",
        playerAction: "placeRoad",
        isCurrentPlayerPerspective: false
      })
    ).toEqual([]);
  });

  it("derives passive build targets behind passive-mode and cost guards", () => {
    const G = makeGame();
    G.core.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    G.core.roadsByEdgeId["1,2"] = "0";
    G.core.roadsByEdgeId["2,3"] = "0";
    G.core.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE
    ];

    const targets = getPassiveBuildTargets({
      G,
      ctx: mainCtx,
      playerID: "0",
      playerAction: null
    });

    expect(targets.passiveBuildEnabled).toBe(true);
    expect(targets.passiveBuildableEdges).toContain("3,5");
    expect(targets.passiveSettlementNodes).toContain(3);
    expect(targets.passiveCityNodes).toEqual([1]);

    G.core.playerStateById["0"].resources = [];
    expect(
      getPassiveBuildTargets({
        G,
        ctx: mainCtx,
        playerID: "0",
        playerAction: null
      })
    ).toEqual({
      passiveBuildEnabled: true,
      passiveBuildableEdges: [],
      passiveSettlementNodes: [],
      passiveCityNodes: []
    });

    expect(
      getPassiveBuildTargets({
        G,
        ctx: mainCtx,
        playerID: "0",
        playerAction: "placeRoad"
      }).passiveBuildEnabled
    ).toBe(false);

    G.core.playerStateById["0"].resources = [
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE
    ];
    expect(
      getPassiveBuildTargets({
        G: { core: G.core },
        ctx: mainCtx,
        playerID: "0",
        playerAction: null
      }).passiveCityNodes
    ).toEqual([1]);
  });
});
