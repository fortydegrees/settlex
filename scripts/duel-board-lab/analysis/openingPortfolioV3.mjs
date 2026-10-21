import { ResourceType } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";
import { buildOpeningPortfolio } from "./openingPortfolio.mjs";
import {
  DIRECT_RECIPES,
  directRecipeCapacities,
  directRecipeSurpluses,
  tradeAdjustedRecipeCapacities
} from "./recipeCapacity.mjs";
import { startingResourcesForNode } from "./startingResources.mjs";

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
  const destinationNodeIds = new Set();
  for (const sourceNodeId of orderedNodeIds) {
    for (const transitNodeId of facts.topology.nodeNeighbors[sourceNodeId] ?? []) {
      for (const destinationNodeId of facts.topology.nodeNeighbors[transitNodeId] ?? []) {
        if (destinationNodeId !== sourceNodeId) destinationNodeIds.add(destinationNodeId);
      }
    }
  }
  return Object.freeze({
    ownedNodeMask: idsMask(orderedNodeIds),
    destinationNodeIds: Object.freeze([...destinationNodeIds].sort((left, right) => left - right))
  });
}

export function scoreOpeningPairExpansionV3({
  entry,
  settlementBlockedMask,
  featuresByNodeId,
  profile
}) {
  let best = 0;
  let second = 0;
  for (const nodeId of entry.reachMasks.destinationNodeIds) {
    if ((settlementBlockedMask & nodeMask(nodeId)) !== 0n) continue;
    const feature = featuresByNodeId.get(nodeId);
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

function readinessByRecipe(cards) {
  return Object.freeze(Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, recipe]) => {
    const remainingCards = [...cards];
    const missingResources = [];
    for (const resource of STANDARD_RESOURCES) {
      for (let amount = 0; amount < (recipe[resource] ?? 0); amount += 1) {
        const cardIndex = remainingCards.indexOf(resource);
        if (cardIndex === -1) missingResources.push(resource);
        else remainingCards.splice(cardIndex, 1);
      }
    }
    return [name, Object.freeze({
      canBuyNow: missingResources.length === 0,
      missingCardCount: missingResources.length,
      missingResources: Object.freeze(missingResources),
      remainingCards: Object.freeze(missingResources.length === 0 ? remainingCards : [...cards])
    })];
  })));
}

function buildSharedPair({ facts, context, featuresByNodeId, orderedNodeIds, profile }) {
  const nodesById = new Map(facts.nodes.map((node) => [node.nodeId, node]));
  const nodes = orderedNodeIds.map((nodeId) => nodesById.get(nodeId));
  const productionPips = Object.freeze(Object.fromEntries(STANDARD_RESOURCES.map((resource) => [
    resource,
    nodes[0].resourcePips[resource] + nodes[1].resourcePips[resource]
  ])));
  const ownedPorts = Object.freeze([...new Set(nodes.map((node) => node.port).filter(Boolean))].sort());
  const directRecipeCapacity = Object.freeze(directRecipeCapacities(productionPips));
  const tradeAdjustedRecipeCapacity = Object.freeze(tradeAdjustedRecipeCapacities(
    productionPips,
    ownedPorts,
    { precision: 10 ** -profile.serializationPrecision }
  ));
  const basePortfolio = Object.freeze({
    productionPips,
    totalProductionPips: Object.values(productionPips).reduce((sum, value) => sum + value, 0),
    producedResourceCount: Object.values(productionPips).filter((value) => value > 0).length,
    missingProducedResources: Object.freeze(STANDARD_RESOURCES.filter(
      (resource) => productionPips[resource] === 0
    )),
    ownedPorts,
    directRecipeCapacity,
    directRecipeSurplus: Object.freeze(directRecipeSurpluses(productionPips)),
    tradeAdjustedRecipeCapacity
  });
  const staticWithoutTempo = Object.freeze({
    production: scoreProduction(basePortfolio, context, profile),
    recipeReadiness: scoreRecipes(basePortfolio, profile),
    scarcityAccess: scoreScarcity(basePortfolio, context, profile),
    tradeAndPorts: scoreTradeGain(basePortfolio, profile),
    cityPotential: scoreCityPotential({
      ...basePortfolio,
      settlementNodeIds: orderedNodeIds
    }, featuresByNodeId, profile),
    resilience: scoreResilience(orderedNodeIds, featuresByNodeId, profile)
  });
  return Object.freeze({
    basePortfolio,
    staticWithoutTempo,
    reachMasks: compileReachMasks(facts, orderedNodeIds)
  });
}

export function compileOpeningPairV3({
  facts,
  context,
  featuresByNodeId,
  orderedNodeIds,
  profile,
  sharedPair
}) {
  const shared = sharedPair ?? buildSharedPair({
    facts,
    context,
    featuresByNodeId,
    orderedNodeIds,
    profile
  });
  const startingCards = Object.freeze(startingResourcesForNode(facts, orderedNodeIds[1]));
  const portfolio = Object.freeze({
    settlementNodeIds: Object.freeze([...orderedNodeIds]),
    ...shared.basePortfolio,
    startingCards,
    startingReadiness: readinessByRecipe(startingCards),
    expansion: Object.freeze({ oneRoadNodeIds: Object.freeze([]), twoRoadNodeIds: Object.freeze([]) })
  });
  const staticComponents = Object.freeze({
    production: shared.staticWithoutTempo.production,
    recipeReadiness: shared.staticWithoutTempo.recipeReadiness,
    scarcityAccess: shared.staticWithoutTempo.scarcityAccess,
    startingTempo: scoreStartingTempo(portfolio, profile),
    tradeAndPorts: shared.staticWithoutTempo.tradeAndPorts,
    cityPotential: shared.staticWithoutTempo.cityPotential,
    resilience: shared.staticWithoutTempo.resilience
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
    reachMasks: shared.reachMasks,
    sharedPair: shared
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
  const nodesById = new Map(facts.nodes.map((node) => [node.nodeId, node]));
  const settlementBlockedMask = occupiedNodeIds.reduce(
    (mask, nodeId) => mask | idsMask(nodesById.get(nodeId).blockedNodeIds),
    0n
  );
  const expansion = scoreOpeningPairExpansionV3({
    entry,
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
