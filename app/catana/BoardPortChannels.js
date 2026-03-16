import React from "react";
import { TileTypes } from "./types";
import { SQRT3, getNodeDelta, tilePixelVector } from "./utils/coordinates";
import { getPortRenderModel } from "./utils/portLayout";

const CONNECTOR_BAR_FILL = "#E5D08A";
const CONNECTOR_GAP_RATIO = -0.25;
const CONNECTOR_END_GAP_RATIO = 0.06;
const CONNECTOR_NODE_RADIUS_RATIO = 0.2;
const CONNECTOR_LENGTH_RATIO = 0.55;
const CONNECTOR_MIN_LENGTH_RATIO = 0.68;
const CONNECTOR_MAX_LENGTH_RATIO = 0.94;
const CONNECTOR_THICKNESS_RATIO = 0.1;
const CONNECTOR_MIN_THICKNESS = 8;
const CONNECTOR_MAX_THICKNESS = 10;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getConnectorBar({ coordinate, nodeDirection, marker, size, center }) {
  const [centerX, centerY] = center;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const w = SQRT3 * size;
  const h = 2 * size;
  const [deltaX, deltaY] = getNodeDelta(nodeDirection, w, h);
  const nodeX = tileX + deltaX;
  const nodeY = tileY + deltaY;
  const markerCenterX = marker.left + marker.width / 2;
  const markerCenterY = marker.top + marker.height / 2;
  const dx = markerCenterX - nodeX;
  const dy = markerCenterY - nodeY;
  const distance = Math.hypot(dx, dy);
  const unitX = dx / distance;
  const unitY = dy / distance;
  const nodeRadius = size * CONNECTOR_NODE_RADIUS_RATIO;
  const startGap = size * CONNECTOR_GAP_RATIO;
  const endGap = size * CONNECTOR_END_GAP_RATIO;
  const usableDistance = Math.max(
    0,
    distance - nodeRadius - startGap - marker.width / 2 - endGap
  );
  const desiredLength = usableDistance * CONNECTOR_LENGTH_RATIO;
  const width = Math.round(
    Math.min(
      usableDistance,
      clamp(
        desiredLength,
        size * CONNECTOR_MIN_LENGTH_RATIO,
        size * CONNECTOR_MAX_LENGTH_RATIO
      )
    )
  );
  const height = Math.round(
    clamp(
      size * CONNECTOR_THICKNESS_RATIO,
      CONNECTOR_MIN_THICKNESS,
      CONNECTOR_MAX_THICKNESS
    )
  );
  const centerOffset = nodeRadius + startGap + width / 2;
  const x = nodeX + unitX * centerOffset;
  const y = nodeY + unitY * centerOffset;

  return {
    left: Math.round(x - width / 2),
    top: Math.round(y - height / 2),
    width,
    height,
    rotation: Math.round((Math.atan2(dy, dx) * 180) / Math.PI),
  };
}

function getConnectorBarStyle({ bar }) {
  return {
    position: "absolute",
    left: bar.left,
    top: bar.top,
    width: bar.width,
    height: bar.height,
    transform: `rotate(${bar.rotation}deg)`,
    transformOrigin: "center center",
    borderRadius: 4,
    background: CONNECTOR_BAR_FILL,
  };
}

export function BoardPortChannels({ tiles = [], center, size, width, height }) {
  if (!size || !center || !width || !height) {
    return null;
  }

  const portTiles = tiles.filter(({ type }) => type === TileTypes.PORT);

  return React.createElement(
    "div",
    {
      "data-testid": "board-port-channels",
      "aria-hidden": true,
      style: {
        position: "absolute",
        inset: 0,
        width,
        height,
        pointerEvents: "none",
        overflow: "visible",
      },
    },
    ...portTiles.map(({ coordinate, tile }) => {
      const { marker, connectors } = getPortRenderModel({
        coordinate,
        size,
        boardCenter: center,
        direction: tile.direction,
      });

      return React.createElement(
        "div",
        {
          key: `board-port-channel-${tile.id}`,
          "data-testid": "board-port-channel",
          style: {
            position: "absolute",
            inset: 0,
          },
        },
        ...connectors.map((connector, index) => {
          const bar = getConnectorBar({
            coordinate,
            nodeDirection: connector.nodeDirection,
            marker,
            size,
            center,
          });

          return React.createElement("div", {
            key: `board-port-connector-${tile.id}-${index}`,
            "data-testid": "board-port-connector",
            "data-node-direction": connector.nodeDirection,
            style: getConnectorBarStyle({ bar }),
          });
        })
      );
    })
  );
}
