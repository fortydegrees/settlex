import { describe, expect, it, vi } from "vitest";

const DEBUG_MOVE_NAMES = [
  "DEBUG_loadState",
  "DEBUG_setScenario",
  "DEBUG_takeCardsFromBank"
];

const loadCatanForEnv = async (nodeEnv) => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  vi.resetModules();

  try {
    const { Catan } = await import("../Game");
    return Catan;
  } finally {
    process.env.NODE_ENV = previousEnv;
    vi.resetModules();
  }
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

describe("debug move exposure", () => {
  it("hides debug moves in production", async () => {
    const game = await loadCatanForEnv("production");

    for (const moveName of DEBUG_MOVE_NAMES) {
      expect(game.moves?.[moveName]).toBeUndefined();
      for (const stageMoves of getStageMoveMaps(game)) {
        expect(stageMoves?.[moveName]).toBeUndefined();
      }
    }
  });

  it("keeps debug moves outside production", async () => {
    const game = await loadCatanForEnv("test");

    for (const moveName of DEBUG_MOVE_NAMES) {
      expect(game.moves?.[moveName]).toBeDefined();
      expect(
        getStageMoveMaps(game).some((stageMoves) => stageMoves?.[moveName])
      ).toBe(true);
    }
  });
});
