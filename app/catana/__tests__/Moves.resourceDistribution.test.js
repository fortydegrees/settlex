import { describe, expect, it, vi } from "vitest";
import { placeSettlement } from "../Moves";
import { ResourceType, TileTypes, applyPlaceSettlement } from "@settlex/game-core";

vi.mock("@settlex/game-core", async () => {
  const actual = await vi.importActual("@settlex/game-core");
  return {
    ...actual,
    applyPlaceSettlement: vi.fn(),
    applyBuildSettlement: vi.fn(() => ({ ok: true })),
    buildableNodes: vi.fn(() => [10])
  };
});

const makeContext = () => {
  const playerID = "0";
  const nodeToCheck = 10;
  const mockLandTile = {
    type: TileTypes.LAND,
    coordinate: [0, 0, 0],
    tile: {
      id: 1,
      resource: ResourceType.WHEAT,
      nodes: { NORTH: nodeToCheck }
    }
  };

  const G = {
    core: {
      phase: "placement",
      playerStateById: { "0": { resources: [], settlementsRemaining: 3 } },
      ruleset: { pieceLimits: { settlements: 5 } },
      bank: { resources: [ResourceType.WHEAT] },
      roadsByEdgeId: {}
    },
    tiles: [mockLandTile],
    coreTopology: {
      adjacencies: {},
      nodes: { "10": { id: 10, edges: [] } },
      nodeEdges: { "10": [] }
    },
    valids: { nodes: [nodeToCheck] }
  };

  const ctx = {
    phase: "placement",
    turn: 4,
    numPlayers: 2,
    currentPlayer: playerID
  };

  const events = { setStage: vi.fn(), endTurn: vi.fn() };
  const effects = { distributeCardsFromTile: vi.fn() };
  const log = { setMetadata: vi.fn() };

  return { context: { G, playerID, ctx, events, effects, log }, nodeToCheck, effects };
};

describe("placeSettlement resource distribution wiring", () => {
  it("skips effects when core returns no distributions", () => {
    const { context, nodeToCheck, effects } = makeContext();

    applyPlaceSettlement.mockReturnValueOnce({ ok: true, distributions: [] });

    placeSettlement.move(context, nodeToCheck);

    expect(effects.distributeCardsFromTile).not.toHaveBeenCalled();
  });

  it("forwards distributions from core to effects", () => {
    const { context, nodeToCheck, effects } = makeContext();

    applyPlaceSettlement.mockReturnValueOnce({
      ok: true,
      distributions: [
        { tileId: 1, playerId: "0", resource: ResourceType.WHEAT }
      ]
    });

    placeSettlement.move(context, nodeToCheck);

    expect(effects.distributeCardsFromTile).toHaveBeenCalledTimes(1);
    const callArgs = effects.distributeCardsFromTile.mock.calls[0][0];
    expect(callArgs).toHaveLength(1);
    expect(callArgs[0]).toEqual({
      tileId: 1,
      coordinate: [0, 0, 0],
      playerID: "0",
      resource: ResourceType.WHEAT
    });
  });

  it("does not throw when effects plugin is unavailable", () => {
    const { context, nodeToCheck } = makeContext();

    applyPlaceSettlement.mockReturnValueOnce({
      ok: true,
      distributions: [
        { tileId: 1, playerId: "0", resource: ResourceType.WHEAT }
      ]
    });

    delete context.effects;
    expect(() => placeSettlement.move(context, nodeToCheck)).not.toThrow();
  });
});
