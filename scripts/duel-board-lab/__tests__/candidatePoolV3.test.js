import { ResourceType } from "@settlex/game-core";
import { describe, expect, it } from "vitest";
import { buildBoardContextV3 } from "../analysis/boardContextV3.mjs";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { selectCandidatePoolV3 } from "../analysis/candidatePoolV3.mjs";
import { DUEL_FAIR_V3_PROFILE } from "../analysis/duelFairV3Profile.mjs";
import { buildSettlementFeaturesV3 } from "../analysis/settlementFeaturesV3.mjs";
import { BOARD_FAMILIES, STANDARD_RESOURCES } from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";

function realPool(seed) {
  const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed }).tiles;
  const facts = buildBoardFacts(tiles);
  const context = buildBoardContextV3(facts, DUEL_FAIR_V3_PROFILE);
  const settlementFeatures = buildSettlementFeaturesV3(facts, context, DUEL_FAIR_V3_PROFILE);
  return selectCandidatePoolV3({ facts, settlementFeatures, profile: DUEL_FAIR_V3_PROFILE });
}

function syntheticFeature(nodeId, value) {
  return {
    nodeId,
    scarcityWeightedProduction: value,
    recipeOpportunity: value,
    roadLens: value,
    settlementLens: value,
    cityLens: value,
    devLens: value,
    portValue: value,
    expansionLens: value,
    denialLens: value,
    resourceLens: Object.fromEntries(STANDARD_RESOURCES.map((resource) => [resource, value]))
  };
}

describe("duel-fair-v3 candidate pool", () => {
  it.each([47, 2604])("is deterministic, covered, and bounded for seed %i", (seed) => {
    const first = realPool(seed);
    const second = realPool(seed);

    expect(second).toEqual(first);
    expect(first.nodeIds.length).toBeLessThanOrEqual(16);
    expect(first.fallbackUsed).toBe(false);
    expect(first.fallbackLine).toBeNull();
    expect(Object.keys(first.championsByLens)).toEqual([
      "broad",
      "road",
      "settlement",
      "city",
      "dev",
      ...STANDARD_RESOURCES.map((resource) => `resource:${resource}`),
      "port",
      "expansion",
      "denial"
    ]);
    expect(first.nodeIds).toContain(first.championsByLens[`resource:${ResourceType.WHEAT}`]);
  });

  it("adds a stable legal line when the initial champions cannot complete a draft", () => {
    const nodes = Array.from({ length: 8 }, (_, nodeId) => ({
      nodeId,
      blockedNodeIds: nodeId < 4 ? [0, 1, 2, 3] : [nodeId]
    }));
    const facts = { nodes };
    const settlementFeatures = nodes.map((node) => syntheticFeature(node.nodeId, 8 - node.nodeId));
    const profile = {
      ...DUEL_FAIR_V3_PROFILE,
      candidateLimit: 4,
      fallbackCandidateLimit: 8
    };

    const result = selectCandidatePoolV3({ facts, settlementFeatures, profile });

    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackLine).toEqual([0, 4, 5, 6]);
    expect(result.nodeIds).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
