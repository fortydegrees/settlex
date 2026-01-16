import { describe, expect, it } from "vitest";
import { computeDefaultSize, getBoardLayout } from "../../utils/boardLayout";

const SQRT3 = Math.sqrt(3);

describe("boardLayout", () => {
  it("computes size constrained by height when width is ample", () => {
    const width = 2000;
    const height = 600;
    const expected = (4 * height) / (3 * 6 + 1) / 2;
    expect(computeDefaultSize({ width, height })).toBeCloseTo(expected, 5);
  });

  it("computes size constrained by width when width is tight", () => {
    const width = 400;
    const height = 1000;
    const expected = width / 6 / SQRT3;
    expect(computeDefaultSize({ width, height })).toBeCloseTo(expected, 5);
  });

  it("returns container size + center for layout", () => {
    const width = 1200;
    const height = 900;
    const layout = getBoardLayout({ width, height });
    const containerHeight = height - 144 - 38 - 40;
    expect(layout.containerWidth).toBe(width);
    expect(layout.containerHeight).toBe(containerHeight);
    expect(layout.center[0]).toBe(width / 2);
    expect(layout.center[1]).toBe(containerHeight / 2);
  });
});
