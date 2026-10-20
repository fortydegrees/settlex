import { SQRT3, tilePixelVector } from "./coordinates.js";

const PORT_CONNECTORS_BY_DIRECTION = Object.freeze({
  EAST: ["NORTHWEST", "SOUTHWEST"],
  NORTHEAST: ["SOUTH", "SOUTHWEST"],
  NORTHWEST: ["SOUTH", "SOUTHEAST"],
  WEST: ["NORTHEAST", "SOUTHEAST"],
  SOUTHWEST: ["NORTH", "NORTHEAST"],
  SOUTHEAST: ["NORTH", "NORTHWEST"],
});

const PORT_MARKER_SIZE_RATIO = 0.72;
const PORT_MARKER_Y_OFFSET_RATIO = 0.03;
const PORT_BADGE_WIDTH_RATIO = 0.46;
const PORT_BADGE_HEIGHT_RATIO = 0.18;
const PORT_BADGE_TOP_RATIO = 0.11;
const PORT_PIER_SCALE = 0.3;

function getConnectorStyle({ x, y, w, h, nodeDirection }) {
  switch (nodeDirection) {
    case "NORTH":
      return {
        left: x - w * 0.4,
        top: y - h * 0.8,
        transform: "rotate(0deg) scale(0.3)",
      };
    case "SOUTH":
      return {
        left: x - w * 0.4,
        top: y - h * 0.2,
        transform: "rotate(-110deg) scaleY(0.8)",
      };
    case "NORTHEAST":
      return {
        left: x - w * 0.15,
        top: y - h / 1.60,
        transform: "rotate(60deg) scale(0.35)",
      };
    case "NORTHWEST":
      return {
        left: x - w * 0.75,
        top: y - h / 1.4,
        transform: "rotate(-60deg) scale(0.3)",
      };
    case "SOUTHWEST":
      return {
        left: x - w * 0.75,
        top: y - h / 3.6,
        transform: "rotate(60deg) scale(0.3)",
      };
    case "SOUTHEAST":
      return {
        left: x - w * 0.20,
        top: y - h * 0.35,
        transform: "rotate(-60deg) scale(0.35)",
      };
    default:
      throw new Error(`Unknown connector direction: ${nodeDirection}`);
  }
}

export function getPortRenderModel({
  coordinate,
  size,
  boardCenter,
  direction,
}) {
  const [centerX, centerY] = boardCenter;
  const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);
  const w = SQRT3 * size;
  const h = 2 * size;
  const connectorDirections = PORT_CONNECTORS_BY_DIRECTION[direction];

  if (!connectorDirections) {
    throw new Error(`Unknown port direction: ${direction}`);
  }

  const markerSize = size * PORT_MARKER_SIZE_RATIO;
  const markerCenterY = y - size * PORT_MARKER_Y_OFFSET_RATIO;
  const connectors = connectorDirections.map((nodeDirection) => {
    const style = getConnectorStyle({ x, y, w, h, nodeDirection });
    return {
      nodeDirection,
      left: Math.round(style.left),
      top: Math.round(style.top),
      width: Math.round(w),
      height: Math.round(h),
      transform: style.transform,
    };
  });

  return {
    marker: {
      left: Math.round(x - markerSize / 2),
      top: Math.round(markerCenterY - markerSize / 2),
      width: Math.round(markerSize),
      height: Math.round(markerSize),
    },
    badge: {
      anchor: "bottom",
      left: Math.round(x - (size * PORT_BADGE_WIDTH_RATIO) / 2),
      top: Math.round(y + size * PORT_BADGE_TOP_RATIO),
      width: Math.round(size * PORT_BADGE_WIDTH_RATIO),
      height: Math.round(size * PORT_BADGE_HEIGHT_RATIO),
    },
    connectors,
  };
}
