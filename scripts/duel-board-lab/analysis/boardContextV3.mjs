import { getNumDots, ResourceType, TileTypes } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function shortestDistance(topology, startNodeId, endNodeId) {
  if (startNodeId === endNodeId) return 0;
  const visited = new Set([startNodeId]);
  let frontier = [startNodeId];
  for (let distance = 1; frontier.length > 0; distance += 1) {
    const next = [];
    for (const nodeId of frontier) {
      for (const neighbourId of topology.nodeNeighbors[nodeId] ?? []) {
        if (visited.has(neighbourId)) continue;
        if (neighbourId === endNodeId) return distance;
        visited.add(neighbourId);
        next.push(neighbourId);
      }
    }
    frontier = next;
  }
  return Number.POSITIVE_INFINITY;
}

function accessRegions(facts, resource, viableNodes, maximumDistance) {
  const parent = new Map(viableNodes.map((node) => [node.nodeId, node.nodeId]));
  const find = (nodeId) => {
    let root = nodeId;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(nodeId) !== nodeId) {
      const next = parent.get(nodeId);
      parent.set(nodeId, root);
      nodeId = next;
    }
    return root;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(Math.max(leftRoot, rightRoot), Math.min(leftRoot, rightRoot));
  };

  for (let left = 0; left < viableNodes.length; left += 1) {
    for (let right = left + 1; right < viableNodes.length; right += 1) {
      if (shortestDistance(
        facts.topology,
        viableNodes[left].nodeId,
        viableNodes[right].nodeId
      ) <= maximumDistance) {
        union(viableNodes[left].nodeId, viableNodes[right].nodeId);
      }
    }
  }

  const producingTiles = facts.tiles.filter((tile) =>
    tile.type === TileTypes.LAND &&
    tile.tile.resource === resource &&
    tile.tile.number !== null
  );
  const regionNodes = new Map();
  for (const node of viableNodes) {
    const root = find(node.nodeId);
    if (!regionNodes.has(root)) regionNodes.set(root, []);
    regionNodes.get(root).push(node.nodeId);
  }

  return [...regionNodes.values()]
    .map((nodeIds) => {
      const nodeSet = new Set(nodeIds);
      const tilePips = producingTiles.reduce((sum, tile) => {
        const touchesRegion = Object.values(tile.tile.nodes ?? {}).some((nodeId) => nodeSet.has(nodeId));
        return sum + (touchesRegion ? getNumDots(tile.tile.number) : 0);
      }, 0);
      return Object.freeze({
        nodeIds: Object.freeze([...nodeIds].sort((left, right) => left - right)),
        tilePips
      });
    })
    .sort((left, right) => right.tilePips - left.tilePips || left.nodeIds[0] - right.nodeIds[0]);
}

function hasCompletePortTopology(facts) {
  const portNodes = facts.nodes.filter((node) => node.port !== null);
  return portNodes.length === 18 && portNodes.every(
    (node) => facts.topology.portsByNodeId[node.nodeId] === node.port
  );
}

function canCompleteOpeningDraft(facts) {
  const nodesById = new Map(facts.nodes.map((node) => [node.nodeId, node]));
  for (const [p1First, p1Second] of facts.legalPairs) {
    const p1Blocked = new Set([
      ...nodesById.get(p1First).blockedNodeIds,
      ...nodesById.get(p1Second).blockedNodeIds
    ]);
    const p2Nodes = facts.nodes.filter((node) => !p1Blocked.has(node.nodeId));
    for (let left = 0; left < p2Nodes.length; left += 1) {
      for (let right = left + 1; right < p2Nodes.length; right += 1) {
        if (!p2Nodes[left].blockedNodeIds.includes(p2Nodes[right].nodeId)) return true;
      }
    }
  }
  return false;
}

export function validateDuelBoardStructureV3(facts) {
  const errors = [...facts.validityErrors];
  if (!hasCompletePortTopology(facts)) errors.push("port-topology");
  if (facts.legalPairs.length === 0 || !canCompleteOpeningDraft(facts)) {
    errors.push("no-legal-opening-draft");
  }
  return [...new Set(errors)].sort();
}

export function buildBoardContextV3(facts, profile) {
  const producingTiles = facts.tiles.filter((tile) =>
    tile.type === TileTypes.LAND &&
    STANDARD_RESOURCES.includes(tile.tile.resource) &&
    tile.tile.number !== null
  );
  const expectedPipsPerTile = producingTiles.reduce(
    (sum, tile) => sum + getNumDots(tile.tile.number),
    0
  ) / producingTiles.length;
  const genericPortNodeIds = Object.freeze(facts.nodes
    .filter((node) => node.port === ResourceType.ANY)
    .map((node) => node.nodeId)
    .sort((left, right) => left - right));

  const byResource = Object.fromEntries(STANDARD_RESOURCES.map((resource) => {
    const resourceTiles = producingTiles.filter((tile) => tile.tile.resource === resource);
    const tilePips = resourceTiles.reduce((sum, tile) => sum + getNumDots(tile.tile.number), 0);
    const pipsPerTile = tilePips / resourceTiles.length;
    const scarcityMultiplier = clamp(
      expectedPipsPerTile / pipsPerTile,
      profile.scarcity.minimum,
      profile.scarcity.maximum
    );
    const accessNodes = facts.nodes
      .filter((node) => node.resourcePips[resource] > 0)
      .sort((left, right) =>
        right.resourcePips[resource] - left.resourcePips[resource] || left.nodeId - right.nodeId
      );
    const viableThreshold = Math.max(
      profile.contextRules.viableAccessMinimumPips,
      (accessNodes[0]?.resourcePips[resource] ?? 0) * profile.contextRules.viableAccessBestRatio
    );
    const viableNodes = accessNodes.filter((node) => node.resourcePips[resource] >= viableThreshold);
    const regions = accessRegions(
      facts,
      resource,
      viableNodes,
      profile.contextRules.accessRegionMaximumDistance
    );
    const bestNode = accessNodes[0] ?? null;
    const bestRegion = regions.find((region) => region.nodeIds.includes(bestNode?.nodeId)) ?? null;
    const independentNodes = viableNodes.filter((node) => !bestRegion?.nodeIds.includes(node.nodeId));
    const secondIndependent = independentNodes[0] ?? null;

    return [resource, Object.freeze({
      tileCount: resourceTiles.length,
      tilePips,
      pipsPerTile,
      scarcityMultiplier,
      bestNodeId: bestNode?.nodeId ?? null,
      bestNodePips: bestNode?.resourcePips[resource] ?? 0,
      secondIndependentNodeId: secondIndependent?.nodeId ?? null,
      secondIndependentNodePips: secondIndependent?.resourcePips[resource] ?? 0,
      accessRegionCount: regions.length,
      concentration: clamp((regions[0]?.tilePips ?? 0) / tilePips, 0, 1),
      independentAccessDistance: secondIndependent === null
        ? null
        : shortestDistance(facts.topology, bestNode.nodeId, secondIndependent.nodeId),
      matchingPortNodeIds: Object.freeze(facts.nodes
        .filter((node) => node.port === resource)
        .map((node) => node.nodeId)
        .sort((left, right) => left - right)),
      genericPortNodeIds
    })];
  }));

  return Object.freeze({
    expectedPipsPerTile,
    byResource: Object.freeze(byResource),
    structuralErrors: Object.freeze(validateDuelBoardStructureV3(facts))
  });
}
