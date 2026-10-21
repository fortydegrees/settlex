import { ResourceType } from "@settlex/game-core";
import { describe, expect, it } from "vitest";
import { buildBoardContextV3 } from "../analysis/boardContextV3.mjs";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { DUEL_FAIR_V3_PROFILE } from "../analysis/duelFairV3Profile.mjs";
import {
  compileOpeningPairV3,
  materialiseOpeningPairV3
} from "../analysis/openingPortfolioV3.mjs";
import { buildSettlementFeaturesV3 } from "../analysis/settlementFeaturesV3.mjs";
import { BOARD_FAMILIES } from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";

function setup(seed = 47) {
  const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed }).tiles;
  const facts = buildBoardFacts(tiles);
  const context = buildBoardContextV3(facts, DUEL_FAIR_V3_PROFILE);
  const settlementFeatures = buildSettlementFeaturesV3(facts, context, DUEL_FAIR_V3_PROFILE);
  const featuresByNodeId = new Map(settlementFeatures.map((feature) => [feature.nodeId, feature]));
  return { facts, context, settlementFeatures, featuresByNodeId };
}

function compile(setupResult, orderedNodeIds) {
  return compileOpeningPairV3({
    ...setupResult,
    orderedNodeIds,
    profile: DUEL_FAIR_V3_PROFILE
  });
}

describe("duel-fair-v3 settlement features", () => {
  it("precomputes all 54 nodes with expansion, denial, city, and robber facts", () => {
    const { settlementFeatures } = setup(2604);

    expect(settlementFeatures).toHaveLength(54);
    expect(settlementFeatures.map((feature) => feature.nodeId))
      .toEqual([...settlementFeatures.map((feature) => feature.nodeId)].sort((a, b) => a - b));
    expect(settlementFeatures.some((feature) => feature.denialLens > 0)).toBe(true);
    expect(settlementFeatures.some((feature) => feature.bestOneRoadGain > 0)).toBe(true);
    expect(settlementFeatures.every((feature) => Number.isFinite(feature.worstSingleTileLoss)))
      .toBe(true);
  });
});

describe("duel-fair-v3 opening portfolios", () => {
  it("rewards complementary wood and brick over stranded wood", () => {
    const board = setup(47);
    const roadCapable = compile(board, [0, 23]);
    const strandedWood = compile(board, [0, 14]);

    expect(roadCapable.staticComponents.recipeReadiness)
      .toBeGreaterThan(strandedWood.staticComponents.recipeReadiness);
  });

  it("counts only the second settlement's resources as starting cards", () => {
    const board = setup(47);
    const forward = compile(board, [0, 23]);
    const reverse = compile(board, [23, 0]);

    expect(forward.portfolio.startingCards).toEqual([
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WHEAT
    ]);
    expect(reverse.portfolio.productionPips).toEqual(forward.portfolio.productionPips);
    expect(reverse.staticComponents.startingTempo).not.toBe(forward.staticComponents.startingTempo);
  });

  it("credits owned-port conversion without erasing the direct recipe shortage", () => {
    const board = setup(47);
    const withPort = compile(board, [3, 23]);
    const factsWithoutPort = {
      ...board.facts,
      nodes: board.facts.nodes.map((node) => node.nodeId === 3 ? { ...node, port: null } : node)
    };
    const withoutPort = compile({ ...board, facts: factsWithoutPort }, [3, 23]);

    expect(withPort.staticComponents.tradeAndPorts)
      .toBeGreaterThan(withoutPort.staticComponents.tradeAndPorts);
    expect(withPort.staticComponents.recipeReadiness).toBeLessThan(100);
  });

  it("conditions city uplift on city-resource capacity", () => {
    const board = setup(47);
    const cityCapable = compile(board, [0, 23]);
    const highPipsWithoutOre = compile(board, [7, 20]);

    expect(cityCapable.staticComponents.cityPotential)
      .toBeGreaterThan(highPipsWithoutOre.staticComponents.cityPotential);
  });

  it("materialises expansion and resilience on the selected four-node matchup", () => {
    const board = setup(47);
    const entry = compile(board, [0, 23]);
    const result = materialiseOpeningPairV3({
      ...board,
      entry,
      opponentEntry: compile(board, [6, 44]),
      occupiedNodeIds: [0, 6, 44, 23],
      profile: DUEL_FAIR_V3_PROFILE
    });

    expect(result.components.expansion).toBeGreaterThanOrEqual(0);
    expect(result.components.resilience).toBeGreaterThanOrEqual(0);
    expect(result.components.resilience).toBeLessThanOrEqual(100);
    expect(result.value).toBeGreaterThan(0);
  });
});
