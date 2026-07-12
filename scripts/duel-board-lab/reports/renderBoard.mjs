import { TileTypes } from "@settlex/game-core";

const HEX_SIZE = 46;

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

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

export function renderBoardSvg({ tiles, record }) {
  const land = tiles.filter((tile) => tile.type === TileTypes.LAND);
  const ports = tiles.filter((tile) => tile.type === TileTypes.PORT);
  const hexes = land.map((tile) => {
    const point = cubeToPixel(tile.coordinate);
    const resource = tile.tile.resource ?? "Desert";
    const number = tile.tile.number;
    const token = number == null
      ? ""
      : `<circle cx="${point.x}" cy="${point.y}" r="16" fill="#f7f0df"/>`
        + `<text x="${point.x}" y="${point.y + 5}" text-anchor="middle" font-size="15" font-weight="700">${escapeHtml(number)}</text>`;
    return `<g><polygon points="${hexPoints(point)}" fill="${RESOURCE_COLOURS[resource] ?? "#cccccc"}" stroke="#20242b" stroke-width="2"/>${token}</g>`;
  }).join("");
  const portLegend = ports.map((tile) => escapeHtml(tile.tile.resource ?? "Any")).join(" · ");
  const family = record.generatorFamily ?? record.family ?? "candidate";
  const title = `${family} · Seed ${record.seed} · ${record.verdict} · ${formatScore(record.overallScore)}`;
  const escapedTitle = escapeHtml(title);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img" aria-label="${escapedTitle}">`
    + `<title>${escapedTitle}</title>`
    + `<rect width="500" height="500" fill="#f4f1e8"/>`
    + `<text x="20" y="28" font-family="system-ui" font-size="16">${escapedTitle}</text>`
    + hexes
    + `<text x="20" y="475" font-family="system-ui" font-size="12">Ports: ${portLegend}</text>`
    + "</svg>";
}
