import { describe, expect, it, vi } from "vitest";
import {
  buildTopology,
  createEmptyState,
  ResourceType,
  TileTypes
} from "@settlex/game-core";
import {
  autoDiscard,
  buyDevCard,
  confirmDevCardPlay,
  maybeLogGameOver,
  placeRoad,
  playDevCardStart,
  rollDice,
  moveRobber
} from "../Moves";

vi.mock("@settlex/game-core", async () => {
  const actual = await vi.importActual("@settlex/game-core");
  return {
    ...actual,
    applyBuildRoad: vi.fn((state, _topology, _edgeId, playerId) => {
      state.awards.longestRoadOwnerId = playerId;
      return { ok: true, state };
    }),
    applyKnight: vi.fn((state, playerId) => {
      state.awards.largestArmyOwnerId = playerId;
      return { ok: true, state };
    })
  };
});

const makeContext = (overrides = {}) => {
  const core = createEmptyState(["0", "1"]);
  return {
    G: {
      core,
      gameLog: [],
      gameLogSeq: 0
    },
    ctx: {
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" },
      numPlayers: 2,
      turn: 1
    },
    playerID: "0",
    random: { Number: () => 0.4, Shuffle: (arr) => arr },
    log: { setMetadata: () => {} },
    events: {
      endStage: () => {},
      setActivePlayers: () => {},
      setStage: () => {}
    },
    ...overrides
  };
};

const testTiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: {
      id: 2,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: {}
    }
  }
];

const testBoard = buildTopology(testTiles);

describe("game log moves", () => {
  it("redacts dev card buy", () => {
    const context = makeContext();
    context.G.core.playerStateById["0"].resources = [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];

    buyDevCard.move(context);

    expect(context.G.gameLog).toHaveLength(1);
    const entry = context.G.gameLog[0];
    expect(entry.type).toBe("dev:buy");
    expect(entry.data?.cardType).toBeUndefined();
  });

  it("autoDiscard prepends forced entry", () => {
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

    expect(context.G.gameLog[0].type).toBe("forced:discardSelection");
    expect(context.G.gameLog[1].type).toBe("discard");
    expect(context.G.gameLog[1].forced).toBe(true);
  });

  it("logs game over once", () => {
    const context = makeContext();
    context.G.core.gameOver = { winnerId: "0", reason: "victoryPoints" };
    maybeLogGameOver(context.G, context.ctx);
    expect(context.G.gameLog).toHaveLength(1);
    maybeLogGameOver(context.G, context.ctx);
    expect(context.G.gameLog).toHaveLength(1);
  });

  it("logs longest road award changes from road placement", () => {
    const context = makeContext();
    context.G.core.awards.longestRoadOwnerId = "1";

    placeRoad.move(context, "1,2");

    expect(context.G.gameLog.map((entry) => entry.type)).toEqual([
      "build:road",
      "award:longestRoad"
    ]);
    expect(context.G.gameLog[1]).toMatchObject({
      type: "award:longestRoad",
      actorId: "0",
      data: { previousOwnerId: "1" }
    });
  });

  it("logs largest army award changes from knight play", () => {
    const context = makeContext();
    context.G.core.playerStateById["0"].devCards = ["knight"];
    context.G.core.awards.largestArmyOwnerId = "1";

    playDevCardStart.move(context, "knight");

    expect(context.G.gameLog.map((entry) => entry.type)).toEqual([
      "dev:play",
      "award:largestArmy",
      "robber:skip"
    ]);
    expect(context.G.gameLog[1]).toMatchObject({
      type: "award:largestArmy",
      actorId: "0",
      data: { previousOwnerId: "1" }
    });
  });

  it("logs a monopoly result entry with the claimed total", () => {
    const context = makeContext();
    context.G.devCardPlay = { type: "monopoly", playerId: "0" };
    context.G.core.playerStateById["0"].devCards = ["monopoly"];
    context.G.core.playerStateById["1"].resources = [
      ResourceType.WOOD,
      ResourceType.WOOD
    ];

    confirmDevCardPlay.move(context, ResourceType.WOOD);

    expect(context.G.gameLog.map((entry) => entry.type)).toEqual([
      "dev:play",
      "dev:monopolyResult"
    ]);
    expect(context.G.gameLog[1]).toMatchObject({
      type: "dev:monopolyResult",
      actorId: "0",
      data: { resource: ResourceType.WOOD, amountStolen: 2 }
    });
  });

  it("logs shortage entries after rolling an understocked resource", () => {
    const context = makeContext({
      G: {
        core: createEmptyState(["0", "1"]),
        coreTopology: testBoard,
        tiles: testTiles,
        gameLog: [],
        gameLogSeq: 0
      },
      random: {
        Number: () => 0.4,
        Shuffle: (arr) => arr,
        D6: () => [4, 4]
      }
    });
    context.G.core.bank.resources = [ResourceType.WOOD];
    context.G.core.robberTileId = null;
    context.G.core.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    context.G.core.buildingsByNodeId[2] = { ownerId: "1", type: "settlement" };

    rollDice.move(context);

    expect(context.G.gameLog.some((entry) => entry.type === "resource:shortage")).toBe(
      true
    );
  });

  it("logs robber destination metadata", () => {
    const context = makeContext({
      G: {
        core: createEmptyState(["0", "1"]),
        coreTopology: testBoard,
        tiles: testTiles,
        gameLog: [],
        gameLogSeq: 0
      }
    });

    moveRobber.move(context, 2);

    expect(
      context.G.gameLog.find((entry) => entry.type === "robber:move")
    ).toMatchObject({
      data: expect.objectContaining({
        tileId: 2,
        tileResource: "Wood",
        tileNumber: 8
      })
    });
  });
});
