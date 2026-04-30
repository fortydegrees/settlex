import { describe, it, expect, vi } from "vitest";
import { createEmptyState, buildTopology, ResourceType, TileTypes } from "@settlex/game-core";
import {
  DEBUG_takeDevCards,
  buyDevCard,
  confirmDevCardPlay,
  moveRobber,
  playDevCardStart,
  placeRoadFromDevCard
} from "../Moves";

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
  it("DEBUG_takeDevCards gives selected dev cards to the chosen player", () => {
    const state = createEmptyState(["0", "1"]);
    state.devDeck = ["knight", "monopoly", "roadBuilding"];
    const log = { setMetadata: vi.fn() };
    const context = { G: { core: state }, log };

    DEBUG_takeDevCards.move(context, "0", ["monopoly", "roadBuilding"]);

    expect(state.playerStateById["0"].devCards).toEqual([
      "monopoly",
      "roadBuilding"
    ]);
    expect(state.devDeck).toEqual(["knight"]);
    expect(log.setMetadata).toHaveBeenCalled();
  });

  it("emits buyDevCardReveal with the authoritative card type", () => {
    const state = createEmptyState(["0"]);
    state.devDeck = ["monopoly"];
    state.playerStateById["0"].resources = [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];
    const effects = { buyDevCardReveal: vi.fn() };
    const context = {
      G: { core: state, gameLog: [], gameLogSeq: 0 },
      playerID: "0",
      ctx: { currentPlayer: "0", turn: 1 },
      effects
    };

    buyDevCard.move(context);

    expect(effects.buyDevCardReveal).toHaveBeenCalledWith({
      playerId: "0",
      cardType: "monopoly"
    });
  });

  it("runs buyDevCard on the server only so secret draws do not use masked client state", () => {
    expect(buyDevCard.client).toBe(false);
  });

  it("playDevCardStart emits a start effect for year of plenty", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["yearOfPlenty"];
    const ctx = { currentPlayer: "0", activePlayers: { "0": "preRoll" }, turn: 4 };
    const effects = { devCardPlayStarted: vi.fn() };
    const context = { G: { core: state }, playerID: "0", ctx, effects };

    playDevCardStart.move(context, "yearOfPlenty");

    expect(context.G.devCardPlay).toMatchObject({
      type: "yearOfPlenty",
      playerId: "0",
      effectId: "devcard:yearOfPlenty:0:turn-4",
      startedFromStage: "preRoll"
    });
    expect(effects.devCardPlayStarted).toHaveBeenCalledWith(
      expect.objectContaining({
        effectId: "devcard:yearOfPlenty:0:turn-4",
        playerId: "0",
        cardType: "yearOfPlenty",
        phase: "start",
        startedFromStage: "preRoll"
      })
    );
  });

  it("confirmDevCardPlay emits a year of plenty resolve effect with selected resources", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["yearOfPlenty"];
    const effects = { devCardPlayResolved: vi.fn() };
    const context = {
      G: {
        core: state,
        gameLog: [],
        gameLogSeq: 0,
        devCardPlay: {
          type: "yearOfPlenty",
          playerId: "0",
          effectId: "devcard:yearOfPlenty:0:turn-4",
          startedFromStage: "postRoll"
        }
      },
      playerID: "0",
      ctx: { currentPlayer: "0", activePlayers: { "0": "postRoll" }, turn: 4 },
      effects
    };

    confirmDevCardPlay.move(context, [ResourceType.WOOD, ResourceType.BRICK]);

    expect(effects.devCardPlayResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        effectId: "devcard:yearOfPlenty:0:turn-4",
        playerId: "0",
        cardType: "yearOfPlenty",
        phase: "resolve",
        resources: [ResourceType.WOOD, ResourceType.BRICK]
      })
    );
    expect(context.G.devCardPlay).toBe(null);
  });

  it("confirmDevCardPlay emits a monopoly resolve effect with per-player transfers", () => {
    const state = createEmptyState(["0", "1", "2"]);
    state.playerStateById["0"].devCards = ["monopoly"];
    state.playerStateById["1"].resources = [ResourceType.WOOD, ResourceType.WOOD];
    state.playerStateById["2"].resources = [ResourceType.WOOD, ResourceType.ORE];
    const effects = { devCardPlayResolved: vi.fn() };
    const context = {
      G: {
        core: state,
        gameLog: [],
        gameLogSeq: 0,
        devCardPlay: {
          type: "monopoly",
          playerId: "0",
          effectId: "devcard:monopoly:0:turn-5",
          startedFromStage: "postRoll"
        }
      },
      playerID: "0",
      ctx: { currentPlayer: "0", activePlayers: { "0": "postRoll" }, turn: 5 },
      effects
    };

    confirmDevCardPlay.move(context, ResourceType.WOOD);

    expect(effects.devCardPlayResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        effectId: "devcard:monopoly:0:turn-5",
        playerId: "0",
        cardType: "monopoly",
        phase: "resolve",
        resource: ResourceType.WOOD,
        transfers: [
          { fromPlayerId: "1", toPlayerId: "0", resource: ResourceType.WOOD, count: 2 },
          { fromPlayerId: "2", toPlayerId: "0", resource: ResourceType.WOOD, count: 1 }
        ],
        totalTransferred: 3
      })
    );
  });

  it("playDevCardStart allows road building when exactly one road remains", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["roadBuilding"];
    state.playerStateById["0"].roadsRemaining = 1;
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const ctx = { currentPlayer: "0", activePlayers: { "0": "postRoll" } };
    const context = { G: { core: state, coreTopology }, playerID: "0", ctx };

    playDevCardStart.move(context, "roadBuilding");

    expect(context.G.devCardPlay).toMatchObject({
      type: "roadBuilding",
      playerId: "0",
      pendingRoads: 1
    });
  });

  it("playDevCardStart does not start road building when no road pieces remain", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["roadBuilding"];
    state.playerStateById["0"].roadsRemaining = 0;
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const ctx = { currentPlayer: "0", activePlayers: { "0": "postRoll" } };
    const context = { G: { core: state, coreTopology }, playerID: "0", ctx };

    playDevCardStart.move(context, "roadBuilding");

    expect(context.G.devCardPlay).toBeUndefined();
    expect(state.playerStateById["0"].devCards).toEqual(["roadBuilding"]);
  });

  it("playDevCardStart does not start road building when no legal road placement exists", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["roadBuilding"];
    const ctx = { currentPlayer: "0", activePlayers: { "0": "postRoll" } };
    const context = { G: { core: state, coreTopology }, playerID: "0", ctx };

    playDevCardStart.move(context, "roadBuilding");

    expect(context.G.devCardPlay).toBeUndefined();
    expect(state.playerStateById["0"].devCards).toEqual(["roadBuilding"]);
  });

  it("playDevCardStart sends knight to moveRobber and stores return stage", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["knight"];
    state.playerStateById["0"].knightsPlayed = 0;
    const events = { setStage: vi.fn() };
    const effects = { devCardPlayStarted: vi.fn() };
    const ctx = { currentPlayer: "0", activePlayers: { "0": "preRoll" }, turn: 12 };
    const context = {
      G: { core: state, coreTopology, tiles },
      playerID: "0",
      ctx,
      events,
      effects
    };

    playDevCardStart.move(context, "knight");

    expect(context.G.robberReturnToStage).toBe("preRoll");
    expect(events.setStage).toHaveBeenCalledWith("moveRobber");
    expect(effects.devCardPlayStarted).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "0",
        cardType: "knight",
        phase: "start",
        startedFromStage: "preRoll",
        previousKnightsPlayed: 0,
        nextKnightsPlayed: 1,
        previousLargestArmyOwnerId: null
      })
    );
    expect(context.G.pendingDevCardPlayAnimation).toMatchObject({
      playerId: "0",
      cardType: "knight",
      previousKnightsPlayed: 0,
      nextKnightsPlayed: 1
    });
  });

  it("emits a Knight play resolve effect when robber resolution finishes", () => {
    const state = createEmptyState(["0", "1"]);
    state.playerStateById["0"].devCards = ["knight"];
    state.playerStateById["1"].resources = [ResourceType.WOOD];
    const effects = {
      devCardPlayStarted: vi.fn(),
      devCardPlayResolved: vi.fn()
    };
    const events = {
      setStage: vi.fn(),
      setActivePlayers: vi.fn()
    };
    const ctx = {
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" },
      turn: 12
    };
    const random = { Number: () => 0 };
    const context = {
      G: { core: state, coreTopology, tiles, gameLog: [], gameLogSeq: 0 },
      playerID: "0",
      ctx,
      events,
      effects,
      random
    };

    playDevCardStart.move(context, "knight");
    moveRobber.move(context, 1);

    expect(effects.devCardPlayResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "0",
        cardType: "knight",
        phase: "resolve",
        previousKnightsPlayed: 0,
        nextKnightsPlayed: 1
      })
    );
    expect(context.G.pendingDevCardPlayAnimation).toBe(null);
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
    const effects = {
      devCardPlayStarted: vi.fn(),
      devCardPlayResolved: vi.fn()
    };
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
      events,
      effects
    };

    playDevCardStart.move(context, "knight");

    expect(events.setStage).toHaveBeenCalledWith("preRoll");
    expect(state.turn.phase).toBe("preRoll");
    expect(context.G.robberReturnToStage).toBe(null);
    expect(context.G.gameLog.some((entry) => entry.type === "robber:skip")).toBe(true);
    expect(effects.devCardPlayStarted).toHaveBeenCalled();
    expect(effects.devCardPlayResolved).toHaveBeenCalled();
    expect(context.G.pendingDevCardPlayAnimation).toBe(null);
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

  it("placeRoadFromDevCard consumes a single remaining road-building placement", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["roadBuilding"];
    state.playerStateById["0"].roadsRemaining = 1;
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

    expect(state.roadsByEdgeId["1,2"]).toBe("0");
    expect(state.playerStateById["0"].roadsRemaining).toBe(0);
    expect(context.G.devCardPlay).toBe(null);
    expect(state.playerStateById["0"].devCards).toEqual([]);
  });

  it("placeRoadFromDevCard finishes the card when no second legal road remains", () => {
    const state = createEmptyState(["0"]);
    state.playerStateById["0"].devCards = ["roadBuilding"];
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const context = {
      G: {
        core: state,
        coreTopology,
        devCardPlay: { type: "roadBuilding", playerId: "0", pendingRoads: 2 }
      },
      playerID: "0",
      ctx: { currentPlayer: "0", activePlayers: { "0": "postRoll" } }
    };

    placeRoadFromDevCard.move(context, "1,2");

    expect(state.roadsByEdgeId["1,2"]).toBe("0");
    expect(context.G.devCardPlay).toBe(null);
    expect(state.playerStateById["0"].devCards).toEqual([]);
  });
});
