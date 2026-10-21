import { buildBoardFacts } from "./boardFacts.mjs";
import { DUEL_FAIR_V1_PROFILE } from "./duelFairV1Profile.mjs";
import { measureOpeningRoutes } from "./openingRoutes.mjs";
import { measureOpportunityDepth } from "./opportunityDepth.mjs";
import { auditOrderSensitivity } from "./orderSensitivityAudit.mjs";
import { measurePickSensitivity } from "./pickSensitivity.mjs";
import { measureResourceContestability } from "./resourceAccess.mjs";
import { valueSettlements } from "./settlementValue.mjs";

export const REJECTION_CODES = Object.freeze({
  INVALID_BOARD: "invalid-board",
  ADJACENT_RED_NUMBERS: "adjacent-red-numbers",
  DOMINANT_TOP_SPOT: "dominant-top-spot",
  INSUFFICIENT_COMPETITIVE_SPOTS: "insufficient-competitive-spots",
  RESOURCE_MONOPOLY: "resource-monopoly",
  INSUFFICIENT_RESOURCE_ROUTES: "insufficient-resource-routes",
  INSUFFICIENT_OPENING_ROUTES: "insufficient-opening-routes",
  NO_COMPATIBLE_OPENING_ROUTES: "no-compatible-opening-routes",
  PICK_SENSITIVE: "pick-sensitive"
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function evaluateDuelBoard(tiles, { includeOrderAudit = false, profile = DUEL_FAIR_V1_PROFILE } = {}) {
  const facts = buildBoardFacts(tiles);
  const valuedNodes = valueSettlements(facts);
  const competitiveSpotDepth = measureOpportunityDepth(valuedNodes, profile);
  const resourceContestability = measureResourceContestability(facts, valuedNodes, profile);
  const openingRouteDepth = measureOpeningRoutes(facts, valuedNodes, profile);
  const pickSensitivity = measurePickSensitivity(valuedNodes, profile);
  const reasons = collectRejectionReasons({ facts, competitiveSpotDepth, resourceContestability, openingRouteDepth, pickSensitivity, profile });
  const penalties = normalisePenalties({ competitiveSpotDepth, resourceContestability, openingRouteDepth, pickSensitivity, profile });
  const overallScore = Math.max(0, Math.min(100, 100 * (1 - weightedPenalty(penalties, profile.weights))));
  return {
    evaluatorVersion: profile.version,
    verdict: reasons.length === 0 ? "pass" : "reject",
    rejectionReasons: reasons,
    overallScore,
    componentPenalties: penalties,
    metrics: {
      competitiveSpotDepth,
      resourceContestability,
      openingRouteDepth,
      pickSensitivity,
      orderSensitivityAudit: includeOrderAudit ? auditOrderSensitivity(valuedNodes) : null
    }
  };
}

function collectRejectionReasons({
  facts,
  competitiveSpotDepth,
  resourceContestability,
  openingRouteDepth,
  pickSensitivity,
  profile
}) {
  const reasons = [];
  const resourceMetrics = Object.values(resourceContestability.byResource);
  if (facts.validityErrors.length > 0) reasons.push(REJECTION_CODES.INVALID_BOARD);
  if (facts.redAdjacencyPairs.length > 0) reasons.push(REJECTION_CODES.ADJACENT_RED_NUMBERS);
  if (competitiveSpotDepth.topSpotCliff > profile.maxTopSpotCliff) reasons.push(REJECTION_CODES.DOMINANT_TOP_SPOT);
  if (competitiveSpotDepth.competitiveSpotCount < profile.minCompetitiveSpots) reasons.push(REJECTION_CODES.INSUFFICIENT_COMPETITIVE_SPOTS);
  if (resourceMetrics.some((metric) => metric.secondIndependentRatio < profile.minSecondIndependentResourceRatio)) {
    reasons.push(REJECTION_CODES.RESOURCE_MONOPOLY);
  }
  if (resourceMetrics.some((metric) => metric.independentViableRoutes.length < profile.minIndependentResourceRoutes)) {
    reasons.push(REJECTION_CODES.INSUFFICIENT_RESOURCE_ROUTES);
  }
  if (openingRouteDepth.distinctCompetitiveRouteCount < profile.minDistinctOpeningRoutes) reasons.push(REJECTION_CODES.INSUFFICIENT_OPENING_ROUTES);
  if (!openingRouteDepth.hasCompatibleCompetitiveRouteSet) reasons.push(REJECTION_CODES.NO_COMPATIBLE_OPENING_ROUTES);
  if (pickSensitivity.maxCollapse > profile.maxPickCollapse) reasons.push(REJECTION_CODES.PICK_SENSITIVE);
  return [...new Set(reasons)].sort();
}

function normalisePenalties({
  competitiveSpotDepth,
  resourceContestability,
  openingRouteDepth,
  pickSensitivity,
  profile
}) {
  const resourceRatios = Object.values(resourceContestability.byResource).map((metric) => metric.secondIndependentRatio);
  return {
    topSpotCliff: clamp01(competitiveSpotDepth.topSpotCliff / profile.maxTopSpotCliff),
    competitiveSpotDepth: clamp01(1 - competitiveSpotDepth.competitiveSpotCount / profile.minCompetitiveSpots),
    resourceContestability: clamp01(Math.max(0, ...resourceRatios.map((ratio) => 1 - ratio))),
    openingRouteDepth: Math.max(
      clamp01(1 - openingRouteDepth.distinctCompetitiveRouteCount / profile.minDistinctOpeningRoutes),
      openingRouteDepth.hasCompatibleCompetitiveRouteSet ? 0 : 1
    ),
    pickSensitivity: clamp01(pickSensitivity.maxCollapse / profile.maxPickCollapse)
  };
}

function weightedPenalty(penalties, weights) {
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + penalties[key] * weight, 0);
}
