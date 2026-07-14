import {
  generateBoard,
  makeDeterministicRng,
  resolveBoardConfig
} from "@settlex/game-core";
import { BOARD_FAMILIES, GENERATOR_VERSIONS } from "../constants.mjs";

export function generateFreeformRandom(seed) {
  return {
    family: BOARD_FAMILIES.FREEFORM_RANDOM,
    generatorVersion: GENERATOR_VERSIONS[BOARD_FAMILIES.FREEFORM_RANDOM],
    seed,
    tiles: generateBoard(
      resolveBoardConfig("standard-random"),
      makeDeterministicRng(seed)
    )
  };
}
