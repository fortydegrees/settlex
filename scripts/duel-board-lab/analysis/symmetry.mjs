import { createHash } from "node:crypto";

const rotate = ([x, y, z]) => [-z, -x, -y];
const reflect = ([x, y, z]) => [x, z, y];

export function transformCoordinate(coordinate, transformIndex) {
  if (!Number.isInteger(transformIndex) || transformIndex < 0 || transformIndex > 11) {
    throw new Error("transformIndex must be an integer from 0 to 11");
  }
  let result = transformIndex >= 6 ? reflect(coordinate) : [...coordinate];
  for (let turn = 0; turn < transformIndex % 6; turn += 1) result = rotate(result);
  return result;
}

export function transformTiles(tiles, transformIndex) {
  return tiles.map((tile) => ({
    ...tile,
    coordinate: transformCoordinate(tile.coordinate, transformIndex),
    tile: { ...tile.tile }
  }));
}

function sortedEntries(value) {
  if (Array.isArray(value)) return [...value].map(String).sort();
  return Object.entries(value ?? {}).sort(([left], [right]) => left.localeCompare(right));
}

function serialiseRaw(tiles) {
  return JSON.stringify([...tiles]
    .sort((left, right) => left.coordinate.join(",").localeCompare(right.coordinate.join(",")) || left.type.localeCompare(right.type))
    .map((tile) => ({
      coordinate: [...tile.coordinate],
      type: tile.type,
      id: tile.tile.id,
      resource: tile.tile.resource ?? null,
      number: tile.tile.number ?? null,
      direction: tile.tile.direction ?? null,
      nodes: sortedEntries(tile.tile.nodes),
      edges: sortedEntries(tile.tile.edges)
    })));
}

function serialiseCanonicalContent(tiles) {
  return JSON.stringify(tiles
    .map((tile) => ({
      coordinate: [...tile.coordinate],
      type: tile.type,
      resource: tile.tile.resource ?? null,
      number: tile.tile.number ?? null
    }))
    .sort((left, right) => left.coordinate.join(",").localeCompare(right.coordinate.join(",")) || left.type.localeCompare(right.type)));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export const hashBoard = (tiles) => sha256(serialiseRaw(tiles));

export function canonicalBoardHash(tiles) {
  const representations = Array.from({ length: 12 }, (_, index) => serialiseCanonicalContent(transformTiles(tiles, index)));
  representations.sort();
  return sha256(representations[0]);
}
