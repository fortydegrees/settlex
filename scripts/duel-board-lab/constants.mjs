import { ResourceType } from "@settlex/game-core";
import { DUEL_FAIR_V2_PROFILE } from "./analysis/duelFairV2Profile.mjs";
import { hashOpeningProfile } from "./analysis/openingPolicy.mjs";

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

export const EVALUATOR_VERSIONS = Object.freeze({
  V1: "duel-fair-v1",
  V2: "duel-fair-v2"
});

export const EVALUATOR_VERSION = EVALUATOR_VERSIONS.V1;

export const DUEL_FAIR_V2_IDENTITY = Object.freeze({
  featureVersion: DUEL_FAIR_V2_PROFILE.featureVersion,
  policyVersion: DUEL_FAIR_V2_PROFILE.policyVersion,
  profileHash: hashOpeningProfile(DUEL_FAIR_V2_PROFILE)
});
