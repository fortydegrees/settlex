const SQRT3 = 1.73205080757;
export const BOARD_UNDERLAY_DESIGN_SIZE = 100;
export const STANDARD_BOARD_RADIUS = 2;

const BOARD_UNDERLAY_LAYER_SPEC = Object.freeze({
  outerBlue: { offset: 52, radius: 52, fill: "#A9DCF5" },
  paleSurf: { offset: 40, radius: 44, fill: "#F4F6EE" },
  sand: { offset: 28, radius: 34, fill: "#E5D08A" },
  innerTint: { offset: 14, radius: 26, fill: "#D7CB93" },
});

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function pointKey([x, y]) {
  return `${roundCoord(x)},${roundCoord(y)}`;
}

function edgeKey(start, end) {
  const a = pointKey(start);
  const b = pointKey(end);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function parsePointKey(key) {
  return key.split(",").map(Number);
}

function parseEdgeKey(key) {
  const [start, end] = key.split("|");
  return {
    start: parsePointKey(start),
    end: parsePointKey(end),
  };
}

function polygonSignedArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function distance([x1, y1], [x2, y2]) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function normalize([x, y]) {
  const length = Math.hypot(x, y);
  if (!length) {
    return [0, 0];
  }
  return [x / length, y / length];
}

function lineIntersection(a1, a2, b1, b2) {
  const dax = a2[0] - a1[0];
  const day = a2[1] - a1[1];
  const dbx = b2[0] - b1[0];
  const dby = b2[1] - b1[1];
  const denominator = dax * dby - day * dbx;

  if (Math.abs(denominator) < 1e-8) {
    return null;
  }

  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];
  const t = (dx * dby - dy * dbx) / denominator;

  return [a1[0] + dax * t, a1[1] + day * t];
}

function moveToward(from, to, distanceAmount) {
  const direction = normalize([to[0] - from[0], to[1] - from[1]]);
  return [
    roundCoord(from[0] + direction[0] * distanceAmount),
    roundCoord(from[1] + direction[1] * distanceAmount),
  ];
}

function outwardNormal(start, end, signedArea) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (!length) {
    return [0, 0];
  }

  if (signedArea >= 0) {
    return [dy / length, -dx / length];
  }

  return [-dy / length, dx / length];
}

function formatNumber(value) {
  return roundCoord(value).toString();
}

function formatPoint([x, y]) {
  return `${formatNumber(x)} ${formatNumber(y)}`;
}

export function generateHexagonCoords(radius) {
  const coords = [];
  for (let q = -radius; q <= radius; q += 1) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r += 1) {
      coords.push([q, r, -q - r]);
    }
  }
  return coords;
}

export const STANDARD_BOARD_LAND_COORDS = Object.freeze(
  generateHexagonCoords(STANDARD_BOARD_RADIUS)
);

export function getHexCorners(
  coordinate,
  size = BOARD_UNDERLAY_DESIGN_SIZE,
  center = [0, 0]
) {
  const [q, , s] = coordinate;
  const [centerX, centerY] = center;
  const tileCenterX = size * (SQRT3 * q + (SQRT3 / 2) * s) + centerX;
  const tileCenterY = size * (3 / 2) * s + centerY;
  const halfWidth = (SQRT3 * size) / 2;
  const halfHeight = size / 2;

  return [
    [tileCenterX, tileCenterY - size],
    [tileCenterX + halfWidth, tileCenterY - halfHeight],
    [tileCenterX + halfWidth, tileCenterY + halfHeight],
    [tileCenterX, tileCenterY + size],
    [tileCenterX - halfWidth, tileCenterY + halfHeight],
    [tileCenterX - halfWidth, tileCenterY - halfHeight],
  ].map(([x, y]) => [roundCoord(x), roundCoord(y)]);
}

export function getHexEdges(coordinate, size = BOARD_UNDERLAY_DESIGN_SIZE) {
  const corners = getHexCorners(coordinate, size);
  return corners.map((start, index) => ({
    start,
    end: corners[(index + 1) % corners.length],
  }));
}

export function buildHexBoundaryEdges(
  coords,
  size = BOARD_UNDERLAY_DESIGN_SIZE
) {
  const edgeCounts = new Map();

  for (const coord of coords) {
    for (const edge of getHexEdges(coord, size)) {
      const key = edgeKey(edge.start, edge.end);
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(edgeCounts.entries())
    .filter(([, count]) => count === 1)
    .map(([key]) => parseEdgeKey(key));
}

export function orderBoundaryLoop(edges) {
  const pointsByKey = new Map();
  const adjacency = new Map();

  const link = (from, to) => {
    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    adjacency.get(from).push(to);
  };

  for (const { start, end } of edges) {
    const startKey = pointKey(start);
    const endKey = pointKey(end);
    pointsByKey.set(startKey, start);
    pointsByKey.set(endKey, end);
    link(startKey, endKey);
    link(endKey, startKey);
  }

  const startKey = Array.from(pointsByKey.keys()).sort((left, right) => {
    const [leftX, leftY] = pointsByKey.get(left);
    const [rightX, rightY] = pointsByKey.get(right);
    if (leftY !== rightY) {
      return leftY - rightY;
    }
    return leftX - rightX;
  })[0];

  const startNeighbors = adjacency.get(startKey) ?? [];
  const nextKey = [...startNeighbors].sort((left, right) => {
    const [leftX, leftY] = pointsByKey.get(left);
    const [rightX, rightY] = pointsByKey.get(right);
    if (leftX !== rightX) {
      return rightX - leftX;
    }
    return leftY - rightY;
  })[0];

  if (!startKey || !nextKey) {
    return { closed: false, points: [] };
  }

  const points = [pointsByKey.get(startKey)];
  let previousKey = startKey;
  let currentKey = nextKey;

  while (currentKey !== startKey) {
    points.push(pointsByKey.get(currentKey));
    const nextOptions = (adjacency.get(currentKey) ?? []).filter(
      (neighborKey) => neighborKey !== previousKey
    );

    if (nextOptions.length !== 1) {
      return { closed: false, points };
    }

    previousKey = currentKey;
    currentKey = nextOptions[0];
  }

  return { closed: true, points };
}

export function simplifyCollinearLoop(points) {
  return points.filter((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const vectorA = [point[0] - previous[0], point[1] - previous[1]];
    const vectorB = [next[0] - point[0], next[1] - point[1]];
    const cross = vectorA[0] * vectorB[1] - vectorA[1] * vectorB[0];
    return Math.abs(cross) > 1e-6;
  });
}

export function offsetLoop(points, offset) {
  const signedArea = polygonSignedArea(points);
  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousNormal = outwardNormal(previous, point, signedArea);
    const nextNormal = outwardNormal(point, next, signedArea);

    const previousLineStart = [
      previous[0] + previousNormal[0] * offset,
      previous[1] + previousNormal[1] * offset,
    ];
    const previousLineEnd = [
      point[0] + previousNormal[0] * offset,
      point[1] + previousNormal[1] * offset,
    ];
    const nextLineStart = [
      point[0] + nextNormal[0] * offset,
      point[1] + nextNormal[1] * offset,
    ];
    const nextLineEnd = [
      next[0] + nextNormal[0] * offset,
      next[1] + nextNormal[1] * offset,
    ];

    const intersection = lineIntersection(
      previousLineStart,
      previousLineEnd,
      nextLineStart,
      nextLineEnd
    );

    if (intersection) {
      return intersection.map(roundCoord);
    }

    return [
      roundCoord(point[0] + (previousNormal[0] + nextNormal[0]) * offset),
      roundCoord(point[1] + (previousNormal[1] + nextNormal[1]) * offset),
    ];
  });
}

export function getLoopBounds(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX: roundCoord(minX),
    minY: roundCoord(minY),
    maxX: roundCoord(maxX),
    maxY: roundCoord(maxY),
    width: roundCoord(maxX - minX),
    height: roundCoord(maxY - minY),
  };
}

export function buildRoundedLoopPath(points, radius) {
  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const maxRadius = Math.min(distance(previous, point), distance(point, next)) / 2;
    const cornerRadius = Math.min(radius, maxRadius - 0.001);

    if (cornerRadius <= 0) {
      return { point, entry: point, exit: point };
    }

    return {
      point,
      entry: moveToward(point, previous, cornerRadius),
      exit: moveToward(point, next, cornerRadius),
    };
  });

  let path = `M ${formatPoint(corners[0].entry)}`;

  for (let index = 0; index < corners.length; index += 1) {
    const { point, entry, exit } = corners[index];
    if (index > 0) {
      path += ` L ${formatPoint(entry)}`;
    }
    path += ` Q ${formatPoint(point)} ${formatPoint(exit)}`;
  }

  path += ` L ${formatPoint(corners[0].entry)} Z`;
  return path;
}

export function buildStandardBoardUnderlay() {
  const boundaryLoop = orderBoundaryLoop(
    buildHexBoundaryEdges(STANDARD_BOARD_LAND_COORDS)
  );
  const baseLoop = simplifyCollinearLoop(boundaryLoop.points);

  const layers = Object.entries(BOARD_UNDERLAY_LAYER_SPEC).map(
    ([id, { offset, radius, fill }]) => {
      const loop = offsetLoop(baseLoop, offset);
      return {
        id,
        fill,
        loop,
        path: buildRoundedLoopPath(loop, radius),
      };
    }
  );

  const outerBounds = getLoopBounds(layers[0].loop);
  return {
    designSize: BOARD_UNDERLAY_DESIGN_SIZE,
    layers,
    viewBox: [
      outerBounds.minX,
      outerBounds.minY,
      outerBounds.width,
      outerBounds.height,
    ],
  };
}

export const STANDARD_BOARD_UNDERLAY = buildStandardBoardUnderlay();
export const BOARD_UNDERLAY_VIEWBOX = STANDARD_BOARD_UNDERLAY.viewBox;

