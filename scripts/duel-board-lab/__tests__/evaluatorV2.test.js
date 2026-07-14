import { describe, expect, it } from "vitest";
import { ResourceType, TileTypes } from "@settlex/game-core";
import { readFileSync } from "node:fs";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { DUEL_FAIR_V2_PROFILE } from "../analysis/duelFairV2Profile.mjs";
import {
  buildDuelTags,
  classifySolvedOpening,
  evaluateDuelBoardV2
} from "../analysis/evaluateDuelBoardV2.mjs";
import { measurePlacementDepth } from "../analysis/placementDepth.mjs";
import { transformTiles } from "../analysis/symmetry.mjs";
import { generateCandidate, BOARD_FAMILIES } from "../generators/generateCandidate.mjs";

const readFixture = (name) => JSON.parse(readFileSync(
  new URL(`../fixtures/${name}.json`, import.meta.url),
  "utf8"
));

const RECIPES = Object.freeze(["road", "settlement", "devCard", "city"]);
const RESOURCES = Object.freeze([
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
]);
const CALIBRATION_FIXTURES = Object.freeze([
  "scarce-but-fair",
  "wheat-monopoly",
  "dominant-settlement",
  "varied-openings",
  "first-pick-sensitive",
  "second-pick-sensitive",
  "official-seed-47-p1-dominance",
  "official-seed-2604-strategic-denial"
]);

function stableCalibrationSummary(report) {
  return {
    evaluatorIdentity: report.evaluatorIdentity,
    screenVerdict: report.screenVerdict,
    fairness: {
      verdict: report.fairness.verdict,
      favouredSeat: report.fairness.favouredSeat,
      normalisedSeatAdvantage: Number(report.fairness.normalisedSeatAdvantage.toFixed(6)),
      solvedLine: report.fairness.solvedLine,
      portfolios: report.fairness.portfolios
    },
    quality: report.quality,
    placementDepth: report.placementDepth,
    rankingComponents: report.rankingComponents,
    tags: report.tags,
    overallScore: report.overallScore == null ? null : Number(report.overallScore.toFixed(4))
  };
}

function symmetryScalars(report) {
  const {
    greedySeatAdvantage,
    greedyNormalisedSeatAdvantage,
    greedyRegret,
    meaningfulFirstPickCount,
    meaningfulResponseCount,
    forcedDefence,
    lineSensitivity
  } = report.placementDepth;
  return {
    evaluatorIdentity: report.evaluatorIdentity,
    screenVerdict: report.screenVerdict,
    fairnessVerdict: report.fairness.verdict,
    favouredSeat: report.fairness.favouredSeat,
    normalisedSeatAdvantage: Number(report.fairness.normalisedSeatAdvantage.toFixed(6)),
    quality: report.quality,
    placementDepth: {
      greedySeatAdvantage,
      greedyNormalisedSeatAdvantage,
      greedyRegret,
      meaningfulFirstPickCount,
      meaningfulResponseCount,
      forcedDefence,
      lineSensitivity
    },
    tags: report.tags,
    overallScore: report.overallScore == null ? null : Number(report.overallScore.toFixed(4))
  };
}

function expectLegalSolvedLine(tiles, solvedLine) {
  const nodesById = new Map(buildBoardFacts(tiles).nodes.map((node) => [node.nodeId, node]));
  expect(solvedLine.map((pick) => pick.player)).toEqual(["P1", "P2", "P2", "P1"]);
  expect(new Set(solvedLine.map((pick) => pick.nodeId))).toHaveProperty("size", 4);
  for (let leftIndex = 0; leftIndex < solvedLine.length; leftIndex += 1) {
    const left = nodesById.get(solvedLine[leftIndex].nodeId);
    expect(left).toBeDefined();
    for (let rightIndex = leftIndex + 1; rightIndex < solvedLine.length; rightIndex += 1) {
      const right = nodesById.get(solvedLine[rightIndex].nodeId);
      expect(right).toBeDefined();
      expect(left.blockedNodeIds).not.toContain(right.nodeId);
      expect(right.blockedNodeIds).not.toContain(left.nodeId);
    }
  }
}

const capacities = (value) => Object.fromEntries(RECIPES.map((recipe) => [recipe, value]));

function makePortfolio({
  productionPips = Object.fromEntries(RESOURCES.map((resource) => [resource, 4])),
  directRecipeCapacity = capacities(2),
  tradeAdjustedRecipeCapacity = directRecipeCapacity,
  readyRecipes = []
} = {}) {
  return {
    settlementNodeIds: [0, 4],
    productionPips: { ...productionPips },
    totalProductionPips: Object.values(productionPips).reduce((sum, value) => sum + value, 0),
    producedResourceCount: Object.values(productionPips).filter((value) => value > 0).length,
    missingProducedResources: RESOURCES.filter((resource) => productionPips[resource] === 0),
    startingCards: [],
    ownedPorts: [],
    directRecipeCapacity: { ...directRecipeCapacity },
    directRecipeSurplus: capacities(0),
    tradeAdjustedRecipeCapacity: { ...tradeAdjustedRecipeCapacity },
    startingReadiness: Object.fromEntries(RECIPES.map((recipe) => [recipe, {
      canBuyNow: readyRecipes.includes(recipe),
      missingCardCount: readyRecipes.includes(recipe) ? 0 : 1,
      missingResources: [],
      remainingCards: []
    }])),
    expansion: { oneRoadNodeIds: [], twoRoadNodeIds: [] }
  };
}

function makeSolved({
  p1Portfolio = makePortfolio(),
  p2Portfolio = makePortfolio(),
  p1Value = 20,
  p2Value = 20,
  normalisedSeatAdvantage = 0,
  rootOptions = [],
  responseOptions = []
} = {}) {
  return {
    p1Portfolio,
    p2Portfolio,
    p1Value,
    p2Value,
    seatAdvantage: p1Value - p2Value,
    normalisedSeatAdvantage,
    line: [
      { player: "P1", nodeId: 0 },
      { player: "P2", nodeId: 2 },
      { player: "P2", nodeId: 3 },
      { player: "P1", nodeId: 4 }
    ],
    rootOptions,
    responseOptions
  };
}

const BASE_DEPTH = Object.freeze({
  greedyRegret: 0,
  meaningfulFirstPickCount: 2,
  meaningfulResponseCount: 2,
  forcedDefence: false,
  lineSensitivity: 0
});

const BASE_FACTS = Object.freeze({
  tiles: Object.freeze([]),
  totalProductionByResource: Object.freeze(
    Object.fromEntries(RESOURCES.map((resource) => [resource, 20]))
  )
});

const COMPLETED_PASS_PROFILE = Object.freeze({
  ...DUEL_FAIR_V2_PROFILE,
  maxNormalisedSeatAdvantage: 1,
  dominanceMargin: 2,
  portDependenceThreshold: 2
});

const COMPLETED_REVIEW_PROFILE = Object.freeze({
  ...COMPLETED_PASS_PROFILE,
  portDependenceThreshold: 0.6
});

function fairnessFrom(solved, classification) {
  return {
    ...classification,
    seatAdvantage: solved.seatAdvantage,
    normalisedSeatAdvantage: solved.normalisedSeatAdvantage,
    portfolios: { P1: solved.p1Portfolio, P2: solved.p2Portfolio }
  };
}

function classifyAndTag({
  solved = makeSolved(),
  diagnosticLensResults = [],
  placementDepth = BASE_DEPTH,
  facts = BASE_FACTS
} = {}) {
  const classification = classifySolvedOpening({
    solved,
    diagnosticLensResults,
    placementDepth,
    profile: DUEL_FAIR_V2_PROFILE
  });
  const tags = buildDuelTags({
    facts,
    fairness: fairnessFrom(solved, classification),
    quality: {},
    placementDepth,
    profile: DUEL_FAIR_V2_PROFILE
  });
  return { classification, tags };
}

describe("duel-fair-v2 evaluator", () => {
  it("returns separate exact-audit fairness, quality, and placement-depth results", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const report = evaluateDuelBoardV2(candidate.tiles, {
      profile: COMPLETED_PASS_PROFILE,
      includeDiagnosticLenses: false
    });
    expect(report).toEqual(expect.objectContaining({
      evaluatorIdentity: {
        featureVersion: "duel-opening-features-v1",
        policyVersion: "duel-fair-v2",
        profileHash: expect.stringMatching(/^[a-f0-9]{64}$/)
      },
      screenVerdict: "pass",
      screenRejectionCodes: [],
      fairness: expect.objectContaining({
        verdict: "pass",
        favouredSeat: expect.stringMatching(/P1|P2/),
        solvedLine: expect.arrayContaining([
          expect.objectContaining({ player: "P1", nodeId: expect.any(Number) })
        ]),
        portfolios: {
          P1: expect.objectContaining({ policyFeatures: expect.any(Object) }),
          P2: expect.objectContaining({ policyFeatures: expect.any(Object) })
        }
      }),
      quality: expect.objectContaining({
        weakerPortfolioValue: expect.any(Number),
        viableRecipeCounts: expect.any(Object)
      }),
      placementDepth: expect.objectContaining({
        greedyRegret: expect.any(Number),
        meaningfulFirstPickCount: expect.any(Number),
        meaningfulResponseCount: expect.any(Number),
        forcedDefence: expect.any(Boolean)
      }),
      rankingComponents: expect.objectContaining({
        fairnessScore: expect.any(Number),
        qualityScore: expect.any(Number),
        depthScore: expect.any(Number)
      }),
      tags: expect.any(Array)
    }));
    expect(report.quality.viableRecipeCounts).toEqual({ P1: 4, P2: 3 });
    expect(report.quality.tradeAdjustedViableRecipeCounts).toEqual({ P1: 4, P2: 4 });
    expect(report.quality.noCredibleRecipes).toEqual({ P1: [], P2: ["city"] });

    const expectedFairnessScore = 100 * (1 - Math.min(
      Math.abs(report.fairness.normalisedSeatAdvantage)
        / COMPLETED_PASS_PROFILE.maxNormalisedSeatAdvantage,
      1
    ));
    const expectedQualityScore = 100 * Math.min(Math.max(
      report.quality.weakerPortfolioValue / COMPLETED_PASS_PROFILE.qualityTarget,
      0
    ), 1);
    const expectedDepthScore = 100 * Math.min(
      report.placementDepth.meaningfulFirstPickCount / 4,
      1
    );
    expect(report.rankingComponents).toEqual({
      fairnessScore: expectedFairnessScore,
      qualityScore: expectedQualityScore,
      depthScore: expectedDepthScore
    });
    expect(report.overallScore).toBe(
      expectedFairnessScore * COMPLETED_PASS_PROFILE.rankWeights.fairness
        + expectedQualityScore * COMPLETED_PASS_PROFILE.rankWeights.quality
        + expectedDepthScore * COMPLETED_PASS_PROFILE.rankWeights.placementDepth
    );
    expect(Number.isFinite(report.overallScore)).toBe(true);
  });

  it("returns sorted structural rejection codes before exact solving", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const report = evaluateDuelBoardV2(candidate.tiles.slice(0, -1));
    expect(report).toEqual(expect.objectContaining({
      screenVerdict: "reject",
      screenRejectionCodes: ["incomplete-port-topology", "invalid-counts"],
      fairness: null,
      quality: null,
      placementDepth: null,
      rankingComponents: null,
      overallScore: null
    }));
  });

  it("rejects incomplete port endpoints even when port resources and counts remain standard", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const tiles = structuredClone(candidate.tiles);
    const port = tiles.find((tile) => tile.type === TileTypes.PORT);
    port.tile.nodes = port.tile.nodes.slice(0, 1);

    expect(evaluateDuelBoardV2(tiles).screenRejectionCodes)
      .toEqual(["incomplete-port-topology"]);
  });

  it("rejects a port that declares its own fake endpoint edge", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const tiles = structuredClone(candidate.tiles);
    const port = tiles.find((tile) => tile.type === TileTypes.PORT);
    port.tile.nodes = [0, 2];
    port.tile.edges = { fake: [0, 2] };

    expect(evaluateDuelBoardV2(tiles)).toEqual(expect.objectContaining({
      screenVerdict: "reject",
      screenRejectionCodes: ["incomplete-port-topology"],
      fairness: null,
      quality: null,
      placementDepth: null,
      rankingComponents: null,
      overallScore: null
    }));
  });

  it("rejects non-finite node features with a stable code", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const tiles = structuredClone(candidate.tiles);
    tiles.find((tile) => tile.type === TileTypes.LAND && tile.tile.number != null).tile.number = NaN;

    expect(evaluateDuelBoardV2(tiles).screenRejectionCodes)
      .toEqual(["invalid-counts", "non-finite-features"]);
  });

  it("rejects non-finite derived settlement features", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const tiles = structuredClone(candidate.tiles);
    const brickNodeIds = new Set(tiles
      .filter((tile) => tile.type === TileTypes.LAND && tile.tile.resource === ResourceType.BRICK)
      .flatMap((tile) => Object.values(tile.tile.nodes)));
    tiles.find((tile) => (
      tile.type === TileTypes.LAND
      && tile.tile.resource === ResourceType.WOOD
      && Object.values(tile.tile.nodes).some((nodeId) => brickNodeIds.has(nodeId))
    )).tile.number = 20;

    expect(evaluateDuelBoardV2(tiles).screenRejectionCodes)
      .toEqual(["invalid-counts", "non-finite-features"]);
  });

  it("rejects boards whose legal nodes cannot complete four placements", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const tiles = structuredClone(candidate.tiles);
    const nodeIds = Array.from({ length: 6 }, (_, nodeId) => nodeId);
    const edges = Object.fromEntries(nodeIds.flatMap((left) => nodeIds
      .filter((right) => right > left)
      .map((right) => [`${left}-${right}`, [left, right]])));
    for (const tile of tiles.filter((entry) => entry.type === TileTypes.LAND)) {
      tile.tile.nodes = [...nodeIds];
      tile.tile.edges = { ...edges };
    }

    expect(evaluateDuelBoardV2(tiles).screenRejectionCodes)
      .toEqual(["incomplete-port-topology", "no-legal-complete-draft"]);
  });

  it("keeps adjacent reds as a default-profile screen rejection", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.FREEFORM_RANDOM, seed: 1 });
    const report = evaluateDuelBoardV2(candidate.tiles);
    expect(report.screenVerdict).toBe("reject");
    expect(report.screenRejectionCodes).toContain("adjacent-red-numbers");
    expect(report.fairness).toBeNull();
  });

  it("records diagnostic lenses without letting them replace the official solved line", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const withoutLenses = evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: false });
    const withLenses = evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: true });
    expect(withoutLenses.fairness.verdict).toBe("reject");
    expect(withoutLenses.overallScore).toBeNull();
    expect(withLenses.fairness.verdict).toBe("reject");
    expect(withLenses.overallScore).toBeNull();
    expect(withLenses.fairness.solvedLine).toEqual(withoutLenses.fairness.solvedLine);
    expect(withLenses.fairness.diagnosticLensResults.map((entry) => entry.name))
      .toEqual(["expansion", "development"]);
  });

  it("does not allow seed 47 to remain a top automatic pass", () => {
    const report = evaluateDuelBoardV2(readFixture("official-seed-47-p1-dominance").tiles);
    expect(report.fairness.verdict).not.toBe("pass");
    expect(report.fairness.favouredSeat).toBe("P1");
    expect(report.fairness.solvedLine).toHaveLength(4);
    expect(report.placementDepth.greedyLine.map((pick) => pick.nodeId)).toEqual([0, 6, 44, 23]);
    expect(report.placementDepth.greedyPortfolios.P1.producedResourceCount).toBe(5);
    expect(report.placementDepth.greedyPortfolios.P1.startingReadiness.road.canBuyNow).toBe(true);
    expect(report.placementDepth.greedyPortfolios.P2.missingProducedResources)
      .toEqual([ResourceType.WOOD, ResourceType.ORE]);
  });

  it("sends seed 2604 to review and exposes starting dev-card tempo", () => {
    const report = evaluateDuelBoardV2(
      readFixture("official-seed-2604-strategic-denial").tiles,
      { includeDiagnosticLenses: true }
    );
    expect(report.fairness.verdict).toBe("review");
    expect(report.fairness.solvedLine[0]).toEqual({ player: "P1", nodeId: 31 });
    const p2 = report.fairness.portfolios.P2;
    expect(p2.settlementNodeIds[1]).toBe(0);
    expect(p2.startingCards).toEqual([
      ResourceType.ORE,
      ResourceType.SHEEP,
      ResourceType.WHEAT
    ]);
    expect(p2.startingReadiness.devCard.canBuyNow).toBe(true);
    expect(report.tags).toContain("strategic");
  });

  it("keeps completed review audits out of automatic ranking", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const report = evaluateDuelBoardV2(candidate.tiles, {
      profile: COMPLETED_REVIEW_PROFILE,
      includeDiagnosticLenses: false
    });

    expect(report.screenVerdict).toBe("pass");
    expect(report.fairness.verdict).toBe("review");
    expect(report.fairness.rejectionCodes).toEqual([]);
    expect(report.fairness.reviewCodes).toEqual(["port-dependent"]);
    expect(Object.values(report.rankingComponents).every(Number.isFinite)).toBe(true);
    expect(report.overallScore).toBeNull();
  });

  it("uses null for a policy-value tie instead of inventing a favoured seat", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const profile = {
      ...DUEL_FAIR_V2_PROFILE,
      officialPolicy: {
        ...DUEL_FAIR_V2_PROFILE.officialPolicy,
        weights: Object.freeze(Object.fromEntries(
          Object.keys(DUEL_FAIR_V2_PROFILE.officialPolicy.weights).map((key) => [key, 0])
        ))
      }
    };
    const report = evaluateDuelBoardV2(candidate.tiles, { profile });
    expect(report.fairness.seatAdvantage).toBe(0);
    expect(report.fairness.favouredSeat).toBeNull();
  });
});

describe("placement depth", () => {
  it("builds the v1 greedy baseline in legal P1, P2, P2, P1 order", () => {
    const resourcePips = (wood) => ({
      [ResourceType.WOOD]: wood,
      [ResourceType.BRICK]: 0,
      [ResourceType.SHEEP]: 0,
      [ResourceType.WHEAT]: 0,
      [ResourceType.ORE]: 0
    });
    const nodes = Array.from({ length: 7 }, (_, nodeId) => ({
      nodeId,
      totalPips: 10 - nodeId,
      resourcePips: resourcePips(10 - nodeId),
      resources: [ResourceType.WOOD],
      port: null,
      blockedNodeIds: nodeId <= 1 ? [0, 1] : [nodeId]
    }));
    const facts = {
      tiles: [],
      nodes,
      legalPairs: nodes.flatMap((left, index) => nodes.slice(index + 1)
        .filter((right) => !left.blockedNodeIds.includes(right.nodeId))
        .map((right) => [left.nodeId, right.nodeId])),
      topology: {
        nodeNeighbors: Object.fromEntries(nodes.map((node) => [
          node.nodeId,
          node.blockedNodeIds.filter((nodeId) => nodeId !== node.nodeId)
        ]))
      }
    };
    const solved = makeSolved({
      normalisedSeatAdvantage: 0.01,
      rootOptions: [
        { nodeId: 0, normalisedSeatAdvantage: 0.01 },
        { nodeId: 2, normalisedSeatAdvantage: -0.09 },
        { nodeId: 3, normalisedSeatAdvantage: -0.1 }
      ],
      responseOptions: [
        { nodeIds: [2, 3], normalisedSeatAdvantage: 0 },
        { nodeIds: [3, 4], normalisedSeatAdvantage: 0.04 }
      ]
    });

    const depth = measurePlacementDepth({
      facts,
      solved,
      policy: DUEL_FAIR_V2_PROFILE.officialPolicy,
      profile: DUEL_FAIR_V2_PROFILE
    });

    expect(depth.greedyLine).toEqual([
      { player: "P1", nodeId: 0 },
      { player: "P2", nodeId: 2 },
      { player: "P2", nodeId: 3 },
      { player: "P1", nodeId: 4 }
    ]);
    expect(depth.greedyPortfolios.P1.settlementNodeIds).toEqual([0, 4]);
    expect(depth.greedyPortfolios.P2.settlementNodeIds).toEqual([2, 3]);
    expect(depth.meaningfulFirstPickCount).toBe(1);
    expect(depth.meaningfulResponseCount).toBe(2);
    expect(depth.forcedDefence).toBe(true);
    expect(depth.lineSensitivity).toBeCloseTo(0.11, 10);
  });
});

describe("v2 calibration fixtures", () => {
  it.each(CALIBRATION_FIXTURES)("locks the complete stable summary for %s", (name) => {
    const report = evaluateDuelBoardV2(readFixture(name).tiles, {
      includeDiagnosticLenses: true
    });
    expect(report.overallScore === null).toBe(report.fairness.verdict !== "pass");
    expect(stableCalibrationSummary(report)).toMatchSnapshot();
  });

  it.each([
    ["rotation", 1],
    ["reflection", 6]
  ])("preserves scalar results under a %s", (_name, transformIndex) => {
    const tiles = readFixture("official-seed-2604-strategic-denial").tiles;
    const transformedTiles = transformTiles(tiles, transformIndex);
    const baseline = evaluateDuelBoardV2(tiles, { includeDiagnosticLenses: true });
    const transformed = evaluateDuelBoardV2(transformedTiles, { includeDiagnosticLenses: true });

    expect(symmetryScalars(transformed)).toEqual(symmetryScalars(baseline));
    expectLegalSolvedLine(transformedTiles, transformed.fairness.solvedLine);
  });
});

describe("solved-opening classification and deterministic tags", () => {
  it("rejects P1 direct-recipe dominance even when total production and official values tie", () => {
    const solved = makeSolved({
      p1Portfolio: makePortfolio({ directRecipeCapacity: capacities(3) }),
      p2Portfolio: makePortfolio({ directRecipeCapacity: capacities(1) })
    });
    const { classification, tags } = classifyAndTag({ solved });
    expect(classification).toEqual({
      verdict: "reject",
      dominantSeat: "P1",
      rejectionCodes: ["portfolio-dominance"],
      reviewCodes: []
    });
    expect(tags).toEqual([]);
  });

  it("normalises dominance in the P2 direction", () => {
    const solved = makeSolved({
      p1Portfolio: makePortfolio({ directRecipeCapacity: capacities(1) }),
      p2Portfolio: makePortfolio({ directRecipeCapacity: capacities(3) })
    });
    const { classification, tags } = classifyAndTag({ solved });
    expect(classification).toEqual({
      verdict: "reject",
      dominantSeat: "P2",
      rejectionCodes: ["portfolio-dominance"],
      reviewCodes: []
    });
    expect(tags).toEqual([]);
  });

  it("reviews equal-value portfolios whose recipe viability exists only through trade", () => {
    const tradeOnly = makePortfolio({
      directRecipeCapacity: capacities(0.5),
      tradeAdjustedRecipeCapacity: capacities(2)
    });
    const solved = makeSolved({ p1Portfolio: tradeOnly, p2Portfolio: tradeOnly });
    const { classification, tags } = classifyAndTag({ solved });
    expect(classification).toEqual({
      verdict: "review",
      dominantSeat: null,
      rejectionCodes: [],
      reviewCodes: ["port-dependent"]
    });
    expect(tags).toEqual(["port-dependent"]);
  });

  it("uses max(trade-adjusted capacity, 1) for the port-dependence denominator", () => {
    const smallTradeGain = makePortfolio({
      directRecipeCapacity: capacities(0),
      tradeAdjustedRecipeCapacity: capacities(0.2)
    });
    const solved = makeSolved({ p1Portfolio: smallTradeGain, p2Portfolio: smallTradeGain });
    const { classification, tags } = classifyAndTag({ solved });
    expect(classification).toEqual({
      verdict: "pass",
      dominantSeat: null,
      rejectionCodes: [],
      reviewCodes: []
    });
    expect(tags).toEqual([]);
  });

  it("reviews material diagnostic-lens sign disagreement", () => {
    const solved = makeSolved({
      p1Value: 21,
      p2Value: 20,
      normalisedSeatAdvantage: 0.09
    });
    const diagnosticLensResults = [
      { name: "expansion", seatAdvantage: 1, normalisedSeatAdvantage: 0.1 },
      { name: "development", seatAdvantage: -1, normalisedSeatAdvantage: -0.1 }
    ];
    const profile = {
      ...DUEL_FAIR_V2_PROFILE,
      maxNormalisedSeatAdvantage: 0.2
    };
    const classification = classifySolvedOpening({
      solved,
      diagnosticLensResults,
      placementDepth: BASE_DEPTH,
      profile
    });
    expect(classification).toEqual({
      verdict: "review",
      dominantSeat: null,
      rejectionCodes: [],
      reviewCodes: ["diagnostic-lens-disagreement"]
    });
  });

  it("rejects official seat advantage beyond the finite profile threshold", () => {
    const solved = makeSolved({
      p1Value: 21,
      p2Value: 20,
      normalisedSeatAdvantage: DUEL_FAIR_V2_PROFILE.maxNormalisedSeatAdvantage + 0.001
    });
    const { classification, tags } = classifyAndTag({ solved });
    expect(classification).toEqual({
      verdict: "reject",
      dominantSeat: null,
      rejectionCodes: ["seat-advantage"],
      reviewCodes: []
    });
    expect(tags).toEqual([]);
  });

  it("tags a passing opening strategic only when both choice counts and sensitivity qualify", () => {
    const placementDepth = {
      ...BASE_DEPTH,
      meaningfulFirstPickCount: 2,
      meaningfulResponseCount: 2,
      lineSensitivity: DUEL_FAIR_V2_PROFILE.strategicMinLineSensitivity
    };
    const { classification, tags } = classifyAndTag({ placementDepth });
    expect(classification).toEqual({
      verdict: "pass",
      dominantSeat: null,
      rejectionCodes: [],
      reviewCodes: []
    });
    expect(tags).toEqual(["strategic"]);
  });

  it("reviews a forced defensive opening and tags its high-regret single answer knife-edge", () => {
    const solved = makeSolved({
      rootOptions: [
        { nodeId: 0, normalisedSeatAdvantage: 0 },
        { nodeId: 1, normalisedSeatAdvantage: -0.09 },
        { nodeId: 2, normalisedSeatAdvantage: -0.1 }
      ]
    });
    const placementDepth = {
      ...BASE_DEPTH,
      greedyRegret: DUEL_FAIR_V2_PROFILE.knifeEdgeRegretThreshold,
      meaningfulFirstPickCount: 1,
      forcedDefence: true
    };
    const { classification, tags } = classifyAndTag({ solved, placementDepth });
    expect(classification).toEqual({
      verdict: "review",
      dominantSeat: null,
      rejectionCodes: [],
      reviewCodes: ["forced-defence"]
    });
    expect(tags).toEqual(["knife-edge"]);
  });

  it("keeps resource scarcity descriptive rather than rejecting the opening", () => {
    const facts = {
      ...BASE_FACTS,
      totalProductionByResource: {
        ...BASE_FACTS.totalProductionByResource,
        [ResourceType.WOOD]: DUEL_FAIR_V2_PROFILE.scarcityPipsThreshold
      }
    };
    const { classification, tags } = classifyAndTag({ facts });
    expect(classification).toEqual({
      verdict: "pass",
      dominantSeat: null,
      rejectionCodes: [],
      reviewCodes: []
    });
    expect(tags).toEqual(["wood-scarce"]);
  });

  it("detects same-resource pip components without making them structural failures", () => {
    const facts = {
      ...BASE_FACTS,
      totalProductionByResource: {
        ...BASE_FACTS.totalProductionByResource,
        [ResourceType.WOOD]: 10
      },
      tiles: [
        { coordinate: [0, 0, 0], type: TileTypes.LAND, tile: { id: 0, resource: ResourceType.WOOD, number: 6 } },
        { coordinate: [1, 0, -1], type: TileTypes.LAND, tile: { id: 1, resource: ResourceType.WOOD, number: 5 } },
        { coordinate: [3, -3, 0], type: TileTypes.LAND, tile: { id: 2, resource: ResourceType.WOOD, number: 2 } }
      ]
    };
    const { classification, tags } = classifyAndTag({ facts });
    expect(classification.rejectionCodes).toEqual([]);
    expect(tags).toEqual(["resource-clustered"]);
  });

  it.each([
    [
      "expansion",
      { road: 3, settlement: 3, devCard: 1, city: 1 },
      ["expansion-leaning"]
    ],
    [
      "development",
      { road: 1, settlement: 1, devCard: 3, city: 3 },
      ["development-leaning"]
    ]
  ])("tags %s-leaning portfolios from combined direct capacity", (_name, direct, expectedTags) => {
    const portfolio = makePortfolio({ directRecipeCapacity: direct });
    const solved = makeSolved({ p1Portfolio: portfolio, p2Portfolio: portfolio });
    const { tags } = classifyAndTag({ solved });
    expect(tags).toEqual(expectedTags);
  });

  it("tags low counterplay and starting-tempo asymmetry", () => {
    const solved = makeSolved({
      p1Portfolio: makePortfolio({ readyRecipes: ["road"] }),
      p2Portfolio: makePortfolio()
    });
    const placementDepth = { ...BASE_DEPTH, meaningfulResponseCount: 1 };
    const { tags } = classifyAndTag({ solved, placementDepth });
    expect(tags).toEqual(["low-counterplay", "starting-tempo-asymmetry"]);
  });

  it("sorts combined descriptive tags deterministically", () => {
    const portDependent = makePortfolio({
      directRecipeCapacity: capacities(0.5),
      tradeAdjustedRecipeCapacity: capacities(2),
      readyRecipes: ["road"]
    });
    const solved = makeSolved({ p1Portfolio: portDependent, p2Portfolio: makePortfolio() });
    const facts = {
      ...BASE_FACTS,
      totalProductionByResource: {
        ...BASE_FACTS.totalProductionByResource,
        [ResourceType.WOOD]: DUEL_FAIR_V2_PROFILE.scarcityPipsThreshold
      }
    };
    const placementDepth = { ...BASE_DEPTH, meaningfulResponseCount: 1 };
    const { tags } = classifyAndTag({ solved, facts, placementDepth });
    expect(tags).toEqual([
      "low-counterplay",
      "port-dependent",
      "starting-tempo-asymmetry",
      "wood-scarce"
    ]);
  });
});
