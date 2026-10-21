import fs from "node:fs";
import path from "node:path";
import { getPieceSvgPath } from "./catana/theme/pieceAssets.js";
import { SEAT_FALLBACK_COLOR_IDS } from "./catana/theme/playerColors.js";
import { getResourceIconPath, getTilePath } from "./catana/theme/themes.js";

export const SHARE_CARD_THEME_ID = "emoji";
export const SHARE_CARD_FONT_PATH = "/fonts/Outfit-Medium.ttf";
export const SHARE_CARD_BOLD_FONT_PATH = "/fonts/Outfit-Bold.ttf";
export const SHARE_CARD_BLACK_FONT_PATH = "/fonts/Outfit-Black.ttf";

// The card shows a two-seat match, so it uses the first two canonical seat colours.
export const SHARE_CARD_SEAT_COLOR_IDS = Object.freeze(
  SEAT_FALLBACK_COLOR_IDS.slice(0, 2)
);

export const SHARE_CARD_RESOURCES = Object.freeze([
  "Wood",
  "Brick",
  "Sheep",
  "Wheat",
  "Ore",
  "Desert",
]);

const byResource = (resolvePath) =>
  Object.freeze(
    Object.fromEntries(
      SHARE_CARD_RESOURCES.map((resource) => [resource, resolvePath(resource)])
    )
  );

const bySeatColor = (pieceType) =>
  Object.freeze(
    Object.fromEntries(
      SHARE_CARD_SEAT_COLOR_IDS.map((colorId) => [
        colorId,
        getPieceSvgPath(pieceType, colorId),
      ])
    )
  );

export const SHARE_CARD_ASSETS = Object.freeze({
  underlay: "/svgs/board_underlay_standard.svg",
  tiles: byResource((resource) => getTilePath(SHARE_CARD_THEME_ID, resource)),
  icons: byResource((resource) =>
    getResourceIconPath(SHARE_CARD_THEME_ID, resource)
  ),
  pieces: Object.freeze({
    settlement: bySeatColor("settlement"),
    city: bySeatColor("city"),
    road: bySeatColor("road"),
  }),
});

export const listShareCardSvgPaths = () => [
  SHARE_CARD_ASSETS.underlay,
  ...Object.values(SHARE_CARD_ASSETS.tiles),
  ...Object.values(SHARE_CARD_ASSETS.icons),
  ...Object.values(SHARE_CARD_ASSETS.pieces).flatMap((byColor) =>
    Object.values(byColor)
  ),
];

const MIME_TYPES_BY_EXTENSION = Object.freeze({
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
});

function getShareCardFilePath(publicPath) {
  if (typeof publicPath !== "string" || !publicPath.startsWith("/")) {
    throw new Error(`Share-card assets must use a public path: ${publicPath}`);
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const filePath = path.resolve(publicRoot, publicPath.slice(1));

  if (
    filePath !== publicRoot &&
    !filePath.startsWith(`${publicRoot}${path.sep}`)
  ) {
    throw new Error(`Share-card asset escapes public/: ${publicPath}`);
  }

  return filePath;
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

export function readShareCardAsset(publicPath) {
  const filePath = getShareCardFilePath(publicPath);
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES_BY_EXTENSION[extension];

  if (!mimeType) {
    throw new Error(`Unsupported share-card asset type: ${publicPath}`);
  }

  return `data:${mimeType};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

export function readShareCardFont(publicPath = SHARE_CARD_FONT_PATH) {
  return toArrayBuffer(fs.readFileSync(getShareCardFilePath(publicPath)));
}
