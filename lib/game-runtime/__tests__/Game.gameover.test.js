import { describe, expect, it } from "vitest";
import {
  CreateGameReducer,
  InitializeGame
} from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../Game";

const game = createCatanGame({
  includeDebugMoves: true,
  includeEffects: false
});

const makeMove = (type, args, playerID) => ({
  type: "MAKE_MOVE",
  payload: { type, args, playerID }
});

describe("game-level end", () => {
  it("sets ctx.gameover when a win lands in G.core.gameOver", () => {
    const reducer = CreateGameReducer({ game, isClient: false });
    let state = InitializeGame({ game, numPlayers: 2 });

    const wonG = structuredClone(state.G);
    wonG.core.gameOver = { winnerId: "0", reason: "victoryPoints" };

    state = reducer(state, makeMove("DEBUG_loadState", [{ G: wonG }], "0"));

    expect(state.G.core.gameOver).toEqual({
      winnerId: "0",
      reason: "victoryPoints"
    });
    expect(state.ctx.gameover).toEqual({
      winnerId: "0",
      reason: "victoryPoints"
    });
  });
});
