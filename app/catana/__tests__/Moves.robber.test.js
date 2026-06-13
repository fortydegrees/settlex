import { describe, expect, it, vi } from "vitest";
import { buildTopology, createEmptyState, TileTypes } from "@settlex/game-core";
import { Client } from "boardgame.io/dist/cjs/client.js";
import { Catan } from "../Game";
import { rollDice } from "../Moves";
import { autoMoveRobber, moveRobber } from "../moves/robberMoves";

describe("Moves robber flow", () => {
  const seedDiscardClient = ({
    currentPlayerId = "1",
    discardingPlayerId = "0"
  } = {}) => {
    const client = Client({ game: Catan, playerID: discardingPlayerId });
    const state = JSON.parse(JSON.stringify(client.getState()));

    state.ctx.phase = "main";
    state.ctx.currentPlayer = currentPlayerId;
    state.ctx.playOrder = ["0", "1"];
    state.ctx.playOrderPos = state.ctx.playOrder.indexOf(currentPlayerId);
    state.ctx.activePlayers = {
      [discardingPlayerId]: "robberDiscard",
      [currentPlayerId]: null
    };

    state.G.core.phase = "normal";
    state.G.core.turn.currentPlayerId = currentPlayerId;
    state.G.core.turn.phase = "robberDiscard";
    state.G.core.turn.hasRolled = true;
    state.G.core.turn.pendingDiscards = [discardingPlayerId];
    state.G.core.playerStateById[discardingPlayerId].resources = [
      "Wood",
      "Wood",
      "Brick",
      "Brick",
      "Sheep",
      "Wheat",
      "Ore",
      "Ore"
    ];
    state.G.core.playerStateById[currentPlayerId].resources = [];

    client.store.dispatch({ type: "SYNC", state });
    return client;
  };

  it("rollDice sends players to moveRobber when a 7 is rolled", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", nodes: {} }
      }
    ];
    const coreTopology = buildTopology(tiles);
    const events = { setStage: vi.fn() };
    const effects = { roll: vi.fn() };
    const random = { D6: vi.fn(() => [3, 4]) };
    const context = {
      G: { core: state, coreTopology, tiles },
      random,
      events,
      effects
    };

    rollDice.move(context);

    expect(events.setStage).toHaveBeenCalledWith("moveRobber");
  });

  it("moveRobber advances the core turn phase to postRoll", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.turn.phase = "robberMove";
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", nodes: {} }
      }
    ];
    const coreTopology = buildTopology(tiles);
    const events = { setStage: vi.fn() };
    const context = {
      G: { core: state, coreTopology },
      ctx: { currentPlayer: "0", activePlayers: { "0": { returnTo: "postRoll" } } },
      events,
      random: { Number: () => 0 }
    };

    moveRobber.move(context, 1);

    expect(state.turn.phase).toBe("postRoll");
    expect(events.setStage).toHaveBeenCalledWith("postRoll");
  });

  it("rollDice auto-skips robber move when no valid tile exists", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.robberTileId = 1;
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", nodes: {} }
      }
    ];
    const coreTopology = buildTopology(tiles);
    const events = { setStage: vi.fn() };
    const effects = { roll: vi.fn() };
    const context = {
      G: { core: state, coreTopology, tiles, gameLog: [], gameLogSeq: 0 },
      ctx: { currentPlayer: "0", activePlayers: { "0": "preRoll" } },
      random: { D6: vi.fn(() => [3, 4]) },
      events,
      effects
    };

    rollDice.move(context);

    expect(events.setStage).toHaveBeenCalledWith("postRoll");
    expect(state.turn.phase).toBe("postRoll");
    expect(context.G.gameLog.some((entry) => entry.type === "robber:skip")).toBe(true);
  });

  it("autoMoveRobber skips illegal robber tiles", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.ruleset.friendlyRobber = { enabled: true, vpThreshold: 2 };
    state.robberTileId = 99;
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", nodes: { a: 10 } }
      },
      {
        coordinate: [1, 0, -1],
        type: TileTypes.LAND,
        tile: { id: 2, resource: "Brick", nodes: {} }
      }
    ];
    const coreTopology = buildTopology(tiles);
    state.buildingsByNodeId[10] = { ownerId: "0", type: "settlement" };

    const events = { setStage: vi.fn() };
    const context = {
      G: { core: state, coreTopology, tiles },
      ctx: { currentPlayer: "1", activePlayers: { "1": "moveRobber" } },
      random: { Number: () => 0, Shuffle: (arr) => arr },
      events,
      log: { setMetadata: vi.fn() }
    };

    autoMoveRobber.move(context);

    expect(state.robberTileId).toBe(2);
  });

  it("autoMoveRobber advances when no legal robber tile exists", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.turn.phase = "robberMove";
    state.robberTileId = 1;
    const tiles = [
      {
        coordinate: [0, 0, 0],
        type: TileTypes.LAND,
        tile: { id: 1, resource: "Wood", nodes: {} }
      }
    ];
    const coreTopology = buildTopology(tiles);
    const events = { setStage: vi.fn() };
    const context = {
      G: { core: state, coreTopology, tiles, gameLog: [], gameLogSeq: 0 },
      ctx: { currentPlayer: "1", activePlayers: { "1": "moveRobber" } },
      random: { Number: () => 0, Shuffle: (arr) => arr },
      events,
      log: { setMetadata: vi.fn() }
    };

    autoMoveRobber.move(context);

    expect(events.setStage).toHaveBeenCalledWith("postRoll");
    expect(state.turn.phase).toBe("postRoll");
    expect(context.G.gameLog.some((entry) => entry.type === "robber:skip")).toBe(true);
  });

  it("hands robber movement back to the current player after the last out-of-turn discard", () => {
    const client = seedDiscardClient({
      currentPlayerId: "1",
      discardingPlayerId: "0"
    });

    client.moves.discardResources(["Wood", "Wood", "Brick", "Brick"]);

    const after = client.getState();
    expect(after.G.core.turn.phase).toBe("robberMove");
    expect(after.ctx.currentPlayer).toBe("1");
    expect(after.ctx.activePlayers?.["1"]).toBe("moveRobber");
    expect(after.ctx.activePlayers?.["0"]).not.toBe("moveRobber");
  });

  it("allows pending players to discard in any order before returning robber control to the roller", () => {
    const client = Client({ game: Catan, numPlayers: 3, playerID: "2" });
    const state = JSON.parse(JSON.stringify(client.getState()));

    state.ctx.phase = "main";
    state.ctx.currentPlayer = "1";
    state.ctx.playOrder = ["0", "1", "2"];
    state.ctx.playOrderPos = 1;
    state.ctx.activePlayers = {
      "0": "robberDiscard",
      "1": null,
      "2": "robberDiscard"
    };

    state.G.core.phase = "normal";
    state.G.core.turn.currentPlayerId = "1";
    state.G.core.turn.phase = "robberDiscard";
    state.G.core.turn.hasRolled = true;
    state.G.core.turn.pendingDiscards = ["0", "2"];
    state.G.core.playerStateById["0"].resources = [
      "Wood",
      "Wood",
      "Brick",
      "Brick",
      "Sheep",
      "Wheat",
      "Ore",
      "Ore"
    ];
    state.G.core.playerStateById["1"].resources = [];
    state.G.core.playerStateById["2"].resources = [
      "Wood",
      "Brick",
      "Brick",
      "Sheep",
      "Sheep",
      "Wheat",
      "Ore",
      "Ore"
    ];

    client.store.dispatch({ type: "SYNC", state });

    client.moves.discardResources(["Wood", "Brick", "Brick", "Sheep"]);

    const afterFirstDiscard = client.getState();
    expect(afterFirstDiscard.G.core.turn.pendingDiscards).toEqual(["0"]);
    expect(afterFirstDiscard.G.core.turn.phase).toBe("robberDiscard");
    expect(afterFirstDiscard.ctx.activePlayers?.["0"]).toBe("robberDiscard");
    expect(afterFirstDiscard.ctx.activePlayers?.["1"]).not.toBe("moveRobber");

    client.updatePlayerID("0");
    client.moves.discardResources(["Wood", "Wood", "Brick", "Brick"]);

    const afterLastDiscard = client.getState();
    expect(afterLastDiscard.G.core.turn.pendingDiscards).toEqual([]);
    expect(afterLastDiscard.G.core.turn.phase).toBe("robberMove");
    expect(afterLastDiscard.ctx.currentPlayer).toBe("1");
    expect(afterLastDiscard.ctx.activePlayers?.["1"]).toBe("moveRobber");
    expect(afterLastDiscard.ctx.activePlayers?.["0"]).not.toBe("moveRobber");
    expect(afterLastDiscard.ctx.activePlayers?.["2"]).not.toBe("robberDiscard");
  });
});
