import { describe, expect, it } from "vitest";
import { cubeToAxial, getEdgeDelta, getEdgeTransform, getNodeDelta, tilePixelVector } from "../coordinates";

describe("point-up board geometry", () => {
  // Independent centers: horizontal neighbors are sqrt(3) radii apart;
  // diagonal neighbors move half that distance horizontally and 1.5 vertically.
  it.each([
    [[0, 0, 0], [100, 200]],
    [[1, -1, 0], [134.6410161514, 200]],
    [[0, -1, 1], [117.3205080757, 230]],
    [[-1, 0, 1], [82.6794919243, 230]],
    [[0, 1, -1], [82.6794919243, 170]],
    [[2, -1, -1], [151.9615242271, 170]],
  ])("places cube coordinate %j about the board center", (cube, expected) => {
    const point = tilePixelVector(cube, 20, 100, 200);
    expect(point[0]).toBeCloseTo(expected[0], 8);
    expect(point[1]).toBeCloseTo(expected[1], 8);
  });

  it("keeps the axial coordinates needed by the CSS homepage poster", () => {
    expect(cubeToAxial([-2, 3, -1])).toEqual({ q: -2, r: -1 });
  });

  it.each([
    ["NORTH", [0, -50]], ["NORTHEAST", [40, -25]],
    ["SOUTHEAST", [40, 25]], ["SOUTH", [0, 50]],
    ["SOUTHWEST", [-40, 25]], ["NORTHWEST", [-40, -25]],
  ])("anchors the %s vertex on a width80 height100 hex", (direction, point) => {
    expect(getNodeDelta(direction, 80, 100)).toEqual(point);
  });

  it.each([
    ["NORTHEAST", [20, -37.5]], ["EAST", [40, 0]],
    ["SOUTHEAST", [20, 37.5]], ["SOUTHWEST", [-20, 37.5]],
    ["WEST", [-40, 0]], ["NORTHWEST", [-20, -37.5]],
  ])("anchors %s roads and hit targets halfway along the side", (direction, point) => {
    expect(getEdgeDelta(direction, 80, 100)).toEqual(point);
  });

  it.each([
    ["NORTHEAST", 30], ["EAST", 90], ["SOUTHEAST", 150],
    ["SOUTHWEST", 210], ["WEST", 270], ["NORTHWEST", 330],
  ])("positions the %s road artwork clockwise from north", (direction, angle) => {
    const transform = getEdgeTransform(direction, 100);
    expect(Number(transform.match(/rotate\(([-\d.]+)deg\)/)[1])).toBe(angle);
    expect(Number(transform.match(/translateY\(([-\d.]+)px\)/)[1])).toBe(-86.5);
    expect(transform).toMatch(/translateX\(-50%\).*translateY\(-50%\)/);
  });

  it.each([getNodeDelta, getEdgeDelta, getEdgeTransform])("rejects unsupported directions", (project) => {
    expect(() => project("UP", 80, 100)).toThrow(/direction/i);
  });
});
