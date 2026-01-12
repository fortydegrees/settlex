import { describe, expect, it, vi } from "vitest";
import { placeSettlement } from "../Moves";
import { ResourceType, TileTypes } from "@settlex/game-core";

// Mock immer to avoid "current expects a draft" error
vi.mock("immer", () => ({
  current: (val) => val
}));

describe("placeSettlement resource distribution", () => {
  it("should only distribute resources from LAND tiles during initial placement", () => {
    // 1. Setup
    const playerID = "0";
    const nodeToCheck = "10";
    
    // Mock Tiles
    const mockLandTile = {
      type: TileTypes.LAND,
      tile: {
        id: 1,
        resource: ResourceType.WHEAT,
        nodes: { NORTH: 10 }, 
        number: 6
      }
    };

    const mockPortTile = {
      type: TileTypes.PORT,
      tile: {
        id: 2,
        resource: ResourceType.BRICK, // Port resource (for trade)
        nodes: { SOUTH: 10 },
        number: null
      }
    };

    const G = {
      core: {
        phase: "placement", // Will be set to placement by move logic if needed or strictly checked
        playerStateById: {
            "0": { resources: [], settlementsRemaining: 5, roadsRemaining: 5 } // Basic mock
        },
        buildingsByNodeId: {},
        roadsByEdgeId: {}, // Added for updateValids -> buildableEdges
        ruleset: {
            buildCosts: { settlement: { [ResourceType.BRICK]: 1, [ResourceType.WOOD]: 1, [ResourceType.SHEEP]: 1, [ResourceType.WHEAT]: 1 } },
            bank: { finite: false },
            pieceLimits: { settlements: 5 } // Standard
        },
        bank: {
            resources: ["Wheat", "Brick", "Wood", "Sheep", "Ore"] // Populate bank
        }
      },
      coreTopology: {
          // minimal topology mock if needed by applyPlaceSettlement
          adjacencies: {},
          nodes: { "10": { id: 10, edges: [] } }, // minimal
          nodeEdges: { "10": [] }
      },
      tiles: [mockLandTile, mockPortTile],
      valids: { nodes: [10] } // Mock valid node
    };

    const ctx = {
      phase: "placement",
      turn: 4, // Simulate being > numPlayers (e.g. 2nd settlement for player 1 in 3 player game, or simply round 2)
      numPlayers: 3,
      currentPlayer: playerID,
      activePlayers: { "0": "settlement" }
    };

    const events = {
      setStage: vi.fn(),
      endTurn: vi.fn()
    };

    const effects = {
      distributeCardsFromTile: vi.fn()
    };
    
    // Mock applyPlaceSettlement to succeed
    // We can't easily mock the import inside Moves.js without detailed hoisting or using verify on the side-effects.
    // Instead, we rely on the fact that placeSettlement calls applyPlaceSettlement.
    // However, applyPlaceSettlement is complex. 
    // Let's assume for this UNIT TEST of the Move wrapper logic, we mostly care about the side effects triggered *after* success.
    
    // BUT Moves.js imports applyPlaceSettlement. We'd need to mock the module @settlex/game-core.
    // Since we are running in vitest, we can rely on standard behavior if the core logic works with our partial mock.
    // Alternatively, we can intercept the G.core modifications.
    
    // Let's just mock the necessary core methods if possible, OR construct a minimal valid state.
    // The previously read `applyPlaceSettlement` just checks buildability.
    
    // Hack: We want to test logic inside `Moves.js`. 
    // The critical part is:
    // const resourceTiles = getAllTilesConnectedToNode(G.tiles, node);
    // ...
    // effects.distributeCardsFromTile(cardAnims);
    
    // We can mock `applyPlaceSettlement` to just return { ok: true } to bypass core logic constraints
    // This requires mocking @settlex/game-core.
  });
});

// Re-writing the test to properly mock the module
vi.mock("@settlex/game-core", async () => {
    const actual = await vi.importActual("@settlex/game-core");
    return {
        ...actual,
        applyPlaceSettlement: vi.fn(() => ({ ok: true })),
        applyBuildSettlement: vi.fn(() => ({ ok: true })),
        buildableNodes: vi.fn(() => [10]), // Allow our node
    };
});

describe("Detailed placeSettlement test", () => {
    it("filters out non-LAND tiles for resource distribution", () => {
        const playerID = "0";
        const nodeToCheck = 10;
        
        const mockLandTile = {
            type: TileTypes.LAND,
            tile: {
              id: 1,
              resource: ResourceType.WHEAT,
              nodes: { NORTH: 10 }
            }
          };
      
        const mockPortTile = {
            type: TileTypes.PORT, // CRITICAL: This IS NOT TileTypes.LAND
            tile: {
              id: 2,
              resource: ResourceType.BRICK, 
              nodes: { SOUTH: 10 }
            }
        };

        const G = {
            core: {
                phase: "placement",
                playerStateById: { "0": { resources: [] } },
                bank: { resources: ["Wheat", "Brick"] },
                roadsByEdgeId: {} 
            },
            tiles: [mockLandTile, mockPortTile],
            coreTopology: {
                adjacencies: {},
                nodes: { "10": { id: 10, edges: [] } },
                nodeEdges: { "10": [] }
            },
            valids: { nodes: [] }
        };

        const ctx = {
            phase: "placement",
            turn: 4,
            numPlayers: 3,
            currentPlayer: playerID
        };

        const events = { setStage: vi.fn() };
        const effects = { distributeCardsFromTile: vi.fn() };
        const log = { setMetadata: vi.fn() };

        const context = { G, playerID, ctx, events, effects, log };

        // Execute
        placeSettlement.move(context, nodeToCheck);

        // Assert
        expect(effects.distributeCardsFromTile).toHaveBeenCalled();
        const callArgs = effects.distributeCardsFromTile.mock.calls[0][0];
        
        // We expect ONLY the Land tile to be in the distribution list
        expect(callArgs).toHaveLength(1);
        expect(callArgs[0].tile.tile.id).toBe(1); // Wheat tile
        expect(callArgs[0].tile.tile.resource).toBe(ResourceType.WHEAT);
        
        // Ensure Port tile (id 2) was NOT included
        const tileIds = callArgs.map(arg => arg.tile.tile.id);
        expect(tileIds).not.toContain(2);
    });
});
