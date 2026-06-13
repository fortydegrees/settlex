import { describe, it, expect, vi } from "vitest";
import {
  applyPlaceRoad,
  applyPlaceSettlement,
  createEmptyState,
  ResourceType
} from "@settlex/game-core";
import { autoPlaceRoad, autoPlaceSettlement } from "../Moves";
import { autoDiscard } from "../moves/turnMoves";

vi.mock("@settlex/game-core", async () => {
  const actual = await vi.importActual("@settlex/game-core");
  return {
    ...actual,
    applyPlaceSettlement: vi.fn(() => ({ ok: true })),
    applyPlaceRoad: vi.fn(() => ({ ok: true }))
  };
});

const makeContext = (overrides = {}) => {
  const core = createEmptyState(["0", "1"]);
  return {
    G: {
      core,
      coreTopology: {
        landNodeIds: [1, 2, 3],
        nodeNeighbors: { 1: [], 2: [], 3: [] },
        nodeEdges: { 1: [], 2: [], 3: [] },
        edgeNodes: {},
        tiles: []
      },
      valids: { nodes: [], edges: [] }
    },
    ctx: {
      phase: "placement",
      currentPlayer: "0",
      activePlayers: { "0": "settlement" },
      numPlayers: 2,
      turn: 1
    },
    playerID: "0",
    random: { Number: () => 0.4, Shuffle: (arr) => arr },
    log: { setMetadata: vi.fn() },
    events: {
      endTurn: vi.fn(),
      setStage: vi.fn(),
      endStage: vi.fn(),
      setActivePlayers: vi.fn()
    },
    ...overrides
  };
};

describe("auto-timeout moves", () => {
  it("autoPlaceSettlement chooses a valid node", () => {
    const context = makeContext();
    context.G.valids.nodes = [1, 2, 3];

    autoPlaceSettlement.move(context);

    expect(applyPlaceSettlement).toHaveBeenCalledTimes(1);
    const nodeId = applyPlaceSettlement.mock.calls[0][2];
    expect([1, 2, 3]).toContain(nodeId);
  });

  it("autoPlaceRoad chooses a valid edge", () => {
    const context = makeContext({
      ctx: {
        phase: "placement",
        currentPlayer: "0",
        activePlayers: { "0": "road" },
        numPlayers: 2,
        turn: 1
      }
    });
    context.G.valids.edges = ["1,2", "2,3"];

    autoPlaceRoad.move(context);

    expect(applyPlaceRoad).toHaveBeenCalledTimes(1);
    const edgeId = applyPlaceRoad.mock.calls[0][2];
    expect(["1,2", "2,3"]).toContain(edgeId);
  });

  it("autoDiscard removes required cards", () => {
    const context = makeContext({
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "robberDiscard" },
        numPlayers: 2,
        turn: 1
      }
    });
    context.G.core.turn.pendingDiscards = ["0"];
    context.G.core.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.BRICK,
      ResourceType.BRICK
    ];

    autoDiscard.move(context);

    expect(context.G.core.playerStateById["0"].resources.length).toBe(4);
  });
});
