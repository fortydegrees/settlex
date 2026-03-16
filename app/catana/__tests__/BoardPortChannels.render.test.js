import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BoardPortChannels } from "../BoardPortChannels";
import { TileTypes } from "../types";
import { SQRT3, getNodeDelta, tilePixelVector } from "../utils/coordinates";
import { getPortRenderModel } from "../utils/portLayout";

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

function getExpectedConnectorBar({
  coordinate,
  direction,
  size,
  center,
  nodeDirection,
}) {
  const [centerX, centerY] = center;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const w = SQRT3 * size;
  const h = 2 * size;
  const [deltaX, deltaY] = getNodeDelta(nodeDirection, w, h);
  const nodeX = tileX + deltaX;
  const nodeY = tileY + deltaY;
  const { marker } = getPortRenderModel({
    coordinate,
    size,
    boardCenter: center,
    direction,
  });
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
  const barLength = Math.round(
    Math.min(
      usableDistance,
      clamp(
        desiredLength,
        size * CONNECTOR_MIN_LENGTH_RATIO,
        size * CONNECTOR_MAX_LENGTH_RATIO
      )
    )
  );
  const thickness = Math.round(
    clamp(
      size * CONNECTOR_THICKNESS_RATIO,
      CONNECTOR_MIN_THICKNESS,
      CONNECTOR_MAX_THICKNESS
    )
  );
  const centerOffset = nodeRadius + startGap + barLength / 2;
  const barCenterX = nodeX + unitX * centerOffset;
  const barCenterY = nodeY + unitY * centerOffset;
  const rotation = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

  return {
    left: Math.round(barCenterX - barLength / 2),
    top: Math.round(barCenterY - thickness / 2),
    width: barLength,
    height: thickness,
    rotation,
  };
}

describe("BoardPortChannels rendering", () => {
  it("renders one channel group for each port tile only", () => {
    const markup = renderToStaticMarkup(
      React.createElement(BoardPortChannels, {
        tiles: [
          {
            coordinate: [2, -2, 0],
            type: TileTypes.PORT,
            tile: { id: 19, direction: "EAST", resource: "Ore" },
          },
          {
            coordinate: [0, 0, 0],
            type: TileTypes.LAND,
            tile: { id: 1, resource: "Wood", number: 8 },
          },
          {
            coordinate: [-2, 2, 0],
            type: TileTypes.PORT,
            tile: { id: 20, direction: "WEST", resource: "Any" },
          },
        ],
        center: [500, 400],
        size: 100,
        width: 1000,
        height: 800,
      })
    );

    expect(markup).toContain('data-testid="board-port-channels"');
    const channelMatches = Array.from(
      markup.matchAll(/data-testid="board-port-channel"/g)
    );
    const connectorCounts = channelMatches.map((match, index) => {
      const start = match.index ?? 0;
      const end = channelMatches[index + 1]?.index ?? markup.length;
      const segment = markup.slice(start, end);
      return (segment.match(/data-testid="board-port-connector"/g) ?? []).length;
    });

    expect(connectorCounts).toHaveLength(2);
    connectorCounts.forEach((count) => {
      expect(count).toBe(2);
    });
  });

  it("uses simple sandy connector bars instead of merged channel shapes", () => {
    const input = {
      coordinate: [2, -2, 0],
      direction: "EAST",
      size: 100,
      center: [500, 400],
    };
    const northwest = getExpectedConnectorBar({
      ...input,
      nodeDirection: "NORTHWEST",
    });
    const southwest = getExpectedConnectorBar({
      ...input,
      nodeDirection: "SOUTHWEST",
    });
    const markup = renderToStaticMarkup(
      React.createElement(BoardPortChannels, {
        tiles: [
          {
            coordinate: input.coordinate,
            type: TileTypes.PORT,
            tile: { id: 19, direction: input.direction, resource: "Ore" },
          },
        ],
        center: input.center,
        size: input.size,
        width: 1000,
        height: 800,
      })
    );

    expect(markup.match(/data-testid="board-port-connector"/g) ?? []).toHaveLength(2);
    expect(markup).toContain("background:#E5D08A");
    expect(markup).toContain('data-node-direction="NORTHWEST"');
    expect(markup).toContain('data-node-direction="SOUTHWEST"');
    expect(markup).not.toContain("translate(-50%, -50%)");
    expect(markup).toContain(
      `left:${northwest.left}px;top:${northwest.top}px;width:${northwest.width}px;height:${northwest.height}px;transform:rotate(${northwest.rotation}deg)`
    );
    expect(markup).toContain(
      `left:${southwest.left}px;top:${southwest.top}px;width:${southwest.width}px;height:${southwest.height}px;transform:rotate(${southwest.rotation}deg)`
    );
    expect(markup).not.toContain('data-testid="board-port-channel-outer"');
    expect(markup).not.toContain('data-testid="board-port-channel-inner"');
    expect(markup).not.toContain("Q");
  });
});
