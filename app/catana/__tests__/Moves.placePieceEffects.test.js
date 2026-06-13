import { describe, expect, it, vi } from "vitest";
import { placeSettlement, placeRoad, placeCity } from "../moves/buildMoves";

vi.mock("@settlex/game-core", async () => {
  const actual = await vi.importActual("@settlex/game-core");
  return {
    ...actual,
    applyPlaceSettlement: vi.fn(() => ({ ok: true, distributions: [] })),
    applyBuildSettlement: vi.fn(() => ({ ok: true })),
    applyPlaceRoad: vi.fn(() => ({ ok: true })),
    applyBuildRoad: vi.fn(() => ({ ok: true })),
    applyBuildCity: vi.fn(() => ({ ok: true })),
    buildableEdges: vi.fn(() => []),
    buildableNodes: vi.fn(() => [])
  };
});

const makeContext = () => {
  const G = {
    core: {
      phase: "placement",
      ruleset: { pieceLimits: { settlements: 5, roads: 5 } },
      players: ["0"],
      playerStateById: {
        "0": { settlementsRemaining: 3, roadsRemaining: 3 }
      }
    },
    coreTopology: {},
    tiles: [],
    valids: { nodes: [], edges: [] }
  };

  const ctx = {
    phase: "placement",
    currentPlayer: "0",
    turn: 1,
    numPlayers: 1,
    activePlayers: { "0": "settlement" }
  };

  const events = { setStage: vi.fn(), endTurn: vi.fn() };
  const effects = { placePiece: vi.fn(), distributeCardsFromTile: vi.fn() };

  return { context: { G, ctx, playerID: "0", events, effects }, effects };
};

describe("placePiece effect wiring", () => {
  it("emits placePiece when placing settlement", () => {
    const { context, effects } = makeContext();

    placeSettlement.move(context, 5);

    expect(effects.placePiece).toHaveBeenCalledWith({
      pieceType: "settlement",
      id: 5,
      playerId: "0",
      initialPlacement: true
    });
  });

  it("emits placePiece when placing road", () => {
    const { context, effects } = makeContext();

    placeRoad.move(context, "1,2");

    expect(effects.placePiece).toHaveBeenCalledWith({
      pieceType: "road",
      id: "1,2",
      playerId: "0",
      initialPlacement: true
    });
  });

  it("emits placePiece when placing city", () => {
    const { context, effects } = makeContext();
    context.ctx.phase = "main";
    context.G.core.buildingsByNodeId = {
      0: { ownerId: "0", type: "settlement" }
    };

    placeCity.move(context, 0);

    expect(effects.placePiece).toHaveBeenCalledWith({
      pieceType: "city",
      id: 0,
      playerId: "0"
    });
  });
});
