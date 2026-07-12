import {
  buildTopology,
  getNumDots,
  resolveBoardSpec,
  ResourceType,
  TileTypes
} from "@settlex/game-core";

const STANDARD_RESOURCES = Object.freeze([
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
]);

export const CUBE_DIRECTIONS = Object.freeze([
  [1, 0, -1], [-1, 0, 1], [0, 1, -1],
  [0, -1, 1], [1, -1, 0], [-1, 1, 0]
]);

export function buildBoardFacts(tiles) {
  const topology = buildTopology(tiles);
  const landTiles = tiles.filter((tile) => tile.type === TileTypes.LAND);
  const portTiles = tiles.filter((tile) => tile.type === TileTypes.PORT);
  const nodeMap = new Map(topology.landNodeIds.map((nodeId) => [nodeId, {
    nodeId,
    totalPips: 0,
    resourcePips: Object.fromEntries(STANDARD_RESOURCES.map((resource) => [resource, 0])),
    resources: [],
    port: topology.portsByNodeId[nodeId] ?? null,
    blockedNodeIds: [nodeId, ...(topology.nodeNeighbors[nodeId] ?? [])].sort((a, b) => a - b)
  }]));

  for (const tile of landTiles) {
    const resource = tile.tile.resource;
    const number = tile.tile.number;
    if (!STANDARD_RESOURCES.includes(resource) || number == null) continue;
    const pips = getNumDots(number);
    for (const nodeId of Object.values(tile.tile.nodes ?? {})) {
      const node = nodeMap.get(nodeId);
      node.totalPips += pips;
      node.resourcePips[resource] += pips;
      if (!node.resources.includes(resource)) node.resources.push(resource);
    }
  }

  const nodes = [...nodeMap.values()]
    .sort((a, b) => a.nodeId - b.nodeId)
    .map((node) => Object.freeze({
      ...node,
      resourcePips: Object.freeze({ ...node.resourcePips }),
      resources: Object.freeze([...node.resources].sort()),
      blockedNodeIds: Object.freeze([...node.blockedNodeIds])
    }));
  const legalPairs = [];
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      if (!nodes[left].blockedNodeIds.includes(nodes[right].nodeId)) {
        legalPairs.push([nodes[left].nodeId, nodes[right].nodeId]);
      }
    }
  }

  return Object.freeze({
    tiles,
    topology,
    nodes: Object.freeze(nodes),
    legalPairs: Object.freeze(legalPairs.map((pair) => Object.freeze(pair))),
    totalProductionByResource: Object.freeze(sumResourcePips(nodes)),
    redAdjacencyPairs: Object.freeze(findRedAdjacencyPairs(landTiles).map((pair) => Object.freeze(pair))),
    validityErrors: Object.freeze(validateStandardCounts({ landTiles, portTiles }))
  });
}

function sumResourcePips(nodes) {
  return Object.fromEntries(STANDARD_RESOURCES.map((resource) => [
    resource,
    nodes.reduce((sum, node) => sum + node.resourcePips[resource], 0) / 6
  ]));
}

function validateStandardCounts({ landTiles, portTiles }) {
  const errors = [];
  const spec = resolveBoardSpec("standard-4p");
  if (landTiles.length !== 19) errors.push("land-count");
  if (portTiles.length !== 9) errors.push("port-count");
  if (landTiles.filter((tile) => tile.tile.number != null).length !== 18) errors.push("number-count");
  const resources = spec.resources();
  for (const resource of new Set(resources)) {
    const expected = resources.filter((value) => value === resource).length;
    const actual = landTiles.filter((tile) => tile.tile.resource === resource).length;
    if (actual !== expected) errors.push(`resource-count:${resource}`);
  }
  if (multisetSignature(landTiles.map((tile) => tile.tile.number).filter((number) => number != null)) !== multisetSignature(spec.rollNumbers())) {
    errors.push("number-multiset");
  }
  if (multisetSignature(portTiles.map((tile) => tile.tile.resource)) !== multisetSignature(spec.portCounts())) {
    errors.push("port-resource-multiset");
  }
  return errors.sort();
}

function multisetSignature(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right))).join("|");
}

function findRedAdjacencyPairs(landTiles) {
  const byCoordinate = new Map(landTiles.map((tile) => [tile.coordinate.join(","), tile]));
  const pairs = [];
  for (const tile of landTiles) {
    if (![6, 8].includes(tile.tile.number)) continue;
    for (const direction of CUBE_DIRECTIONS) {
      const coordinate = tile.coordinate.map((value, index) => value + direction[index]);
      const neighbour = byCoordinate.get(coordinate.join(","));
      if (neighbour && [6, 8].includes(neighbour.tile.number) && tile.tile.id < neighbour.tile.id) {
        pairs.push([tile.tile.id, neighbour.tile.id]);
      }
    }
  }
  return pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
