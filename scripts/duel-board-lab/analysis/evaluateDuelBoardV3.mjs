import { buildBoardContextV3 } from "./boardContextV3.mjs";
import { buildBoardFacts } from "./boardFacts.mjs";
import { selectCandidatePoolV3 } from "./candidatePoolV3.mjs";
import { DUEL_FAIR_V3_PROFILE } from "./duelFairV3Profile.mjs";
import { solveOpeningDraftV3 } from "./openingDraftSolverV3.mjs";
import { buildSettlementFeaturesV3 } from "./settlementFeaturesV3.mjs";
import { hashDuelFairV3Profile } from "../constants.mjs";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const round = (value, precision) => Number(value.toFixed(precision));

function evaluatorIdentity(profile) {
  return Object.freeze({
    featureVersion: profile.featureVersion,
    policyVersion: profile.policyVersion,
    profileHash: hashDuelFairV3Profile(profile)
  });
}

function invalidResult(profile, invalidCodes) {
  return Object.freeze({
    evaluatorIdentity: evaluatorIdentity(profile),
    status: "invalid",
    invalidCodes: Object.freeze([...new Set(invalidCodes)].sort()),
    overallScore: null,
    scores: null,
    selectedLine: null,
    selectedPortfolios: null,
    components: null,
    choiceDiagnostics: null,
    tags: Object.freeze([])
  });
}

function containsNonFiniteNumber(value, seen = new WeakSet()) {
  if (typeof value === "number") return !Number.isFinite(value);
  if (value === null || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((nested) => containsNonFiniteNumber(nested, seen));
}

function choiceScores(solved, profile) {
  const bestRoot = Math.max(...solved.rootOptions.map((option) => option.normalizedAdvantage));
  const nearRootCount = solved.rootOptions.filter(
    (option) => bestRoot - option.normalizedAdvantage <= profile.nearOptimalTolerance
  ).length;
  const responsesByValue = [...solved.responseOptions].sort((left, right) =>
    left.normalizedAdvantage - right.normalizedAdvantage
      || left.nodeIds[0] - right.nodeIds[0]
      || left.nodeIds[1] - right.nodeIds[1]);
  const bestResponse = responsesByValue[0].normalizedAdvantage;
  const nearResponseCount = responsesByValue.filter(
    (option) => option.normalizedAdvantage - bestResponse <= profile.nearOptimalTolerance
  ).length;
  const choiceDepth = clamp(
    ((nearRootCount + nearResponseCount) / 2) / profile.choiceDepthTarget,
    0,
    1
  ) * 100;
  const responseRegret = Math.max(
    0,
    (responsesByValue[1]?.normalizedAdvantage ?? bestResponse) - bestResponse
  );
  const responseFreedom = (
    1 - clamp(responseRegret / profile.responseRegretLimit, 0, 1)
  ) * 100;
  return { choiceDepth, responseFreedom, responseRegret };
}

function buildTags({ facts, context, solved, choice, profile }) {
  const tags = [];
  for (const [resource, entry] of Object.entries(context.byResource)) {
    if (entry.scarcityMultiplier >= profile.tagThresholds.scarcity) {
      tags.push(`scarce:${resource}`);
    }
    if (entry.concentration >= profile.tagThresholds.concentration) {
      tags.push(`concentrated:${resource}`);
    }
  }
  const portfolios = [solved.p1, solved.p2];
  if (portfolios.some((portfolio) =>
    portfolio.components.tradeAndPorts - portfolio.components.recipeReadiness
      >= profile.tagThresholds.portRelianceGap)) tags.push("port-reliant");
  if (portfolios.some((portfolio) =>
    portfolio.components.resilience < profile.tagThresholds.robberFragile)) {
    tags.push("robber-fragile");
  }
  if (choice.responseFreedom < profile.tagThresholds.forcedResponse) tags.push("forced-response");
  if (facts.redAdjacencyPairs.length > 0) tags.push("adjacent-red");
  const weaker = solved.p1.value <= solved.p2.value ? solved.p1 : solved.p2;
  if (weaker.tradeAdjustedRecipeCapacity.road >= profile.recipeCapacityTargets.road) {
    tags.push("road-friendly");
  }
  if (weaker.tradeAdjustedRecipeCapacity.devCard >= profile.recipeCapacityTargets.dev) {
    tags.push("dev-friendly");
  }
  return Object.freeze([...new Set(tags)].sort());
}

export function evaluateDuelBoardV3(tiles, { profile = DUEL_FAIR_V3_PROFILE } = {}) {
  let facts;
  try {
    facts = buildBoardFacts(tiles);
  } catch {
    return invalidResult(profile, ["board-facts-error"]);
  }
  const context = buildBoardContextV3(facts, profile);
  if (context.structuralErrors.length > 0) {
    return invalidResult(profile, context.structuralErrors);
  }
  const settlementFeatures = buildSettlementFeaturesV3(facts, context, profile);
  if (containsNonFiniteNumber(context) || containsNonFiniteNumber(settlementFeatures)) {
    return invalidResult(profile, ["non-finite-features"]);
  }
  const featuresByNodeId = new Map(
    settlementFeatures.map((feature) => [feature.nodeId, feature])
  );
  let candidatePool;
  try {
    candidatePool = selectCandidatePoolV3({ facts, settlementFeatures, profile });
  } catch (error) {
    if (String(error?.message).startsWith("candidate-pool-")) {
      return invalidResult(profile, [error.message]);
    }
    throw error;
  }
  const solved = solveOpeningDraftV3({
    facts,
    context,
    featuresByNodeId,
    profile,
    candidateNodeIds: candidatePool.nodeIds
  });
  const advantageMagnitude = Math.abs(solved.normalizedAdvantage);
  const fairness = 100 * (1 - clamp(
    advantageMagnitude / profile.fairnessAdvantageLimit,
    0,
    1
  ));
  const weakerPortfolio = Math.min(solved.p1.value, solved.p2.value);
  const meanPortfolio = (solved.p1.value + solved.p2.value) / 2;
  const quality = weakerPortfolio * profile.qualityWeights.weakerPortfolio
    + meanPortfolio * profile.qualityWeights.meanPortfolio;
  const choice = choiceScores(solved, profile);
  const interest = choice.choiceDepth * profile.interestWeights.choiceDepth
    + choice.responseFreedom * profile.interestWeights.responseFreedom;
  const overall = fairness * profile.overallWeights.fairness
    + quality * profile.overallWeights.quality;
  const precision = profile.serializationPrecision;
  const roundedScores = Object.freeze({
    fairness: round(fairness, precision),
    quality: round(quality, precision),
    interest: round(interest, precision)
  });
  const roundedChoiceDepth = round(choice.choiceDepth, precision);
  const roundedResponseFreedom = round(choice.responseFreedom, precision);

  return Object.freeze({
    evaluatorIdentity: evaluatorIdentity(profile),
    status: "ranked",
    invalidCodes: Object.freeze([]),
    overallScore: round(overall, precision),
    scores: roundedScores,
    selectedLine: solved.selectedLine,
    selectedPortfolios: Object.freeze({ P1: solved.p1, P2: solved.p2 }),
    components: Object.freeze({
      normalizedAdvantage: round(solved.normalizedAdvantage, precision),
      weakerPortfolio: round(weakerPortfolio, precision),
      meanPortfolio: round(meanPortfolio, precision)
    }),
    choiceDiagnostics: Object.freeze({
      choiceDepth: roundedChoiceDepth,
      responseFreedom: roundedResponseFreedom,
      responseRegret: round(choice.responseRegret, precision),
      candidatePoolSize: candidatePool.nodeIds.length,
      evaluatedSequenceCount: solved.legalSequenceCount,
      rawSequenceCount: solved.rawSequenceCount,
      usedFallbackExpansion: candidatePool.fallbackUsed,
      championsByLens: candidatePool.championsByLens,
      fallbackLine: candidatePool.fallbackLine,
      rootOptions: solved.rootOptions,
      responseOptions: solved.responseOptions
    }),
    tags: buildTags({ facts, context, solved, choice, profile })
  });
}
