import { describe, expect, it } from "vitest";
import {
  CreateGameReducer,
  InitializeGame
} from "boardgame.io/dist/cjs/internal.js";
import { ResourceType } from "@settlex/game-core";
import { createCatanGame } from "../Game";

const game = createCatanGame({
  includeDebugMoves: false,
  includeEffects: false
});

const makeMove = (type, args, playerID) => ({
  type: "MAKE_MOVE",
  payload: { type, args, playerID }
});

const enterMainStage = (state, stage) => ({
  ...state,
  ctx: {
    ...state.ctx,
    phase: "main",
    currentPlayer: "0",
    activePlayers: { "0": stage }
  }
});

describe("invalid moves are rejected instead of committed as no-ops", () => {
  it("rejects an illegal settlement placement without consuming a state id", () => {
    const reducer = CreateGameReducer({ game, isClient: false });
    let state = InitializeGame({ game, numPlayers: 2 });

    state = reducer(state, makeMove("readyUp", [], "0"));
    state = reducer(state, makeMove("readyUp", [], "1"));
    expect(state.ctx.phase).toBe("placement");

    const actingPlayer = state.ctx.currentPlayer;
    const before = state._stateID;

    state = reducer(state, makeMove("placeSettlement", [-999], actingPlayer));
    expect(state._stateID).toBe(before);
    expect(Object.keys(state.G.core.buildingsByNodeId)).toHaveLength(0);

    const validNode = state.G.valids.nodes[0];
    expect(validNode).toBeDefined();
    state = reducer(
      state,
      makeMove("placeSettlement", [validNode], actingPlayer)
    );
    expect(state._stateID).toBe(before + 1);
    expect(Object.keys(state.G.core.buildingsByNodeId)).toContain(
      String(validNode)
    );
  });

  it("rejects an invalid Year of Plenty choice without consuming a state id", () => {
    const reducer = CreateGameReducer({ game, isClient: false });
    let state = enterMainStage(
      InitializeGame({ game, numPlayers: 2 }),
      "devCardChoice"
    );
    state = {
      ...state,
      G: {
        ...state.G,
        core: {
          ...state.G.core,
          bank: {
            ...state.G.core.bank,
            resources: [
              ResourceType.WOOD,
              ResourceType.BRICK,
              ResourceType.ORE
            ]
          }
        },
        devCardPlay: {
          type: "yearOfPlenty",
          playerId: "0",
          startedFromStage: "postRoll"
        }
      }
    };
    const before = state._stateID;

    state = reducer(
      state,
      makeMove(
        "confirmDevCardPlay",
        [[ResourceType.WOOD, ResourceType.BRICK, ResourceType.ORE]],
        "0"
      )
    );

    expect(state._stateID).toBe(before);
    expect(state.G.devCardPlay).toMatchObject({
      type: "yearOfPlenty",
      playerId: "0"
    });
  });

  it("rejects a malformed maritime trade without consuming a state id", () => {
    const reducer = CreateGameReducer({ game, isClient: false });
    let state = enterMainStage(
      InitializeGame({ game, numPlayers: 2 }),
      "postRoll"
    );
    const before = state._stateID;

    state = reducer(state, makeMove("maritimeTrade", [null], "0"));

    expect(state._stateID).toBe(before);
  });

  it("keeps masked-state moves off the client", () => {
    const stages = game.phases.main.turn.stages;

    // These moves read state the playerView masks (dice deck, hidden hands),
    // so local prediction is meaningless and would log spurious invalid-move
    // errors once moves reject properly.
    expect(stages.preRoll.moves.rollDice.client).toBe(false);
    expect(stages.moveRobber.moves.moveRobber.client).toBe(false);
    expect(stages.devCardChoice.moves.confirmDevCardPlay.client).toBe(false);
  });
});
