import { describe, expect, it, vi } from "vitest";
import { createEmptyState } from "@settlex/game-core";
import { Catan } from "../Game";
import { resign, resolveDisconnectForfeit } from "../Moves";
import { ServerCatan } from "../../../server/serverGame";

const makeContext = ({ playerID = "0" } = {}) => {
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
      turn: 3
    },
    playerID,
    events: {
      endGame: vi.fn()
    }
  };
};

const getStageMoveMaps = (game) => [
  game.phases.preGame.turn.stages.waiting.moves,
  game.phases.placement.turn.stages.settlement.moves,
  game.phases.placement.turn.stages.road.moves,
  game.phases.main.turn.stages.preRoll.moves,
  game.phases.main.turn.stages.robberDiscard.moves,
  game.phases.main.turn.stages.postRoll.moves,
  game.phases.main.turn.stages.moveRobber.moves
];

describe("terminal match moves", () => {
  it("resign awards the win to the opponent and logs game over", () => {
    const context = makeContext({ playerID: "0" });

    resign.move(context);

    expect(context.G.core.gameOver).toEqual({
      winnerId: "1",
      reason: "Resignation"
    });
    expect(context.events.endGame).toHaveBeenCalledWith({
      winnerId: "1",
      reason: "Resignation"
    });
    expect(context.G.gameLog).toEqual([
      expect.objectContaining({
        type: "server:resign",
        actorId: "system",
        data: {
          playerId: "0",
          winnerId: "1"
        }
      }),
      expect.objectContaining({
        type: "game:over",
        actorId: "1",
        data: {
          winnerId: "1",
          reason: "Resignation"
        }
      })
    ]);
  });

  it("resolveDisconnectForfeit awards the win to the connected opponent", () => {
    const context = makeContext({ playerID: "1" });

    resolveDisconnectForfeit.move(context);

    expect(context.G.core.gameOver).toEqual({
      winnerId: "0",
      reason: "Disconnect Forfeit"
    });
    expect(context.events.endGame).toHaveBeenCalledWith({
      winnerId: "0",
      reason: "Disconnect Forfeit"
    });
    expect(context.G.gameLog).toEqual([
      expect.objectContaining({
        type: "game:over",
        actorId: "0",
        data: {
          winnerId: "0",
          reason: "Disconnect Forfeit"
        }
      })
    ]);
  });

  it("keeps disconnect forfeit server-only while exposing resign to both configs", () => {
    expect(Catan.moves?.resign).toBeDefined();
    expect(Catan.moves?.resolveDisconnectForfeit).toBeUndefined();
    expect(ServerCatan.moves?.resign).toBeDefined();
    expect(ServerCatan.moves?.resolveDisconnectForfeit).toBeDefined();
  });

  it("exposes resign in every live stage move map", () => {
    for (const stageMoves of getStageMoveMaps(Catan)) {
      expect(stageMoves?.resign).toBeDefined();
    }
    for (const stageMoves of getStageMoveMaps(ServerCatan)) {
      expect(stageMoves?.resign).toBeDefined();
    }
  });

  it("exposes disconnect forfeit in every server live stage move map", () => {
    for (const stageMoves of getStageMoveMaps(ServerCatan)) {
      expect(stageMoves?.resolveDisconnectForfeit).toBeDefined();
    }
  });
});
