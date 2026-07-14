import { getNumDots, ResourceType, TileTypes } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";

const geometricMean = (values) => Math.pow(
  values.reduce((product, value) => product * value, 1),
  1 / values.length
);

function producingTilesByNode(facts, context, profile) {
  const byNodeId = new Map(facts.nodes.map((node) => [node.nodeId, []]));
  for (const tile of facts.tiles) {
    const resource = tile.tile?.resource;
    const number = tile.tile?.number;
    if (
      tile.type !== TileTypes.LAND ||
      !STANDARD_RESOURCES.includes(resource) ||
      number === null
    ) continue;
    const pips = getNumDots(number);
    const weightedPips = pips
      * profile.resourceWeights[resource]
      * context.byResource[resource].scarcityMultiplier;
    for (const nodeId of Object.values(tile.tile.nodes ?? {})) {
      byNodeId.get(nodeId)?.push(Object.freeze({
        tileId: tile.tile.id,
        resource,
        number,
        pips,
        weightedPips
      }));
    }
  }
  for (const contributions of byNodeId.values()) {
    contributions.sort((left, right) => String(left.tileId).localeCompare(String(right.tileId)));
  }
  return byNodeId;
}

function enumerateExpansionDestinations(facts, sourceNodeId, edgeCount, featureByNodeId) {
  const destinations = new Map();
  const source = featureByNodeId.get(sourceNodeId);
  const blockedDestinations = new Set(
    facts.nodes.find((node) => node.nodeId === sourceNodeId)?.blockedNodeIds ?? [sourceNodeId]
  );
  const walk = (path) => {
    if (path.length === edgeCount + 1) {
      const destinationNodeId = path[path.length - 1];
      if (blockedDestinations.has(destinationNodeId)) return;
      const firstEdgeNodeId = path[1];
      const current = destinations.get(destinationNodeId) ?? new Set();
      current.add(firstEdgeNodeId);
      destinations.set(destinationNodeId, current);
      return;
    }
    const currentNodeId = path[path.length - 1];
    for (const neighbourId of facts.topology.nodeNeighbors[currentNodeId] ?? []) {
      if (path.includes(neighbourId)) continue;
      walk([...path, neighbourId]);
    }
  };
  walk([sourceNodeId]);
  return [...destinations.entries()]
    .map(([nodeId, firstEdges]) => ({
      nodeId,
      gain: featureByNodeId.get(nodeId)?.scarcityWeightedProduction ?? 0,
      routeCount: firstEdges.size
    }))
    .sort((left, right) => right.gain - left.gain || left.nodeId - right.nodeId);
}

function recipeLens(resourcePips, resources, offset) {
  return geometricMean(resources.map((resource) => resourcePips[resource] + offset));
}

export function buildSettlementFeaturesV3(facts, context, profile) {
  const tileContributionsByNodeId = producingTilesByNode(facts, context, profile);
  const baseFeatures = facts.nodes.map((node) => {
    const adjustedResourcePips = Object.freeze(Object.fromEntries(STANDARD_RESOURCES.map(
      (resource) => [
        resource,
        node.resourcePips[resource]
          * profile.resourceWeights[resource]
          * context.byResource[resource].scarcityMultiplier
      ]
    )));
    const scarcityWeightedProduction = Object.values(adjustedResourcePips)
      .reduce((sum, value) => sum + value, 0);
    const producingTileContributions = Object.freeze([
      ...(tileContributionsByNodeId.get(node.nodeId) ?? [])
    ]);
    const offset = profile.settlementRules.geometricMeanOffset;
    const matchingPortValue = STANDARD_RESOURCES.includes(node.port)
      ? adjustedResourcePips[node.port] / 2
      : 0;
    const genericPortValue = node.port === ResourceType.ANY
      ? scarcityWeightedProduction / 3
      : 0;
    const roadLens = recipeLens(
      adjustedResourcePips,
      [ResourceType.WOOD, ResourceType.BRICK],
      offset
    );
    const settlementLens = recipeLens(
      adjustedResourcePips,
      [ResourceType.WOOD, ResourceType.BRICK, ResourceType.SHEEP, ResourceType.WHEAT],
      offset
    );
    const devLens = recipeLens(
      adjustedResourcePips,
      [ResourceType.SHEEP, ResourceType.WHEAT, ResourceType.ORE],
      offset
    );
    const cityLens = geometricMean([
      adjustedResourcePips[ResourceType.WHEAT] / 2 + offset,
      adjustedResourcePips[ResourceType.ORE] / 3 + offset
    ]);

    return {
      nodeId: node.nodeId,
      totalProduction: node.totalPips,
      resourcePips: node.resourcePips,
      adjustedResourcePips,
      producedResourceCount: STANDARD_RESOURCES.filter((resource) => node.resourcePips[resource] > 0).length,
      numberDiversity: new Set(producingTileContributions.map((tile) => tile.number)).size,
      weightedProduction: STANDARD_RESOURCES.reduce(
        (sum, resource) => sum + node.resourcePips[resource] * profile.resourceWeights[resource],
        0
      ),
      scarcityWeightedProduction,
      resourceLens: Object.freeze(Object.fromEntries(STANDARD_RESOURCES.map((resource) => [
        resource,
        node.resourcePips[resource] * context.byResource[resource].scarcityMultiplier
      ]))),
      matchingPortValue,
      genericPortValue,
      portValue: matchingPortValue + genericPortValue,
      cityUplift: scarcityWeightedProduction,
      worstSingleTileLoss: producingTileContributions.reduce(
        (maximum, tile) => Math.max(maximum, tile.weightedPips),
        0
      ),
      roadLens,
      settlementLens,
      devLens,
      cityLens,
      recipeOpportunity: roadLens + settlementLens + devLens + cityLens,
      producingTileContributions
    };
  });
  const featureByNodeId = new Map(baseFeatures.map((feature) => [feature.nodeId, feature]));

  return Object.freeze(baseFeatures.map((feature) => {
    const node = facts.nodes.find((candidate) => candidate.nodeId === feature.nodeId);
    const deniedValues = node.blockedNodeIds
      .filter((nodeId) => nodeId !== feature.nodeId)
      .map((nodeId) => featureByNodeId.get(nodeId)?.scarcityWeightedProduction ?? 0)
      .sort((left, right) => right - left);
    const denialLens = Math.min(
      (deniedValues[0] ?? 0) + (deniedValues[1] ?? 0),
      feature.scarcityWeightedProduction * profile.settlementRules.denialProductionCap
    );
    const oneRoad = enumerateExpansionDestinations(facts, feature.nodeId, 2, featureByNodeId);
    const twoRoad = enumerateExpansionDestinations(facts, feature.nodeId, 3, featureByNodeId);
    const routeRedundancy = Math.min(
      profile.settlementRules.routeRedundancyCap,
      Math.max(twoRoad[0]?.routeCount ?? 0, twoRoad[1]?.routeCount ?? 0)
    );
    const bestOneRoadGain = oneRoad[0]?.gain ?? 0;
    const secondOneRoadGain = oneRoad[1]?.gain ?? 0;
    const bestTwoRoadGain = twoRoad[0]?.gain ?? 0;
    const secondTwoRoadGain = twoRoad[1]?.gain ?? 0;
    const expansionLens = bestOneRoadGain
      + 0.5 * secondOneRoadGain
      + 0.5 * bestTwoRoadGain
      + 0.25 * secondTwoRoadGain
      + 0.5 * routeRedundancy;

    return Object.freeze({
      ...feature,
      denialLens,
      bestOneRoadGain,
      secondOneRoadGain,
      bestTwoRoadGain,
      secondTwoRoadGain,
      expansionRouteRedundancy: routeRedundancy,
      expansionLens
    });
  }));
}
