import { describe, expect, it } from "vitest";
import { ServerCatan, SocketCatan } from "../serverGame";

const DEBUG_MOVE_NAMES = [
  "DEBUG_loadState",
  "DEBUG_setScenario",
  "DEBUG_takeCardsFromBank"
];

const SERVER_ONLY_MOVE_NAMES = [
  "resolveDisconnectForfeit",
  "resolveIdleForfeit",
  "autoStartGame"
];

const getStageMoveMaps = (game) => [
  game.phases.preGame.turn.stages.waiting.moves,
  game.phases.placement.turn.stages.settlement.moves,
  game.phases.placement.turn.stages.road.moves,
  game.phases.main.turn.stages.preRoll.moves,
  game.phases.main.turn.stages.robberDiscard.moves,
  game.phases.main.turn.stages.postRoll.moves,
  game.phases.main.turn.stages.moveRobber.moves,
  game.phases.main.turn.stages.devCardChoice.moves
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

  it("keeps effects plugin wiring available for move context", () => {
    expect(Array.isArray(ServerCatan.plugins)).toBe(true);
    expect(ServerCatan.plugins.length).toBeGreaterThan(0);
  });
});

describe("SocketCatan config", () => {
  it("keeps server-only moves out of the socket-facing game", () => {
    for (const moveName of SERVER_ONLY_MOVE_NAMES) {
      expect(SocketCatan.moves?.[moveName]).toBeUndefined();
      for (const stageMoves of getStageMoveMaps(SocketCatan)) {
        expect(stageMoves?.[moveName]).toBeUndefined();
      }
    }
  });

  it("still exposes resign to players", () => {
    expect(
      SocketCatan.phases.main.turn.stages.postRoll.moves.resign
    ).toBeDefined();
  });

  it("keeps server moves available on the privileged def", () => {
    for (const moveName of ["resolveDisconnectForfeit", "resolveIdleForfeit"]) {
      expect(ServerCatan.moves?.[moveName]).toBeDefined();
    }
    expect(
      ServerCatan.phases.preGame.turn.stages.waiting.moves.autoStartGame
    ).toBeDefined();
  });
});
