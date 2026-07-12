import { ResourceType } from "@settlex/game-core";

export const BOARD_FAMILIES = Object.freeze({
  OFFICIAL_SPIRAL: "official-spiral",
  FREEFORM_RANDOM: "freeform-random"
});

export const GENERATOR_VERSIONS = Object.freeze({
  [BOARD_FAMILIES.OFFICIAL_SPIRAL]: "official-spiral-v1",
  [BOARD_FAMILIES.FREEFORM_RANDOM]: "freeform-random-v1"
});

export const STANDARD_RESOURCES = Object.freeze([
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
]);

export const EVALUATOR_VERSION = "duel-fair-v1";
