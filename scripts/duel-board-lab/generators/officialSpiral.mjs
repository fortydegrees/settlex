import {
  generateBoard,
  makeDeterministicRng,
  resolveBoardConfig
} from "@settlex/game-core";
import { BOARD_FAMILIES, GENERATOR_VERSIONS } from "../constants.mjs";

export function generateOfficialSpiral(seed) {
  return {
    family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
    generatorVersion: GENERATOR_VERSIONS[BOARD_FAMILIES.OFFICIAL_SPIRAL],
    seed,
    tiles: generateBoard(
      resolveBoardConfig("standard-official"),
      makeDeterministicRng(seed)
    )
  };
}
