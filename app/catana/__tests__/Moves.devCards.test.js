import { describe, it, expect, vi } from "vitest";
import { createEmptyState, buildTopology, ResourceType, TileTypes } from "@settlex/game-core";
import { playDevCardStart, placeRoadFromDevCard } from "../Moves";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: { EAST: [1, 2] }
    }
  }
];

const coreTopology = buildTopology(tiles);

describe("dev card play moves", () => {
  it("playDevCardStart sets devCardPlay for year of plenty", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["yearOfPlenty"];
    const ctx = { currentPlayer: "0", activePlayers: { "0": "preRoll" } };
    const context = { G: { core: state }, playerID: "0", ctx };

    playDevCardStart.move(context, "yearOfPlenty");

    expect(context.G.devCardPlay).toEqual({ type: "yearOfPlenty", playerId: "0" });
  });

  it("playDevCardStart sends knight to moveRobber and stores return stage", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["knight"];
    const events = { setStage: vi.fn() };
    const ctx = { currentPlayer: "0", activePlayers: { "0": "preRoll" } };
    const context = {
      G: { core: state, coreTopology, tiles },
      playerID: "0",
      ctx,
      events
    };

    playDevCardStart.move(context, "knight");

    expect(context.G.robberReturnToStage).toBe("preRoll");
    expect(events.setStage).toHaveBeenCalledWith("moveRobber");
  });

  it("playDevCardStart skips robber move when no legal tile exists", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["knight"];
    state.robberTileId = 1;
    const singleTile = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: {
          id: 1,
          resource: ResourceType.WOOD,
          number: 8,
          nodes: { NORTH: 1, SOUTH: 2 },
          edges: { EAST: [1, 2] }
        }
      }
    ];
    const singleTileTopology = buildTopology(singleTile);
    const events = { setStage: vi.fn() };
    const ctx = { currentPlayer: "0", activePlayers: { "0": "preRoll" } };
    const context = {
      G: {
        core: state,
        coreTopology: singleTileTopology,
        tiles: singleTile,
        gameLog: [],
        gameLogSeq: 0
      },
      playerID: "0",
      ctx,
      events
    };

    playDevCardStart.move(context, "knight");

    expect(events.setStage).toHaveBeenCalledWith("preRoll");
    expect(state.turn.phase).toBe("preRoll");
    expect(context.G.robberReturnToStage).toBe(null);
    expect(context.G.gameLog.some((entry) => entry.type === "robber:skip")).toBe(true);
  });

  it("placeRoadFromDevCard consumes pendingRoads and clears when done", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["roadBuilding"];
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const context = {
      G: {
        core: state,
        coreTopology,
        devCardPlay: { type: "roadBuilding", playerId: "0", pendingRoads: 1 }
      },
      playerID: "0",
      ctx: { currentPlayer: "0", activePlayers: { "0": "postRoll" } }
    };

    placeRoadFromDevCard.move(context, "1,2");

    expect(context.G.devCardPlay).toBe(null);
    expect(state.playerStateById["0"].devCards).toEqual([]);
  });
});
