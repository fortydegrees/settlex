import { describe, expect, it } from "vitest";
import { ServerCatan } from "../serverGame";

const DEBUG_MOVE_NAMES = [
  "DEBUG_loadState",
  "DEBUG_setScenario",
  "DEBUG_takeCardsFromBank"
];

const getStageMoveMaps = (game) => [
  game.phases.preGame.turn.stages.waiting.moves,
  game.phases.placement.turn.stages.settlement.moves,
  game.phases.placement.turn.stages.road.moves,
  game.phases.main.turn.stages.preRoll.moves,
  game.phases.main.turn.stages.robberDiscard.moves,
  game.phases.main.turn.stages.postRoll.moves,
  game.phases.main.turn.stages.moveRobber.moves
];

describe("ServerCatan config", () => {
  it("never exposes debug moves", () => {
    for (const moveName of DEBUG_MOVE_NAMES) {
      expect(ServerCatan.moves?.[moveName]).toBeUndefined();
      for (const stageMoves of getStageMoveMaps(ServerCatan)) {
        expect(stageMoves?.[moveName]).toBeUndefined();
      }
    }
  });

  it("does not register client-only effects plugins", () => {
    expect(ServerCatan.plugins ?? []).toEqual([]);
  });
});
