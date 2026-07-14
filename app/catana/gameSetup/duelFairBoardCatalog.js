import {
  generateBoard,
  makeDeterministicRng,
  resolveBoardConfig
} from "@settlex/game-core";
import { DUEL_FAIR_BOARD_CATALOG } from "./catalogs/duelFairOfficialV1.generated";

export const selectDuelFairBoard = (randomValue) => {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error(
      "randomValue must be a finite number from 0 up to, but not including, 1"
    );
  }
  const index = Math.floor(
    randomValue * DUEL_FAIR_BOARD_CATALOG.seeds.length
  );
  return Object.freeze({
    catalogId: DUEL_FAIR_BOARD_CATALOG.id,
    rank: index + 1,
    seed: DUEL_FAIR_BOARD_CATALOG.seeds[index],
    generatorFamily: DUEL_FAIR_BOARD_CATALOG.generatorFamily,
    generatorVersion: DUEL_FAIR_BOARD_CATALOG.generatorVersion,
    evaluatorVersion: DUEL_FAIR_BOARD_CATALOG.evaluatorVersion,
    evaluatorIdentity: DUEL_FAIR_BOARD_CATALOG.evaluatorIdentity
  });
};

export const generateDuelFairBoard = (selection) =>
  generateBoard(
    resolveBoardConfig("standard-official-spiral"),
    makeDeterministicRng(selection.seed)
  );
