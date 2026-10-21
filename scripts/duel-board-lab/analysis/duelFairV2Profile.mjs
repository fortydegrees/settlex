const OFFICIAL_WEIGHTS = Object.freeze({
  totalProductionPips: 1,
  producedResourceCount: 0.8,
  missingProducedResourceCount: -1.2,
  directRoad: 0.55,
  directSettlement: 0.8,
  directDevCard: 0.8,
  directCity: 0.55,
  surplusRoad: 0.03,
  surplusSettlement: 0.02,
  surplusDevCard: 0.02,
  surplusCity: 0.02,
  tradeRoad: 0.12,
  tradeSettlement: 0.12,
  tradeDevCard: 0.12,
  tradeCity: 0.08,
  immediateRoad: 1.5,
  immediateSettlement: 2,
  immediateDevCard: 1.75,
  immediateCity: 2.5,
  ownedPortCount: 0.35,
  oneRoadExpansionCount: 0.08,
  twoRoadExpansionCount: 0.03,
  productionConcentration: -0.75
});

export const DUEL_FAIR_V2_PROFILE = Object.freeze({
  featureVersion: "duel-opening-features-v1",
  policyVersion: "duel-fair-v2",
  allowAdjacentReds: false,
  tradePrecision: 1e-6,
  maxNormalisedSeatAdvantage: 0.08,
  dominanceTolerance: 0.02,
  dominanceMargin: 0.08,
  lensDisagreementThreshold: 0.08,
  meaningfulLineTolerance: 0.05,
  forcedDefenceThreshold: 0.08,
  portDependenceThreshold: 0.25,
  minViableRecipeCapacity: 1,
  qualityTarget: 30,
  scarcityPipsThreshold: 7,
  resourceClusterShareThreshold: 0.67,
  strategyLeanRatio: 1.2,
  strategicMinFirstPicks: 2,
  strategicMinResponses: 2,
  strategicMinLineSensitivity: 0.08,
  knifeEdgeRegretThreshold: 0.08,
  lowCounterplayMaxResponses: 1,
  rankWeights: Object.freeze({ fairness: 0.6, quality: 0.3, placementDepth: 0.1 }),
  officialPolicy: Object.freeze({ name: "official", weights: OFFICIAL_WEIGHTS })
});

export const DUEL_FAIR_V2_LENSES = Object.freeze([
  Object.freeze({
    name: "expansion",
    weights: Object.freeze({ ...OFFICIAL_WEIGHTS, directRoad: 0.9, directSettlement: 1.1, directDevCard: 0.4, directCity: 0.3 })
  }),
  Object.freeze({
    name: "development",
    weights: Object.freeze({ ...OFFICIAL_WEIGHTS, directRoad: 0.3, directSettlement: 0.55, directDevCard: 1.1, directCity: 0.9 })
  })
]);
