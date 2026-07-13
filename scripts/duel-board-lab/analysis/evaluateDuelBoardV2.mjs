import {
  getNumDots,
  ResourceType,
  TileTypes
} from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";
import { buildBoardFacts, CUBE_DIRECTIONS } from "./boardFacts.mjs";
import {
  DUEL_FAIR_V2_LENSES,
  DUEL_FAIR_V2_PROFILE
} from "./duelFairV2Profile.mjs";
import { solveOpeningDraft } from "./openingDraftSolver.mjs";
import {
  flattenPolicyFeatures,
  hashOpeningProfile
} from "./openingPolicy.mjs";
import { measurePlacementDepth } from "./placementDepth.mjs";
import { valueSettlements } from "./settlementValue.mjs";

const SCREEN_CODES = Object.freeze({
  INVALID_COUNTS: "invalid-counts",
  INCOMPLETE_PORT_TOPOLOGY: "incomplete-port-topology",
  NON_FINITE_FEATURES: "non-finite-features",
  ADJACENT_RED_NUMBERS: "adjacent-red-numbers",
  NO_LEGAL_COMPLETE_DRAFT: "no-legal-complete-draft"
});

const REJECTION_CODES = Object.freeze({
  SEAT_ADVANTAGE: "seat-advantage",
  PORTFOLIO_DOMINANCE: "portfolio-dominance"
});

const REVIEW_CODES = Object.freeze({
  DIAGNOSTIC_LENS_DISAGREEMENT: "diagnostic-lens-disagreement",
  FORCED_DEFENCE: "forced-defence",
  PORT_DEPENDENT: "port-dependent"
});

const PORT_RESOURCES = new Set([...STANDARD_RESOURCES, ResourceType.ANY]);

function evaluatorIdentity(profile) {
  return {
    featureVersion: profile.featureVersion,
    policyVersion: profile.policyVersion,
    profileHash: hashOpeningProfile(profile)
  };
}

function hasCompletePortTopology(facts) {
  const portTiles = facts.tiles.filter((tile) => tile.type === TileTypes.PORT);
  if (portTiles.length !== 9) return false;

  const landNodeIds = new Set(facts.topology.landNodeIds);
  const seenEndpointIds = new Set();
  for (const tile of portTiles) {
    const resource = tile.tile.resource;
    const endpointIds = Object.values(tile.tile.nodes ?? {});
    if (!PORT_RESOURCES.has(resource) || endpointIds.length !== 2) return false;
    const [leftNodeId, rightNodeId] = endpointIds;
    if (leftNodeId === rightNodeId) return false;
    if (!landNodeIds.has(leftNodeId) || !landNodeIds.has(rightNodeId)) return false;
    if (seenEndpointIds.has(leftNodeId) || seenEndpointIds.has(rightNodeId)) return false;
    if (!(facts.topology.nodeNeighbors[leftNodeId] ?? []).includes(rightNodeId)) return false;
    if (
      facts.topology.portsByNodeId[leftNodeId] !== resource
      || facts.topology.portsByNodeId[rightNodeId] !== resource
    ) return false;
    seenEndpointIds.add(leftNodeId);
    seenEndpointIds.add(rightNodeId);
  }
  return seenEndpointIds.size === 18;
}

function hasFiniteNodeFeatures(facts) {
  const rawFeaturesAreFinite = facts.nodes.every((node) => (
    Number.isFinite(node.totalPips)
    && STANDARD_RESOURCES.every((resource) => Number.isFinite(node.resourcePips[resource]))
  )) && STANDARD_RESOURCES.every((resource) => (
    Number.isFinite(facts.totalProductionByResource[resource])
  ));
  if (!rawFeaturesAreFinite) return false;

  return valueSettlements(facts).every((node) => [
    node.totalPips,
    node.diversity,
    node.expansionScore,
    node.growthScore,
    node.portBonus,
    node.generalScore
  ].every(Number.isFinite));
}

function hasLegalCompleteDraft(facts) {
  const nodes = [...facts.nodes].sort((left, right) => left.nodeId - right.nodeId);
  const search = (selected, startIndex) => {
    if (selected.length === 4) return true;
    for (let index = startIndex; index < nodes.length; index += 1) {
      const candidate = nodes[index];
      if (selected.some((node) => (
        candidate.blockedNodeIds.includes(node.nodeId)
        || node.blockedNodeIds.includes(candidate.nodeId)
      ))) continue;
      if (search([...selected, candidate], index + 1)) return true;
    }
    return false;
  };
  return search([], 0);
}

function structuralScreen(facts, profile) {
  const codes = [];
  if (facts.validityErrors.length > 0) codes.push(SCREEN_CODES.INVALID_COUNTS);
  if (!hasCompletePortTopology(facts)) codes.push(SCREEN_CODES.INCOMPLETE_PORT_TOPOLOGY);
  if (!hasFiniteNodeFeatures(facts)) codes.push(SCREEN_CODES.NON_FINITE_FEATURES);
  if (!profile.allowAdjacentReds && facts.redAdjacencyPairs.length > 0) {
    codes.push(SCREEN_CODES.ADJACENT_RED_NUMBERS);
  }
  if (!hasLegalCompleteDraft(facts)) codes.push(SCREEN_CODES.NO_LEGAL_COMPLETE_DRAFT);
  return [...new Set(codes)].sort();
}

function immediateReadyCount(portfolio) {
  return Object.values(portfolio.startingReadiness)
    .filter((entry) => entry.canBuyNow).length;
}

function dominanceVector(portfolio) {
  return [
    portfolio.totalProductionPips,
    portfolio.producedResourceCount,
    portfolio.directRecipeCapacity.road,
    portfolio.directRecipeCapacity.settlement,
    portfolio.directRecipeCapacity.devCard,
    portfolio.directRecipeCapacity.city,
    immediateReadyCount(portfolio)
  ];
}

function dominates(leftPortfolio, rightPortfolio, profile) {
  const left = dominanceVector(leftPortfolio);
  const right = dominanceVector(rightPortfolio);
  const normalisedDifferences = left.map((value, index) => (
    (value - right[index]) / Math.max(Math.abs(value), Math.abs(right[index]), 1)
  ));
  return normalisedDifferences.every((value) => value >= -profile.dominanceTolerance)
    && normalisedDifferences.some((value) => value >= profile.dominanceMargin);
}

function dominatingSeat(solved, profile) {
  if (dominates(solved.p1Portfolio, solved.p2Portfolio, profile)) return "P1";
  if (dominates(solved.p2Portfolio, solved.p1Portfolio, profile)) return "P2";
  return null;
}

function portfolioPortDependence(portfolio) {
  return Math.max(...Object.keys(portfolio.directRecipeCapacity).map((recipe) => {
    const direct = portfolio.directRecipeCapacity[recipe];
    const tradeAdjusted = portfolio.tradeAdjustedRecipeCapacity[recipe];
    return (tradeAdjusted - direct) / Math.max(tradeAdjusted, 1);
  }));
}

function hasLensDisagreement(solved, diagnosticLensResults, profile) {
  const results = [
    { name: "official", normalisedSeatAdvantage: solved.normalisedSeatAdvantage },
    ...diagnosticLensResults
  ];
  for (let leftIndex = 0; leftIndex < results.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < results.length; rightIndex += 1) {
      const left = results[leftIndex].normalisedSeatAdvantage;
      const right = results[rightIndex].normalisedSeatAdvantage;
      if (
        left * right < 0
        && Math.abs(left) >= profile.lensDisagreementThreshold
        && Math.abs(right) >= profile.lensDisagreementThreshold
      ) return true;
    }
  }
  return false;
}

export function classifySolvedOpening({
  solved,
  diagnosticLensResults,
  placementDepth,
  profile
}) {
  const rejectionCodes = [];
  const reviewCodes = [];
  const dominantSeat = dominatingSeat(solved, profile);
  const portDependence = Math.max(
    portfolioPortDependence(solved.p1Portfolio),
    portfolioPortDependence(solved.p2Portfolio)
  );

  if (Math.abs(solved.normalisedSeatAdvantage) > profile.maxNormalisedSeatAdvantage) {
    rejectionCodes.push(REJECTION_CODES.SEAT_ADVANTAGE);
  }
  if (dominantSeat !== null) rejectionCodes.push(REJECTION_CODES.PORTFOLIO_DOMINANCE);
  if (hasLensDisagreement(solved, diagnosticLensResults, profile)) {
    reviewCodes.push(REVIEW_CODES.DIAGNOSTIC_LENS_DISAGREEMENT);
  }
  if (placementDepth.forcedDefence) reviewCodes.push(REVIEW_CODES.FORCED_DEFENCE);
  if (portDependence >= profile.portDependenceThreshold) {
    reviewCodes.push(REVIEW_CODES.PORT_DEPENDENT);
  }

  return {
    verdict: rejectionCodes.length > 0
      ? "reject"
      : reviewCodes.length > 0 ? "review" : "pass",
    dominantSeat,
    rejectionCodes: [...new Set(rejectionCodes)].sort(),
    reviewCodes: [...new Set(reviewCodes)].sort()
  };
}

function buildQuality(solved, profile) {
  const portfolios = { P1: solved.p1Portfolio, P2: solved.p2Portfolio };
  const values = { P1: solved.p1Value, P2: solved.p2Value };
  const viableRecipeCounts = {};
  const tradeAdjustedViableRecipeCounts = {};
  const noCredibleRecipes = {};
  const portDependence = {};

  for (const [seat, portfolio] of Object.entries(portfolios)) {
    const recipeNames = Object.keys(portfolio.directRecipeCapacity);
    viableRecipeCounts[seat] = recipeNames.filter((recipe) => (
      portfolio.directRecipeCapacity[recipe] >= profile.minViableRecipeCapacity
    )).length;
    tradeAdjustedViableRecipeCounts[seat] = recipeNames.filter((recipe) => (
      portfolio.tradeAdjustedRecipeCapacity[recipe] >= profile.minViableRecipeCapacity
    )).length;
    noCredibleRecipes[seat] = recipeNames.filter((recipe) => (
      portfolio.directRecipeCapacity[recipe] < profile.minViableRecipeCapacity
    )).sort();
    portDependence[seat] = portfolioPortDependence(portfolio);
  }

  const weakerSeat = Math.abs(values.P1 - values.P2) <= profile.tradePrecision
    ? null
    : values.P1 < values.P2 ? "P1" : "P2";
  return {
    weakerSeat,
    weakerPortfolioValue: Math.min(values.P1, values.P2),
    viableRecipeCounts,
    tradeAdjustedViableRecipeCounts,
    noCredibleRecipes,
    portDependence: {
      ...portDependence,
      maximum: Math.max(portDependence.P1, portDependence.P2)
    }
  };
}

function hasResourceCluster(facts, profile) {
  const landTiles = facts.tiles.filter((tile) => (
    tile.type === TileTypes.LAND && STANDARD_RESOURCES.includes(tile.tile.resource)
  ));
  const tilesByCoordinate = new Map(landTiles.map((tile) => [tile.coordinate.join(","), tile]));
  const visitedTileIds = new Set();

  for (const tile of landTiles) {
    if (visitedTileIds.has(tile.tile.id)) continue;
    const resource = tile.tile.resource;
    const pending = [tile];
    let componentPips = 0;
    visitedTileIds.add(tile.tile.id);

    while (pending.length > 0) {
      const current = pending.pop();
      componentPips += current.tile.number == null ? 0 : getNumDots(current.tile.number);
      for (const direction of CUBE_DIRECTIONS) {
        const coordinate = current.coordinate.map((value, index) => value + direction[index]);
        const neighbour = tilesByCoordinate.get(coordinate.join(","));
        if (
          neighbour
          && neighbour.tile.resource === resource
          && !visitedTileIds.has(neighbour.tile.id)
        ) {
          visitedTileIds.add(neighbour.tile.id);
          pending.push(neighbour);
        }
      }
    }

    const totalResourcePips = facts.totalProductionByResource[resource];
    if (
      totalResourcePips > 0
      && componentPips / totalResourcePips >= profile.resourceClusterShareThreshold
    ) return true;
  }
  return false;
}

function combinedStrategyCapacity(fairness) {
  const capacities = [
    fairness.portfolios.P1.directRecipeCapacity,
    fairness.portfolios.P2.directRecipeCapacity
  ];
  return capacities.reduce((totals, capacity) => ({
    expansion: totals.expansion + capacity.road + capacity.settlement,
    development: totals.development + capacity.devCard + capacity.city
  }), { expansion: 0, development: 0 });
}

export function buildDuelTags({ facts, fairness, quality: _quality, placementDepth, profile }) {
  const tags = new Set();
  for (const resource of STANDARD_RESOURCES) {
    if (facts.totalProductionByResource[resource] <= profile.scarcityPipsThreshold) {
      tags.add(`${String(resource).toLowerCase()}-scarce`);
    }
  }
  if (hasResourceCluster(facts, profile)) tags.add("resource-clustered");

  const portDependence = Math.max(
    portfolioPortDependence(fairness.portfolios.P1),
    portfolioPortDependence(fairness.portfolios.P2)
  );
  if (portDependence >= profile.portDependenceThreshold) tags.add("port-dependent");

  const strategy = combinedStrategyCapacity(fairness);
  if (
    strategy.expansion > 0
    && strategy.expansion >= strategy.development * profile.strategyLeanRatio
  ) tags.add("expansion-leaning");
  if (
    strategy.development > 0
    && strategy.development >= strategy.expansion * profile.strategyLeanRatio
  ) tags.add("development-leaning");

  if (
    placementDepth.meaningfulFirstPickCount >= profile.strategicMinFirstPicks
    && placementDepth.meaningfulResponseCount >= profile.strategicMinResponses
    && placementDepth.lineSensitivity >= profile.strategicMinLineSensitivity
  ) tags.add("strategic");
  if (
    placementDepth.forcedDefence
    || (
      placementDepth.greedyRegret >= profile.knifeEdgeRegretThreshold
      && placementDepth.meaningfulFirstPickCount === 1
    )
  ) tags.add("knife-edge");
  if (placementDepth.meaningfulResponseCount <= profile.lowCounterplayMaxResponses) {
    tags.add("low-counterplay");
  }
  if (
    immediateReadyCount(fairness.portfolios.P1)
      !== immediateReadyCount(fairness.portfolios.P2)
  ) tags.add("starting-tempo-asymmetry");

  return [...tags].sort();
}

function solveDiagnosticLenses(facts, profile) {
  return DUEL_FAIR_V2_LENSES.map((lens) => {
    const solved = solveOpeningDraft(facts, {
      policy: lens,
      precision: profile.tradePrecision
    });
    return {
      name: lens.name,
      seatAdvantage: solved.seatAdvantage,
      normalisedSeatAdvantage: solved.normalisedSeatAdvantage,
      solvedLine: solved.line
    };
  });
}

export function evaluateDuelBoardV2(
  tiles,
  { profile = DUEL_FAIR_V2_PROFILE, includeDiagnosticLenses = false } = {}
) {
  const identity = evaluatorIdentity(profile);
  const facts = buildBoardFacts(tiles);
  const screenRejectionCodes = structuralScreen(facts, profile);
  if (screenRejectionCodes.length > 0) {
    return {
      evaluatorIdentity: identity,
      screenVerdict: "reject",
      screenRejectionCodes,
      fairness: null,
      quality: null,
      placementDepth: null,
      rankingComponents: null,
      tags: [],
      overallScore: null
    };
  }

  const solved = solveOpeningDraft(facts, {
    policy: profile.officialPolicy,
    precision: profile.tradePrecision
  });
  const diagnosticLensResults = includeDiagnosticLenses
    ? solveDiagnosticLenses(facts, profile)
    : [];
  const placementDepth = measurePlacementDepth({
    facts,
    solved,
    policy: profile.officialPolicy,
    profile
  });
  const classification = classifySolvedOpening({
    solved,
    diagnosticLensResults,
    placementDepth,
    profile
  });
  const fairness = {
    verdict: classification.verdict,
    favouredSeat: Math.abs(solved.seatAdvantage) <= profile.tradePrecision
      ? null
      : solved.seatAdvantage > 0 ? "P1" : "P2",
    seatAdvantage: solved.seatAdvantage,
    normalisedSeatAdvantage: solved.normalisedSeatAdvantage,
    solvedLine: solved.line,
    portfolios: {
      P1: {
        ...solved.p1Portfolio,
        policyFeatures: flattenPolicyFeatures(solved.p1Portfolio)
      },
      P2: {
        ...solved.p2Portfolio,
        policyFeatures: flattenPolicyFeatures(solved.p2Portfolio)
      }
    },
    dominantSeat: classification.dominantSeat,
    rejectionCodes: classification.rejectionCodes,
    reviewCodes: classification.reviewCodes,
    diagnosticLensResults
  };
  const quality = buildQuality(solved, profile);
  const tags = buildDuelTags({ facts, fairness, quality, placementDepth, profile });
  const fairnessScore = 100 * (1 - Math.min(
    Math.abs(solved.normalisedSeatAdvantage) / profile.maxNormalisedSeatAdvantage,
    1
  ));
  const qualityScore = 100 * Math.min(Math.max(
    quality.weakerPortfolioValue / profile.qualityTarget,
    0
  ), 1);
  const depthScore = 100 * Math.min(placementDepth.meaningfulFirstPickCount / 4, 1);
  const rankingComponents = { fairnessScore, qualityScore, depthScore };
  const weightedScore = fairnessScore * profile.rankWeights.fairness
    + qualityScore * profile.rankWeights.quality
    + depthScore * profile.rankWeights.placementDepth;

  return {
    evaluatorIdentity: identity,
    screenVerdict: "pass",
    screenRejectionCodes: [],
    fairness,
    quality,
    placementDepth,
    rankingComponents,
    tags,
    overallScore: fairness.verdict === "pass" ? weightedScore : null
  };
}
