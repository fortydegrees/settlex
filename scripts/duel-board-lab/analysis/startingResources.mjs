import { ResourceType, TileTypes } from "@settlex/game-core";

const NON_STARTING_RESOURCES = new Set([ResourceType.DESERT, ResourceType.EMPTY]);

export function startingResourcesForNode(facts, nodeId) {
  return facts.tiles
    .filter((tile) => tile.type === TileTypes.LAND)
    .filter((tile) => Object.values(tile.tile.nodes ?? {}).includes(nodeId))
    .filter((tile) => tile.tile.resource && !NON_STARTING_RESOURCES.has(tile.tile.resource))
    .sort((left, right) => left.tile.id - right.tile.id)
    .map((tile) => tile.tile.resource);
}
