import { BOARD_FAMILIES } from "../constants.mjs";
import { generateFreeformRandom } from "./freeformRandom.mjs";
import { generateOfficialSpiral } from "./officialSpiral.mjs";

export { BOARD_FAMILIES } from "../constants.mjs";

export function generateCandidate({ family, seed }) {
  if (!Number.isInteger(seed)) throw new Error("seed must be an integer");

  if (family === BOARD_FAMILIES.OFFICIAL_SPIRAL) {
    return generateOfficialSpiral(seed);
  }

  if (family === BOARD_FAMILIES.FREEFORM_RANDOM) {
    return generateFreeformRandom(seed);
  }

  throw new Error(`Unknown board family: ${family}`);
}
