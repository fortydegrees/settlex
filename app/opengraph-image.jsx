/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/server";
import React from "react";
import { HOME_DEMO_BOARD_PRESET } from "./catana/homeDemo/homeDemoPreset.js";
import {
  BETA_PRIMARY_DESCRIPTOR,
  BRAND_DOMAIN_LABEL,
  BRAND_NAME,
  SHARE_IMAGE_ALT,
} from "./metadata.js";
import {
  SQRT3,
  getNodeDelta,
  tilePixelVector,
} from "./catana/utils/coordinates.js";
import {
  readShareCardAsset,
  readShareCardFont,
  SHARE_CARD_ASSETS,
  SHARE_CARD_BOLD_FONT_PATH,
  SHARE_CARD_BLACK_FONT_PATH,
  SHARE_CARD_FONT_PATH,
  SHARE_CARD_SEAT_COLOR_IDS,
} from "./opengraph-assets.js";

export const runtime = "nodejs";
export const alt = SHARE_IMAGE_ALT;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const ASSET_IMAGES = Object.freeze({
  underlay: readShareCardAsset(SHARE_CARD_ASSETS.underlay),
  tiles: Object.fromEntries(
    Object.entries(SHARE_CARD_ASSETS.tiles).map(([resource, publicPath]) => [
      resource,
      readShareCardAsset(publicPath),
    ])
  ),
  icons: Object.fromEntries(
    Object.entries(SHARE_CARD_ASSETS.icons).map(([resource, publicPath]) => [
      resource,
      readShareCardAsset(publicPath),
    ])
  ),
  pieces: Object.fromEntries(
    Object.entries(SHARE_CARD_ASSETS.pieces).map(([pieceType, byColor]) => [
      pieceType,
      Object.fromEntries(
        Object.entries(byColor).map(([colorId, publicPath]) => [
          colorId,
          readShareCardAsset(publicPath),
        ])
      ),
    ])
  ),
});
const FONT_DATA = readShareCardFont();
const BOLD_FONT_DATA = readShareCardFont(SHARE_CARD_BOLD_FONT_PATH);
const BLACK_FONT_DATA = readShareCardFont(SHARE_CARD_BLACK_FONT_PATH);

// Board geometry mirrors app/catana/Tile.js and app/catana/Node.js so the card
// shows the real SettleHex layout rather than a decorative hex arrangement.
const TILE_SIZE = 64;
const TILE_W = SQRT3 * TILE_SIZE;
const TILE_H = 2 * TILE_SIZE;
// Sized so the whole board plus its table underlay sits inside the 1200x630
// frame; a clipped table ring reads as a cropping mistake at preview size.
const BOARD_CENTER_X = 880;
const BOARD_CENTER_Y = 315;

// From Tile.js: TILE_ICON_TOP_FACTOR/TILE_ICON_SCALE with the emoji-theme multipliers.
const TILE_ICON_TOP = TILE_SIZE * 0.204 * 1.16;
const TILE_ICON_SIZE = TILE_SIZE * 0.68 * 0.85;
// From Tile.js NumberToken.
const TOKEN_SIZE = TILE_SIZE / 1.75;
const TOKEN_MARGIN_TOP = TILE_SIZE / 1.66;
// From Piece.js: pieces render at 0.8 of the tile size, anchored on the node.
const PIECE_SIZE = TILE_SIZE * 0.8;
// road_*.svg viewBox is 199.57 x 39.71.
const ROAD_ASPECT = 39.71 / 199.57;

const [SEAT_A, SEAT_B] = SHARE_CARD_SEAT_COLOR_IDS;

const BOARD_TILES = HOME_DEMO_BOARD_PRESET.tiles.filter(
  (entry) => entry?.type === "Land"
);

const BUILDING_LAYOUT = [
  {
    type: "settlement",
    color: SEAT_A,
    coordinate: [0, -1, 1],
    direction: "NORTHEAST",
  },
  { type: "city", color: SEAT_B, coordinate: [1, 0, -1], direction: "SOUTH" },
  {
    type: "settlement",
    color: SEAT_B,
    coordinate: [-1, 1, 0],
    direction: "SOUTHWEST",
  },
];

const ROAD_LAYOUT = [
  { color: SEAT_A, coordinate: [0, -1, 1], nodes: ["NORTH", "NORTHEAST"] },
  { color: SEAT_B, coordinate: [1, 0, -1], nodes: ["SOUTH", "SOUTHWEST"] },
];

const numberToPips = (number) => {
  switch (number) {
    case 2:
    case 12:
      return "•";
    case 3:
    case 11:
      return "••";
    case 4:
    case 10:
      return "•••";
    case 5:
    case 9:
      return "••••";
    case 6:
    case 8:
      return "•••••";
    default:
      return "";
  }
};

function NumberToken({ number }) {
  const isHighYield = number === 6 || number === 8;
  const color = isHighYield ? "#dc2626" : "#000000";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: TOKEN_SIZE,
        height: TOKEN_SIZE,
        marginTop: TOKEN_MARGIN_TOP,
        borderRadius: TILE_SIZE >= 60 ? 5 : 2,
        backgroundColor: "#f1f5f9",
        boxShadow:
          "0 4px 3px rgba(0,0,0,0.07), 0 2px 2px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 9,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          color,
          fontSize: TILE_SIZE * 0.4,
          fontWeight: 900,
          lineHeight: 0.78,
        }}
      >
        {number}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 27,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          color,
          fontSize: TILE_SIZE * 0.18,
          fontWeight: 700,
          lineHeight: 0.75,
        }}
      >
        {numberToPips(number)}
      </div>
    </div>
  );
}

function BoardTile({ entry }) {
  const { resource, number } = entry.tile;
  const [centerX, centerY] = tilePixelVector(
    entry.coordinate,
    TILE_SIZE,
    BOARD_CENTER_X,
    BOARD_CENTER_Y
  );
  const iconSrc = ASSET_IMAGES.icons[resource];

  return (
    <div
      style={{
        position: "absolute",
        left: centerX - TILE_W / 2,
        top: centerY - TILE_H / 2,
        width: TILE_W,
        height: TILE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={ASSET_IMAGES.tiles[resource]}
        alt=""
        width={TILE_W}
        height={TILE_H}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: TILE_W,
          height: TILE_H,
        }}
      />
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          width={TILE_ICON_SIZE}
          height={TILE_ICON_SIZE}
          style={{
            position: "absolute",
            left: (TILE_W - TILE_ICON_SIZE) / 2,
            top: TILE_ICON_TOP,
            width: TILE_ICON_SIZE,
            height: TILE_ICON_SIZE,
          }}
        />
      ) : null}
      {number ? <NumberToken number={number} /> : null}
    </div>
  );
}

function BoardBuilding({ type, color, coordinate, direction }) {
  const [tileX, tileY] = tilePixelVector(
    coordinate,
    TILE_SIZE,
    BOARD_CENTER_X,
    BOARD_CENTER_Y
  );
  const [deltaX, deltaY] = getNodeDelta(direction, TILE_W, TILE_H);

  return (
    <img
      src={ASSET_IMAGES.pieces[type][color]}
      alt=""
      width={PIECE_SIZE}
      height={PIECE_SIZE}
      style={{
        position: "absolute",
        left: tileX + deltaX - PIECE_SIZE * 0.5,
        top: tileY + deltaY - PIECE_SIZE * 0.63,
        width: PIECE_SIZE,
        height: PIECE_SIZE,
      }}
    />
  );
}

function BoardRoad({ color, coordinate, nodes }) {
  const [tileX, tileY] = tilePixelVector(
    coordinate,
    TILE_SIZE,
    BOARD_CENTER_X,
    BOARD_CENTER_Y
  );
  const [fromX, fromY] = getNodeDelta(nodes[0], TILE_W, TILE_H);
  const [toX, toY] = getNodeDelta(nodes[1], TILE_W, TILE_H);
  const width = Math.hypot(toX - fromX, toY - fromY) * 0.94;
  const height = width * ROAD_ASPECT;
  const angle = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI;

  return (
    <img
      src={ASSET_IMAGES.pieces.road[color]}
      alt=""
      width={width}
      height={height}
      style={{
        position: "absolute",
        left: tileX + (fromX + toX) / 2 - width / 2,
        top: tileY + (fromY + toY) / 2 - height / 2,
        width,
        height,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        color: "#0f2e57",
        backgroundColor: "#55b6ef",
        backgroundImage:
          "linear-gradient(135deg, #9bdafd 0%, #5cb9f0 42%, #2f75cc 100%)",
        fontFamily: "Outfit",
      }}
    >
      <img
        src={ASSET_IMAGES.underlay}
        alt=""
        width={9.7 * TILE_SIZE}
        height={9.2 * TILE_SIZE}
        style={{
          position: "absolute",
          left: BOARD_CENTER_X - 4.85 * TILE_SIZE,
          top: BOARD_CENTER_Y - 4.6 * TILE_SIZE,
          width: 9.7 * TILE_SIZE,
          height: 9.2 * TILE_SIZE,
        }}
      />
      {BOARD_TILES.map((entry) => (
        <BoardTile key={`tile-${entry.tile.id}`} entry={entry} />
      ))}
      {ROAD_LAYOUT.map((road, index) => (
        <BoardRoad key={`road-${index}`} {...road} />
      ))}
      {BUILDING_LAYOUT.map((building, index) => (
        <BoardBuilding key={`building-${index}`} {...building} />
      ))}

      <div
        style={{
          position: "absolute",
          left: 52,
          top: 152,
          width: 508,
          height: 326,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 46px",
          borderRadius: 40,
          border: "1px solid rgba(255,255,255,0.6)",
          backgroundImage:
            "linear-gradient(150deg, rgba(255,255,255,0.74), rgba(224,242,254,0.36))",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.82), 0 28px 64px rgba(23,55,120,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#0f2e57",
            fontSize: 100,
            fontWeight: 700,
            letterSpacing: -3.5,
            lineHeight: 1,
          }}
        >
          {BRAND_NAME}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 20,
            width: 416,
            color: "#1e5aa8",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: -0.4,
            lineHeight: 1.08,
          }}
        >
          {BETA_PRIMARY_DESCRIPTOR}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 30,
            color: "rgba(36,91,145,0.78)",
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          {BRAND_DOMAIN_LABEL}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Outfit",
          data: FONT_DATA,
          weight: 500,
          style: "normal",
        },
        {
          name: "Outfit",
          data: BOLD_FONT_DATA,
          weight: 700,
          style: "normal",
        },
        {
          name: "Outfit",
          data: BLACK_FONT_DATA,
          weight: 900,
          style: "normal",
        },
      ],
    }
  );
}
