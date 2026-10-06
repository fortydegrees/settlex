import { describe, expect, it } from "vitest";
import { computeDefaultSize, getBoardLayout, shouldResetBoardViewport } from "../../utils/boardLayout";
import { getBoardUnderlayFrame } from "../../utils/boardUnderlayLayout";
import {
  BOARD_UNDERLAY_DESIGN_SIZE,
  BOARD_UNDERLAY_VIEWBOX,
} from "../../utils/boardUnderlayGeometry";

const SQRT3 = Math.sqrt(3);

describe("board viewport resize policy", () => {
  it.each([
    ["desktop to phone", { width: 1280, height: 720 }, { width: 390, height: 844 }, false],
    ["phone to desktop", { width: 390, height: 844 }, { width: 1280, height: 720 }, false],
    ["phone rotation", { width: 390, height: 844 }, { width: 844, height: 390 }, true],
    ["desktop height resize", { width: 1280, height: 900 }, { width: 1280, height: 720 }, false],
  ])("recentres after %s", (_name, previous, next, isCoarsePointer) => {
    expect(shouldResetBoardViewport(previous, next, isCoarsePointer)).toBe(true);
  });

  it.each([
    ["initial measurement", null, { width: 390, height: 844 }, false],
    ["unchanged viewport", { width: 1280, height: 720 }, { width: 1280, height: 720 }, false],
    ["phone browser chrome", { width: 390, height: 844 }, { width: 390, height: 780 }, false],
    ["phone keyboard", { width: 390, height: 844 }, { width: 390, height: 480 }, true],
    ["landscape touch keyboard", { width: 844, height: 390 }, { width: 844, height: 250 }, true],
  ])("preserves pan and zoom for %s", (_name, previous, next, isCoarsePointer) => {
    expect(shouldResetBoardViewport(previous, next, isCoarsePointer)).toBe(false);
  });
});

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
