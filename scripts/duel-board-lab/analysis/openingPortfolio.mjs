import { ResourceType } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";
import { startingResourcesForNode } from "./startingResources.mjs";
import {
  DIRECT_RECIPES,
  directRecipeCapacities,
  directRecipeSurpluses,
  tradeAdjustedRecipeCapacities
} from "./recipeCapacity.mjs";

const RECIPE_RESOURCE_ORDER = Object.freeze([
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
]);

const nodeMask = (nodeId) => 1n << BigInt(nodeId);

function idsMask(nodeIds) {
  return nodeIds.reduce((mask, nodeId) => mask | nodeMask(nodeId), 0n);
}

function freezePath(path) {
  return Object.freeze(path);
}

export function compileExpansionPaths(facts, orderedNodeIds) {
  const nodeIds = Object.freeze([...orderedNodeIds]);
  const knownNodeIds = new Set(facts.nodes.map((node) => node.nodeId));
  if (nodeIds.some((nodeId) => !knownNodeIds.has(nodeId))) throw new Error("unknown opening node");

  const blockedNodeMasks = [];
  for (const node of facts.nodes) blockedNodeMasks[node.nodeId] = idsMask(node.blockedNodeIds);

  const oneRoadPaths = [];
  const twoRoadPaths = [];
  for (const sourceNodeId of [...nodeIds].sort((left, right) => left - right)) {
    const transitNodeIds = [...(facts.topology.nodeNeighbors[sourceNodeId] ?? [])]
      .sort((left, right) => left - right);
    for (const transitNodeId of transitNodeIds) {
      oneRoadPaths.push(freezePath({
        sourceNodeId,
        destinationNodeId: transitNodeId,
        destinationMask: nodeMask(transitNodeId)
      }));
      const destinationNodeIds = [...(facts.topology.nodeNeighbors[transitNodeId] ?? [])]
        .filter((destinationNodeId) => destinationNodeId !== sourceNodeId)
        .sort((left, right) => left - right);
      for (const destinationNodeId of destinationNodeIds) {
        twoRoadPaths.push(freezePath({
          sourceNodeId,
          transitNodeId,
          destinationNodeId,
          transitMask: nodeMask(transitNodeId),
          destinationMask: nodeMask(destinationNodeId)
        }));
      }
    }
  }

  return Object.freeze({
    orderedNodeIds: nodeIds,
    ownedNodeMask: idsMask(nodeIds),
    blockedNodeMasks: Object.freeze(blockedNodeMasks),
    oneRoadPaths: Object.freeze(oneRoadPaths),
    twoRoadPaths: Object.freeze(twoRoadPaths)
  });
}

function sortedNodeIdsFromMask(facts, mask) {
  return facts.nodes
    .map((node) => node.nodeId)
    .filter((nodeId) => (mask & nodeMask(nodeId)) !== 0n)
    .sort((left, right) => left - right);
}

export function measureExpansionReach(facts, orderedNodeIds, occupiedNodeIds, compiledPaths) {
  const compiled = compiledPaths ?? compileExpansionPaths(facts, orderedNodeIds);
  const occupiedMask = idsMask(occupiedNodeIds);
  const opponentMask = occupiedMask & ~compiled.ownedNodeMask;
  const settlementBlockedMask = occupiedNodeIds.reduce((mask, nodeId) => {
    const blockedMask = compiled.blockedNodeMasks[nodeId];
    if (blockedMask === undefined) throw new Error("unknown occupied node");
    return mask | blockedMask;
  }, 0n);

  let oneRoadMask = 0n;
  for (const path of compiled.oneRoadPaths) {
    if ((path.destinationMask & occupiedMask) === 0n) oneRoadMask |= path.destinationMask;
  }

  let twoRoadMask = 0n;
  for (const path of compiled.twoRoadPaths) {
    if ((path.transitMask & opponentMask) !== 0n) continue;
    if ((path.destinationMask & occupiedMask) !== 0n) continue;
    if ((path.destinationMask & settlementBlockedMask) !== 0n) continue;
    twoRoadMask |= path.destinationMask;
  }

  return Object.freeze({
    oneRoadNodeIds: Object.freeze(sortedNodeIdsFromMask(facts, oneRoadMask)),
    twoRoadNodeIds: Object.freeze(sortedNodeIdsFromMask(facts, twoRoadMask))
  });
}

function readinessByRecipe(cards) {
  return Object.freeze(Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, recipe]) => {
    const remainingCards = [...cards];
    const missingResources = [];
    for (const resource of RECIPE_RESOURCE_ORDER) {
      const amount = recipe[resource] ?? 0;
      for (let index = 0; index < amount; index += 1) {
        const cardIndex = remainingCards.indexOf(resource);
        if (cardIndex === -1) missingResources.push(resource);
        else remainingCards.splice(cardIndex, 1);
      }
    }
    const canBuyNow = missingResources.length === 0;
    return [name, Object.freeze({
      canBuyNow,
      missingCardCount: missingResources.length,
      missingResources: Object.freeze(missingResources),
      remainingCards: Object.freeze(canBuyNow ? remainingCards : [...cards])
    })];
  })));
}

export function buildOpeningPortfolio(
  facts,
  [firstNodeId, secondNodeId],
  { occupiedNodeIds, precision }
) {
  const byId = new Map(facts.nodes.map((node) => [node.nodeId, node]));
  const first = byId.get(firstNodeId);
  const second = byId.get(secondNodeId);
  if (!first || !second) throw new Error("unknown opening node");
  if (first.blockedNodeIds.includes(secondNodeId)) throw new Error("illegal opening pair");

  const productionPips = Object.fromEntries(STANDARD_RESOURCES.map((resource) => [
    resource,
    first.resourcePips[resource] + second.resourcePips[resource]
  ]));
  const ownedPorts = [...new Set([first.port, second.port].filter(Boolean))].sort();
  const startingCards = startingResourcesForNode(facts, secondNodeId);
  const startingReadiness = readinessByRecipe(startingCards);

  return Object.freeze({
    settlementNodeIds: Object.freeze([firstNodeId, secondNodeId]),
    productionPips: Object.freeze(productionPips),
    totalProductionPips: Object.values(productionPips).reduce((sum, value) => sum + value, 0),
    producedResourceCount: Object.values(productionPips).filter((value) => value > 0).length,
    missingProducedResources: Object.freeze(
      STANDARD_RESOURCES.filter((resource) => productionPips[resource] === 0)
    ),
    startingCards: Object.freeze(startingCards),
    ownedPorts: Object.freeze(ownedPorts),
    directRecipeCapacity: Object.freeze(directRecipeCapacities(productionPips)),
    directRecipeSurplus: Object.freeze(directRecipeSurpluses(productionPips)),
    tradeAdjustedRecipeCapacity: Object.freeze(
      tradeAdjustedRecipeCapacities(productionPips, ownedPorts, { precision })
    ),
    startingReadiness,
    expansion: measureExpansionReach(facts, [firstNodeId, secondNodeId], occupiedNodeIds)
  });
}
