import { describe, expect, it } from "vitest";
import { SQRT3, tilePixelVector } from "../../utils/coordinates";
import { getPortRenderModel } from "../../utils/portLayout";

function getLegacyConnectorStyle({ x, y, w, h, nodeDirection }) {
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
        transform: "rotate(0deg) scale(0.3)",
      };
    case "NORTHEAST":
      return {
        left: x - w * 0.15,
        top: y - h / 1.75,
        transform: "rotate(60deg) scale(0.3)",
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
        left: x - w * 0.15,
        top: y - h * 0.4,
        transform: "rotate(-60deg) scale(0.3)",
      };
    default:
      throw new Error(`Unknown node direction: ${nodeDirection}`);
  }
}

function getExpectedConnector({ coordinate, size, boardCenter, nodeDirection }) {
  const w = SQRT3 * size;
  const h = 2 * size;
  const [x, y] = tilePixelVector(coordinate, size, boardCenter[0], boardCenter[1]);
  const style = getLegacyConnectorStyle({ x, y, w, h, nodeDirection });

  return {
    nodeDirection,
    left: Math.round(style.left),
    top: Math.round(style.top),
    width: Math.round(w),
    height: Math.round(h),
    transform: style.transform,
  };
}

describe("port layout model", () => {
  it("returns two connectors and a bottom badge anchor for a coastal direction", () => {
    const size = 100;
    const model = getPortRenderModel({
      coordinate: [0, 0, 0],
      size,
      boardCenter: [500, 400],
      direction: "SOUTHEAST",
    });

    expect(model.connectors).toHaveLength(2);
    expect(model.badge.anchor).toBe("bottom");
    expect(model.marker.width).toBeLessThan(size * 0.9);
    expect(model.marker.height).toBeLessThan(size * 0.9);
  });

  it("anchors east-facing bridges from the actual connected node positions", () => {
    const input = {
      coordinate: [3, -3, 0],
      size: 100,
      boardCenter: [500, 400],
      direction: "EAST",
    };
    const model = getPortRenderModel(input);

    expect(model.connectors).toEqual([
      getExpectedConnector({
        ...input,
        nodeDirection: "NORTHWEST",
      }),
      getExpectedConnector({
        ...input,
        nodeDirection: "SOUTHWEST",
      }),
    ]);
  });

  it("anchors southeast-facing bridges from the actual connected node positions", () => {
    const input = {
      coordinate: [-1, -2, 3],
      size: 100,
      boardCenter: [500, 400],
      direction: "SOUTHEAST",
    };
    const model = getPortRenderModel(input);

    expect(model.connectors).toEqual([
      getExpectedConnector({
        ...input,
        nodeDirection: "NORTH",
      }),
      getExpectedConnector({
        ...input,
        nodeDirection: "NORTHWEST",
      }),
    ]);
  });
});
