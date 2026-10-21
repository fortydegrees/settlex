import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Client } from "boardgame.io/dist/cjs/client.js";
import { InitializeGame } from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../../lib/game-runtime/Game.js";
import { SettleGraphV2Client } from "../bots/SettleGraphV2Client.js";
import { SettleGraphV2BotManager } from "../bots/settleGraphV2BotManager.js";

const RUN_NATIVE = process.env.SETTLEX_RUN_SETTLEGRAPH_V2_E2E === "1";
const GAME = {
  ...createCatanGame({ includeDebugMoves: false, includeEffects: false }),
  seed: "knight-robber-regression"
};

function seedKnightClient(stage, { nativeRules = false } = {}) {
  const client = Client({
    game: GAME,
    numPlayers: 2,
    playerID: "1"
  });
  const state = JSON.parse(JSON.stringify(InitializeGame({
    game: GAME,
    numPlayers: 2,
    setupData: {
      modeId: "duel",
      rulesetId: "duel",
      boardSourceId: "settlegraph-v2-native-v1"
    }
  })));
  state.ctx.phase = "main";
  state.ctx.currentPlayer = "1";
  state.ctx.playOrder = ["0", "1"];
  state.ctx.playOrderPos = 1;
  state.ctx.activePlayers = { "1": stage };
  const core = state.G.core;
  core.phase = "normal";
  core.turn.currentPlayerId = "1";
  core.turn.phase = stage;
  core.turn.hasRolled = stage === "postRoll";
  core.turn.lastRollTotal = stage === "postRoll" ? 8 : null;
  core.ruleset.friendlyRobber.enabled = nativeRules;
  core.buildingsByNodeId = {
    35: { ownerId: "1", type: "settlement" },
    46: { ownerId: "0", type: "city" }
  };
  core.playerStateById["1"].settlementsRemaining = 4;
  core.playerStateById["0"].citiesRemaining = 3;
  if (nativeRules) {
    core.buildingsByNodeId[48] = { ownerId: "0", type: "settlement" };
    core.playerStateById["0"].settlementsRemaining = 4;
  }
  core.playerStateById["0"].resources = ["Wood"];
  core.bank.resources.splice(core.bank.resources.indexOf("Wood"), 1);
  core.playerStateById["1"].devCards = ["knight"];
  core.devDeck.splice(core.devDeck.indexOf("knight"), 1);
  client.store.dispatch({ type: "SYNC", state });
  return client;
}

describe("knight robber phase integration", () => {
  it.each(["preRoll", "postRoll"])(
    "resolves a %s knight and theft through legal moves, then restores the turn",
    (stage) => {
      const client = seedKnightClient(stage);
      client.moves.playDevCardStart("knight");
      const moving = client.store.getState();
      expect(moving.ctx.activePlayers["1"]).toBe("moveRobber");
      expect(moving.G.core.turn.phase).toBe("robberMove");
      expect(moving.G.robberReturnToStage).toBe(stage);
      expect(moving.G.core.playerStateById["1"].devCards).toEqual([]);
      expect(moving.G.core.playerStateById["1"].knightsPlayed).toBe(1);

      const target = moving.G.tiles.find(({ type, tile }) =>
        type === "Land" && tile.id !== moving.G.core.robberTileId &&
        Object.values(tile.nodes).includes(46)
      ).tile.id;
      client.moves.moveRobber(target);
      const resolved = client.store.getState();
      expect(resolved._stateID).toBe(moving._stateID + 1);
      expect(resolved.G.core.robberTileId).toBe(target);
      expect(resolved.G.core.playerStateById["1"].resources).toEqual(["Wood"]);
      expect(resolved.G.core.playerStateById["0"].resources).toEqual([]);
      expect(resolved.ctx.activePlayers["1"]).toBe(stage);
      expect(resolved.G.core.turn.phase).toBe(stage);
      expect(resolved.G.core.turn.hasRolled).toBe(stage === "postRoll");
      expect(resolved.G.robberReturnToStage).toBeNull();
      expect(resolved.G.gameLog.filter(({ type }) => type.startsWith("robber:")))
        .toMatchObject([
          { type: "robber:move" },
          { type: "robber:steal" }
        ]);
      expect(resolved.G.gameLog.some(({ forced }) => forced)).toBe(false);

      if (stage === "preRoll") {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
          client.moves.endTurn();
          expect(client.store.getState()._stateID).toBe(resolved._stateID);
        } finally {
          error.mockRestore();
        }
        client.moves.rollDice();
        expect(client.store.getState().G.core.turn.hasRolled).toBe(true);
        expect(client.store.getState()._stateID).toBe(resolved._stateID + 1);
      } else {
        client.moves.endTurn();
        expect(client.store.getState().ctx.currentPlayer).toBe("0");
      }
    }
  );

  it.each(["preRoll", "postRoll"])(
    "restores %s immediately when a knight has no robber destination",
    (stage) => {
      const client = seedKnightClient(stage);
      const state = JSON.parse(JSON.stringify(client.store.getState()));
      state.G.tiles = state.G.tiles.filter(({ tile }) => tile.id === state.G.core.robberTileId);
      client.store.dispatch({ type: "SYNC", state });
      client.moves.playDevCardStart("knight");
      const after = client.store.getState();
      expect(after.ctx.activePlayers["1"]).toBe(stage);
      expect(after.G.core.turn.phase).toBe(stage);
      expect(after.G.core.turn.hasRolled).toBe(stage === "postRoll");
      expect(after.G.robberReturnToStage).toBeNull();
      expect(after.G.gameLog.at(-1)).toMatchObject({ type: "robber:skip" });
      expect(after.G.gameLog.at(-1).forced).toBeFalsy();
    }
  );

  it("preserves friendly robber protection after a knight", () => {
    const client = seedKnightClient("postRoll");
    const state = JSON.parse(JSON.stringify(client.store.getState()));
    state.G.core.ruleset.friendlyRobber.enabled = true;
    client.store.dispatch({ type: "SYNC", state });
    client.moves.playDevCardStart("knight");
    const moving = client.store.getState();
    const protectedTile = moving.G.tiles.find(({ type, tile }) =>
      type === "Land" && Object.values(tile.nodes).includes(46)
    ).tile.id;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      client.moves.moveRobber(protectedTile);
      expect(client.store.getState()._stateID).toBe(moving._stateID);
      expect(client.store.getState().G.core.robberTileId).toBe(moving.G.core.robberTileId);
    } finally {
      error.mockRestore();
    }
    expect(client.store.getState().G.core.turn.phase).toBe("robberMove");
  });

  it("preserves a knight's largest army victory", () => {
    const client = seedKnightClient("preRoll");
    const state = JSON.parse(JSON.stringify(client.store.getState()));
    state.G.core.playerStateById["1"].knightsPlayed = 2;
    state.G.core.ruleset.victoryPointsToWin = 3;
    client.store.dispatch({ type: "SYNC", state });
    client.moves.playDevCardStart("knight");
    const after = client.store.getState();
    expect(after.G.core.awards.largestArmyOwnerId).toBe("1");
    expect(after.G.core.playerStateById["1"].knightsPlayed).toBe(3);
    expect(after.G.core.gameOver).toEqual({ winnerId: "1", reason: "victoryPoints" });
    expect(after.ctx.gameover).toEqual({ winnerId: "1", reason: "victoryPoints" });
  });
});

describe("knight robber native worker integration", () => {
  it.runIf(RUN_NATIVE).each(["preRoll", "postRoll"])(
    "chooses an accepted robber move after a %s knight without a timeout",
    async (stage) => {
      const client = seedKnightClient(stage, { nativeRules: true });
      const worker = new SettleGraphV2Client({
        workerPath: process.env.SETTLEX_SETTLEGRAPH_V2_WORKER ??
          path.resolve("native/settlegraph-v2/target/release/settlegraph-v2-worker"),
        modelPath: process.env.SETTLEX_SETTLEGRAPH_V2_MODEL,
        timeoutMs: 10_000
      });
      const manager = new SettleGraphV2BotManager({ client: worker });
      try {
        client.moves.playDevCardStart("knight");
        const moving = client.store.getState();
        const plan = await manager.chooseMoves(moving, "1");
        expect(plan).toEqual([{ move: "moveRobber", args: [expect.any(Number)] }]);
        client.moves[plan[0].move](...plan[0].args);
        const resolved = client.store.getState();
        expect(resolved._stateID).toBe(moving._stateID + 1);
        expect(resolved.G.core.robberTileId).toBe(plan[0].args[0]);
        expect(resolved.ctx.activePlayers["1"]).toBe(stage);
        expect(resolved.G.core.turn.phase).toBe(stage);
        expect(resolved.G.gameLog.find(({ type }) => type === "robber:move").forced).toBeFalsy();
        expect(resolved.G.gameLog.some(({ type }) => type.startsWith("forced:"))).toBe(false);
        if (stage === "preRoll") {
          expect(await manager.chooseMoves(resolved, "1"))
            .toEqual([{ move: "rollDice", args: [] }]);
        }
      } finally {
        manager.close();
      }
    },
    20_000
  );
});
