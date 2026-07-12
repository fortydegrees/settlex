export const DUEL_FAIR_V1_PROFILE = Object.freeze({
  version: "duel-fair-v1",
  competitiveSpotRatio: 0.75,
  minCompetitiveSpots: 8,
  maxTopSpotCliff: 0.2,
  viableResourceRatio: 0.5,
  minSecondIndependentResourceRatio: 0.5,
  minIndependentResourceRoutes: 2,
  competitivePairRatio: 0.82,
  minDistinctOpeningRoutes: 8,
  routeSearchLimit: 32,
  plausiblePickLimit: 12,
  maxPickCollapse: 0.6,
  weights: Object.freeze({
    topSpotCliff: 0.2,
    competitiveSpotDepth: 0.2,
    resourceContestability: 0.35,
    openingRouteDepth: 0.15,
    pickSensitivity: 0.1
  })
});
