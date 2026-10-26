// Point-up hex geometry: https://www.redblobgames.com/grids/hexagons/
export const SQRT3 = Math.sqrt(3);

export function cubeToAxial(cube) {
  return { q: cube[0], r: cube[2] };
}

export function tilePixelVector(cube, radius, centerX, centerY) {
  const { q, r } = cubeToAxial(cube);
  const width = SQRT3 * radius;
  return [centerX + width * (q + r / 2), centerY + radius * 1.5 * r];
}

// Clockwise vertices, in units of half-width and quarter-height.
const VERTICES = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];
const NODE_DIRECTIONS = ["NORTH", "NORTHEAST", "SOUTHEAST", "SOUTH", "SOUTHWEST", "NORTHWEST"];
const EDGE_DIRECTIONS = ["NORTHEAST", "EAST", "SOUTHEAST", "SOUTHWEST", "WEST", "NORTHWEST"];

function directionIndex(directions, direction) {
  const index = directions.indexOf(direction);
  if (index < 0) throw new Error(`Unknown hex direction: ${direction}`);
  return index;
}

export function getNodeDelta(direction, width, height) {
  const [x, y] = VERTICES[directionIndex(NODE_DIRECTIONS, direction)];
  return [x * width / 2, y * height / 4];
}

export function getEdgeDelta(direction, width, height) {
  const index = directionIndex(EDGE_DIRECTIONS, direction);
  const start = VERTICES[index];
  const end = VERTICES[(index + 1) % VERTICES.length];
  return [(start[0] + end[0]) * width / 4, (start[1] + end[1]) * height / 8];
}

export function getEdgeTransform(direction, radius) {
  const rotation = 30 + 60 * directionIndex(EDGE_DIRECTIONS, direction);
  // Preserve the road artwork's tuned inset from the tile centre.
  const inset = radius * 0.865;
  return `translateX(-50%) translateY(-50%) rotate(${rotation}deg) translateY(${-inset}px)`;
}
