import { TileTypes } from "@settlex/game-core";

const HEX_SIZE = 46;

const NODE_ANGLES = Object.freeze({
  NORTH: -90,
  NORTHEAST: -30,
  SOUTHEAST: 30,
  SOUTH: 90,
  SOUTHWEST: 150,
  NORTHWEST: 210
});

const RESOURCE_COLOURS = Object.freeze({
  Wood: "#3f7d52",
  Brick: "#b85c44",
  Sheep: "#8dbf67",
  Wheat: "#d8b84a",
  Ore: "#77808c",
  Desert: "#d8c49a"
});

export const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const cubeToPixel = ([q, , r]) => ({
  x: Math.sqrt(3) * HEX_SIZE * (q + r / 2) + 250,
  y: 1.5 * HEX_SIZE * r + 210
});

function hexPoints({ x, y }) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return `${x + HEX_SIZE * Math.cos(angle)},${y + HEX_SIZE * Math.sin(angle)}`;
  }).join(" ");
}

function nodePixelPositions(tiles) {
  const observationsByNodeId = new Map();
  for (const tile of tiles.filter((entry) => entry.type === TileTypes.LAND)) {
    const centre = cubeToPixel(tile.coordinate);
    for (const [name, nodeId] of Object.entries(tile.tile.nodes ?? {})) {
      const angle = NODE_ANGLES[name];
      if (!Number.isFinite(angle)) continue;
      const radians = Math.PI / 180 * angle;
      const observations = observationsByNodeId.get(nodeId) ?? [];
      observations.push({
        x: centre.x + HEX_SIZE * Math.cos(radians),
        y: centre.y + HEX_SIZE * Math.sin(radians)
      });
      observationsByNodeId.set(nodeId, observations);
    }
  }
  return new Map([...observationsByNodeId].map(([nodeId, observations]) => [nodeId, {
    x: observations.reduce((sum, point) => sum + point.x, 0) / observations.length,
    y: observations.reduce((sum, point) => sum + point.y, 0) / observations.length
  }]));
}

function renderPorts(ports, nodePositions) {
  return ports.map((tile) => {
    const nodeIds = Object.values(tile.tile.nodes ?? {});
    const endpointPoints = nodeIds.map((nodeId) => nodePositions.get(nodeId));
    if (nodeIds.length !== 2 || endpointPoints.some((point) => !point)) return "";
    const endpointMidpoint = {
      x: (endpointPoints[0].x + endpointPoints[1].x) / 2,
      y: (endpointPoints[0].y + endpointPoints[1].y) / 2
    };
    const portCentre = cubeToPixel(tile.coordinate);
    const point = {
      x: endpointMidpoint.x + (portCentre.x - endpointMidpoint.x) * 0.55,
      y: endpointMidpoint.y + (portCentre.y - endpointMidpoint.y) * 0.55
    };
    const resource = tile.tile.resource ?? "Any";
    const escapedResource = escapeHtml(resource);
    const escapedNodeIds = escapeHtml(nodeIds.join(","));
    const escapedLabel = escapeHtml(`${resource} port at nodes ${nodeIds.join(" and ")}`);
    return `<g data-port-resource="${escapedResource}" data-port-node-ids="${escapedNodeIds}" aria-label="${escapedLabel}">`
      + `<line x1="${escapeHtml(endpointMidpoint.x)}" y1="${escapeHtml(endpointMidpoint.y)}" x2="${escapeHtml(point.x)}" y2="${escapeHtml(point.y)}" stroke="#64748b" stroke-width="2"/>`
      + `<circle cx="${escapeHtml(point.x)}" cy="${escapeHtml(point.y)}" r="13" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>`
      + `<text x="${escapeHtml(point.x)}" y="${escapeHtml(point.y + 3)}" text-anchor="middle" fill="#334155" font-size="8" font-weight="700">${escapedResource}</text>`
      + "</g>";
  }).join("");
}

function renderPlacements(selectedLine, nodePositions) {
  return (selectedLine ?? []).map((pick, index) => {
    const point = nodePositions.get(pick.nodeId);
    if (!point) return "";
    const number = index + 1;
    const player = escapeHtml(pick.player);
    const fill = pick.player === "P1" ? "#2563eb" : "#dc2626";
    return `<g data-placement-pick="${escapeHtml(number)}" data-player="${player}">`
      + `<circle cx="${escapeHtml(point.x)}" cy="${escapeHtml(point.y)}" r="14" fill="${fill}" stroke="#ffffff" stroke-width="2"/>`
      + `<text x="${escapeHtml(point.x)}" y="${escapeHtml(point.y + 4)}" text-anchor="middle" fill="#ffffff" font-size="9">${player} · ${escapeHtml(number)}</text>`
      + "</g>";
  }).join("");
}

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

export function renderBoardSvg({ tiles, record, diagnosticV2, diagnosticV3 }) {
  const land = tiles.filter((tile) => tile.type === TileTypes.LAND);
  const ports = tiles.filter((tile) => tile.type === TileTypes.PORT);
  const nodePositions = nodePixelPositions(land);
  const hexes = land.map((tile) => {
    const point = cubeToPixel(tile.coordinate);
    const resource = tile.tile.resource ?? "Desert";
    const fill = Object.hasOwn(RESOURCE_COLOURS, resource)
      ? RESOURCE_COLOURS[resource]
      : "#cccccc";
    const number = tile.tile.number;
    const token = number == null
      ? ""
      : `<circle cx="${escapeHtml(point.x)}" cy="${escapeHtml(point.y)}" r="16" fill="#f7f0df"/>`
        + `<text x="${escapeHtml(point.x)}" y="${escapeHtml(point.y + 5)}" text-anchor="middle" font-size="15" font-weight="700">${escapeHtml(number)}</text>`;
    return `<g><polygon points="${escapeHtml(hexPoints(point))}" fill="${fill}" stroke="#20242b" stroke-width="2"/>${token}</g>`;
  }).join("");
  const portMarkers = renderPorts(ports, nodePositions);
  const selectedLine = diagnosticV3?.selectedLine
    ?? diagnosticV2?.fairness?.solvedLine
    ?? null;
  const placementMarkers = renderPlacements(selectedLine, nodePositions);
  const family = record.generatorFamily ?? record.family ?? "candidate";
  const title = `${family} · Seed ${record.seed} · ${record.status ?? record.verdict} · ${formatScore(record.overallScore)}`;
  const escapedTitle = escapeHtml(title);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img" aria-label="${escapedTitle}">`
    + `<title>${escapedTitle}</title>`
    + `<rect width="500" height="500" fill="#eff6ff"/>`
    + hexes
    + portMarkers
    + (placementMarkers
      ? `<g class="placement-overlay" aria-hidden="true">${placementMarkers}</g>`
      : "")
    + "</svg>";
}
