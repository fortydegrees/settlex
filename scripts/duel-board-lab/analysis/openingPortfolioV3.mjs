import { ResourceType } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";
import {
  buildOpeningPortfolio,
  compileExpansionPaths,
  measureExpansionReach
} from "./openingPortfolio.mjs";
import { DIRECT_RECIPES } from "./recipeCapacity.mjs";

const RECIPE_NAMES = Object.freeze({
  road: "road",
  settlement: "settlement",
  devCard: "dev",
  city: "city"
});

const clampScore = (value) => Math.min(100, Math.max(0, value));
const nodeMask = (nodeId) => 1n << BigInt(nodeId);
const idsMask = (nodeIds) => nodeIds.reduce((mask, nodeId) => mask | nodeMask(nodeId), 0n);

function scoreProduction(portfolio, context, profile) {
  const value = STANDARD_RESOURCES.reduce((sum, resource) => (
    sum + portfolio.productionPips[resource]
      * profile.resourceWeights[resource]
      * context.byResource[resource].scarcityMultiplier
  ), 0);
  return clampScore(value / profile.componentTargets.weightedProduction * 100);
}

function scoreRecipes(portfolio, profile) {
  return Object.entries(RECIPE_NAMES).reduce((sum, [portfolioName, profileName]) => {
    const capacity = Math.max(
      portfolio.directRecipeCapacity[portfolioName],
      portfolio.tradeAdjustedRecipeCapacity[portfolioName]
        * profile.tradeAdjustedRecipeDiscount
    );
    return sum + clampScore(
      capacity / profile.recipeCapacityTargets[profileName] * 100
    ) * profile.recipeWeights[profileName];
  }, 0);
}

function scoreScarcity(portfolio, context, profile) {
  const value = STANDARD_RESOURCES.reduce((sum, resource) => {
    const usefulAccess = Math.min(
      portfolio.productionPips[resource],
      context.byResource[resource].bestNodePips
    );
    return sum + usefulAccess
      * Math.max(0, context.byResource[resource].scarcityMultiplier - profile.scarcity.minimum)
      * profile.resourceWeights[resource];
  }, 0);
  return clampScore(value / profile.componentTargets.scarcityAccess * 100);
}

function scoreStartingTempo(portfolio, profile) {
  return Object.entries(RECIPE_NAMES).reduce((sum, [portfolioName, profileName]) => {
    const recipeCardCount = Object.values(DIRECT_RECIPES[portfolioName])
      .reduce((total, amount) => total + amount, 0);
    const readiness = portfolio.startingReadiness[portfolioName];
    const completion = 1 - readiness.missingCardCount / recipeCardCount;
    return sum + clampScore(completion * 100) * profile.recipeWeights[profileName];
  }, 0);
}

function scoreTradeGain(portfolio, profile) {
  const gain = Object.entries(RECIPE_NAMES).reduce((sum, [portfolioName, profileName]) => (
    sum + Math.max(
      0,
      portfolio.tradeAdjustedRecipeCapacity[portfolioName]
        - portfolio.directRecipeCapacity[portfolioName]
    ) * profile.recipeWeights[profileName]
  ), 0);
  return clampScore(gain / profile.componentTargets.tradeCapacityGain * 100);
}

function scoreCityPotential(portfolio, featuresByNodeId, profile) {
  const uplift = Math.max(...portfolio.settlementNodeIds.map(
    (nodeId) => featuresByNodeId.get(nodeId).cityUplift
  ));
  const capacityFactor = Math.min(
    1,
    portfolio.directRecipeCapacity.city / profile.recipeCapacityTargets.city
  );
  return clampScore(uplift * capacityFactor / profile.componentTargets.cityUplift * 100);
}

function scoreResilience(orderedNodeIds, featuresByNodeId, profile) {
  const contributionByTile = new Map();
  for (const nodeId of orderedNodeIds) {
    for (const contribution of featuresByNodeId.get(nodeId).producingTileContributions) {
      contributionByTile.set(
        contribution.tileId,
        (contributionByTile.get(contribution.tileId) ?? 0) + contribution.weightedPips
      );
    }
  }
  const worstLoss = Math.max(0, ...contributionByTile.values());
  return clampScore((1 - worstLoss / profile.componentTargets.robberLoss) * 100);
}

function compileReachMasks(facts, orderedNodeIds) {
  const compiled = compileExpansionPaths(facts, orderedNodeIds);
  const destinationsByTransit = new Map();
  for (const path of compiled.twoRoadPaths) {
    destinationsByTransit.set(
      path.transitNodeId,
      (destinationsByTransit.get(path.transitNodeId) ?? 0n) | path.destinationMask
    );
  }
  return Object.freeze({
    ownedNodeMask: compiled.ownedNodeMask,
    twoRoadTransitGroups: Object.freeze([...destinationsByTransit.entries()]
      .sort(([left], [right]) => left - right)
      .map(([transitNodeId, destinationMask]) => Object.freeze({
        transitMask: nodeMask(transitNodeId),
        destinationMask
      })))
  });
}

export function scoreOpeningPairExpansionV3({
  entry,
  occupiedMask,
  settlementBlockedMask,
  featuresByNodeId,
  profile
}) {
  const opponentMask = occupiedMask & ~entry.reachMasks.ownedNodeMask;
  let destinationMask = 0n;
  for (const group of entry.reachMasks.twoRoadTransitGroups) {
    if ((group.transitMask & opponentMask) === 0n) destinationMask |= group.destinationMask;
  }
  destinationMask &= ~occupiedMask & ~settlementBlockedMask;
  let best = 0;
  let second = 0;
  for (const [nodeId, feature] of featuresByNodeId) {
    if ((destinationMask & nodeMask(nodeId)) === 0n) continue;
    const value = feature.scarcityWeightedProduction;
    if (value > best) {
      second = best;
      best = value;
    } else if (value > second) {
      second = value;
    }
  }
  return clampScore(
    (best + 0.5 * second) / profile.componentTargets.expansionGain * 100
  );
}

export function compileOpeningPairV3({
  facts,
  context,
  featuresByNodeId,
  orderedNodeIds,
  profile
}) {
  const portfolio = buildOpeningPortfolio(facts, orderedNodeIds, {
    occupiedNodeIds: orderedNodeIds,
    precision: 10 ** -profile.serializationPrecision
  });
  const staticComponents = Object.freeze({
    production: scoreProduction(portfolio, context, profile),
    recipeReadiness: scoreRecipes(portfolio, profile),
    scarcityAccess: scoreScarcity(portfolio, context, profile),
    startingTempo: scoreStartingTempo(portfolio, profile),
    tradeAndPorts: scoreTradeGain(portfolio, profile),
    cityPotential: scoreCityPotential(portfolio, featuresByNodeId, profile),
    resilience: scoreResilience(orderedNodeIds, featuresByNodeId, profile)
  });
  const staticValue = Object.entries(staticComponents).reduce(
    (sum, [name, amount]) => sum + amount * profile.portfolioWeights[name],
    0
  );
  return Object.freeze({
    orderedNodeIds: Object.freeze([...orderedNodeIds]),
    portfolio,
    staticComponents,
    staticValue,
    reachMasks: compileReachMasks(facts, orderedNodeIds)
  });
}

export function valueOpeningPairMatchupV3({ entry, expansionScore, profile }) {
  return entry.staticValue + expansionScore * profile.portfolioWeights.expansion;
}

export function materialiseOpeningPairV3({
  facts,
  featuresByNodeId,
  entry,
  occupiedNodeIds,
  profile
}) {
  const portfolio = buildOpeningPortfolio(facts, entry.orderedNodeIds, {
    occupiedNodeIds,
    precision: 10 ** -profile.serializationPrecision
  });
  const occupiedMask = idsMask(occupiedNodeIds);
  const nodesById = new Map(facts.nodes.map((node) => [node.nodeId, node]));
  const settlementBlockedMask = occupiedNodeIds.reduce(
    (mask, nodeId) => mask | idsMask(nodesById.get(nodeId).blockedNodeIds),
    0n
  );
  const expansion = scoreOpeningPairExpansionV3({
    entry,
    occupiedMask,
    settlementBlockedMask,
    featuresByNodeId,
    profile
  });
  const components = Object.freeze({ ...entry.staticComponents, expansion });
  const value = Object.entries(components).reduce(
    (sum, [name, amount]) => sum + amount * profile.portfolioWeights[name],
    0
  );
  return Object.freeze({ ...portfolio, components, value });
}

export function measureOpeningExpansionV3(facts, orderedNodeIds, occupiedNodeIds) {
  return measureExpansionReach(facts, orderedNodeIds, occupiedNodeIds);
}
