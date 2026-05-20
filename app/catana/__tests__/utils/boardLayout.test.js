import { describe, expect, it } from "vitest";
import { computeDefaultSize, getBoardLayout } from "../../utils/boardLayout";
import { getBoardUnderlayFrame } from "../../utils/boardUnderlayLayout";
import {
  BOARD_UNDERLAY_DESIGN_SIZE,
  BOARD_UNDERLAY_VIEWBOX,
} from "../../utils/boardUnderlayGeometry";

const SQRT3 = Math.sqrt(3);

describe("boardLayout", () => {
  it("computes size constrained by height when width is ample", () => {
    const width = 2000;
    const height = 600;
    const expected = (4 * height) / (3 * 7 + 1) / 2;
    expect(computeDefaultSize({ width, height })).toBeCloseTo(expected, 5);
  });

  it("computes size constrained by width when width is tight", () => {
    const width = 400;
    const height = 1000;
    const expected = width / 7 / SQRT3;
    expect(computeDefaultSize({ width, height })).toBeCloseTo(expected, 5);
  });

  it("sizes the board from the reduced layout height but centers it on the viewport", () => {
    const width = 1200;
    const height = 900;
    const layout = getBoardLayout({ width, height });
    const containerHeight = height - 144 - 38 - 40;
    expect(layout.containerWidth).toBe(width);
    expect(layout.containerHeight).toBe(containerHeight);
    expect(layout.center[0]).toBe(width / 2);
    expect(layout.center[1]).toBe(height / 2);
  });

  it("can size mobile overlay layouts from the full viewport height", () => {
    const width = 390;
    const height = 844;
    const layout = getBoardLayout({ width, height, reservedUiHeight: 0 });

    expect(layout.containerWidth).toBe(width);
    expect(layout.containerHeight).toBe(height);
    expect(layout.size).toBeCloseTo(computeDefaultSize({ width, height }), 5);
  });

  it("keeps the checked-in board underlay fully visible and vertically balanced on first load", () => {
    const width = 1920;
    const height = 1473;
    const layout = getBoardLayout({ width, height });
    const frame = getBoardUnderlayFrame({
      center: layout.center,
      size: layout.size,
      viewBox: BOARD_UNDERLAY_VIEWBOX,
      designSize: BOARD_UNDERLAY_DESIGN_SIZE,
    });

    expect(frame.top).toBeGreaterThanOrEqual(0);
    expect(frame.top + frame.height).toBeLessThanOrEqual(height);
    expect(Math.abs(frame.top - (height - (frame.top + frame.height)))).toBeLessThanOrEqual(1);
  });
});
