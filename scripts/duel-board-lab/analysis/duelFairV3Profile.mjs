import { ResourceType } from "@settlex/game-core";

const freezeRecord = (value) => Object.freeze({ ...value });

export const DUEL_FAIR_V3_PROFILE = Object.freeze({
  id: "duel-fair-v3",
  version: 3,
  featureVersion: "duel-fair-v3-features-1",
  policyVersion: "duel-fair-v3",
  candidateLimit: 16,
  fallbackCandidateLimit: 20,
  nearOptimalTolerance: 0.05,
  fairnessAdvantageLimit: 0.20,
  responseRegretLimit: 0.15,
  choiceDepthTarget: 4,
  tradeAdjustedRecipeDiscount: 0.85,
  serializationPrecision: 6,
  tiePrecision: 1e-12,
  contextRules: freezeRecord({
    viableAccessMinimumPips: 2,
    viableAccessBestRatio: 0.60,
    accessRegionMaximumDistance: 2
  }),
  settlementRules: freezeRecord({
    geometricMeanOffset: 0.50,
    denialProductionCap: 1.50,
    routeRedundancyCap: 3
  }),
  candidateBroadWeights: freezeRecord({
    production: 0.55,
    recipeOpportunity: 0.20,
    city: 0.10,
    expansion: 0.10,
    port: 0.05
  }),
  resourceWeights: freezeRecord({
    [ResourceType.WOOD]: 1.00,
    [ResourceType.BRICK]: 1.00,
    [ResourceType.SHEEP]: 0.90,
    [ResourceType.WHEAT]: 1.15,
    [ResourceType.ORE]: 1.10
  }),
  scarcity: freezeRecord({ minimum: 0.80, maximum: 1.25 }),
  portfolioWeights: freezeRecord({
    production: 0.30,
    recipeReadiness: 0.25,
    scarcityAccess: 0.10,
    startingTempo: 0.10,
    tradeAndPorts: 0.05,
    cityPotential: 0.05,
    expansion: 0.10,
    resilience: 0.05
  }),
  recipeWeights: freezeRecord({ road: 0.15, settlement: 0.30, dev: 0.25, city: 0.30 }),
  componentTargets: freezeRecord({
    weightedProduction: 25,
    scarcityAccess: 10,
    tradeCapacityGain: 2.50,
    cityUplift: 12,
    expansionGain: 10,
    robberLoss: 8
  }),
  recipeCapacityTargets: freezeRecord({ road: 4, settlement: 3, dev: 3, city: 1.5 }),
  overallWeights: freezeRecord({ fairness: 0.80, quality: 0.20 }),
  qualityWeights: freezeRecord({ weakerPortfolio: 0.80, meanPortfolio: 0.20 }),
  interestWeights: freezeRecord({ choiceDepth: 0.50, responseFreedom: 0.50 }),
  tagThresholds: freezeRecord({
    scarcity: 1.15,
    concentration: 0.70,
    portRelianceGap: 20,
    robberFragile: 35,
    forcedResponse: 25
  })
});
