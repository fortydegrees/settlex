import { describe, expect, it } from "vitest";
import {
  getScaledRobberPreviewSize,
  getLockedRobberPreviewPosition,
  getRobberPreviewLeanAngle,
  getMagneticRobberTarget,
  isPointInsidePointyHex,
  isPointOverRobberBoardLand,
  ROBBER_PREVIEW_MAX_LEAN_DEGREES,
  ROBBER_PREVIEW_MAGNETIC_RADIUS_PX,
  ROBBER_PREVIEW_RELEASE_RADIUS_PX
} from "../../utils/robberPlacementPreviewMotion";

describe("robberPlacementPreviewMotion", () => {
  it("does not snap the robber until the pointer is inside the robber target hit area", () => {
    const target = getMagneticRobberTarget({
      pointerX: 121,
      pointerY: 100,
      targets: [{ tileId: 4, centerX: 100, centerY: 100, width: 40, height: 40 }]
    });

    expect(target).toBeNull();
  });

  it("selects the closest legal robber target inside the magnetic radius", () => {
    const target = getMagneticRobberTarget({
      pointerX: 118,
      pointerY: 112,
      targets: [
        { tileId: 4, centerX: 100, centerY: 100 },
        { tileId: 9, centerX: 190, centerY: 130 }
      ]
    });

    expect(target).toMatchObject({ tileId: 4 });
  });

  it("returns null when no robber target is close enough to attract the preview", () => {
    const target = getMagneticRobberTarget({
      pointerX: 20,
      pointerY: 20,
      targets: [{ tileId: 4, centerX: 200, centerY: 200 }]
    });

    expect(target).toBeNull();
  });

  it("keeps the current target locked until the pointer exits the release radius", () => {
    const target = getMagneticRobberTarget({
      pointerX: 100 + ROBBER_PREVIEW_MAGNETIC_RADIUS_PX + 12,
      pointerY: 100,
      activeTargetTileId: 4,
      targets: [
        { tileId: 4, centerX: 100, centerY: 100 },
        {
          tileId: 5,
          centerX: 100 + ROBBER_PREVIEW_MAGNETIC_RADIUS_PX + 20,
          centerY: 100
        }
      ]
    });

    expect(target).toMatchObject({ tileId: 4 });
    expect(ROBBER_PREVIEW_RELEASE_RADIUS_PX).toBeGreaterThan(
      ROBBER_PREVIEW_MAGNETIC_RADIUS_PX
    );
  });

  it("releases the robber target as soon as the pointer leaves the hit area", () => {
    const target = getMagneticRobberTarget({
      pointerX: 121,
      pointerY: 100,
      activeTargetTileId: 4,
      targets: [{ tileId: 4, centerX: 100, centerY: 100, width: 40, height: 40 }]
    });

    expect(target).toBeNull();
  });

  it("leans the robber opposite the horizontal movement direction and clamps the angle", () => {
    expect(getRobberPreviewLeanAngle(-600)).toBeLessThan(0);
    expect(getRobberPreviewLeanAngle(600)).toBeGreaterThan(0);
    expect(ROBBER_PREVIEW_MAX_LEAN_DEGREES).toBeGreaterThanOrEqual(60);
    expect(getRobberPreviewLeanAngle(10_000)).toBe(
      ROBBER_PREVIEW_MAX_LEAN_DEGREES
    );
    expect(getRobberPreviewLeanAngle(-10_000)).toBe(
      -ROBBER_PREVIEW_MAX_LEAN_DEGREES
    );
  });

  it("scales the preview size with board viewport zoom and falls back cleanly", () => {
    expect(
      getScaledRobberPreviewSize({
        baseSize: 56,
        boardViewportScale: 1.5
      })
    ).toBe(84);
    expect(
      getScaledRobberPreviewSize({
        baseSize: 56,
        boardViewportScale: 0.5
      })
    ).toBe(28);
    expect(
      getScaledRobberPreviewSize({
        baseSize: 56,
        boardViewportScale: NaN
      })
    ).toBe(56);
  });

  it("detects whether a point is inside a pointy-top land hex", () => {
    expect(
      isPointInsidePointyHex({
        pointX: 100,
        pointY: 100,
        centerX: 100,
        centerY: 100,
        size: 50
      })
    ).toBe(true);
    expect(
      isPointInsidePointyHex({
        pointX: 140,
        pointY: 100,
        centerX: 100,
        centerY: 100,
        size: 50
      })
    ).toBe(true);
    expect(
      isPointInsidePointyHex({
        pointX: 151,
        pointY: 100,
        centerX: 100,
        centerY: 100,
        size: 50
      })
    ).toBe(false);
    expect(
      isPointInsidePointyHex({
        pointX: 140,
        pointY: 145,
        centerX: 100,
        centerY: 100,
        size: 50
      })
    ).toBe(false);
  });

  it("shows the board shadow only when the preview is over a land tile", () => {
    const landTileCenters = [
      { tileId: 3, centerX: 100, centerY: 100 },
      { tileId: 4, centerX: 190, centerY: 100 }
    ];

    expect(
      isPointOverRobberBoardLand({
        pointX: 100,
        pointY: 100,
        landTileCenters,
        tileSize: 50
      })
    ).toBe(true);
    expect(
      isPointOverRobberBoardLand({
        pointX: 230,
        pointY: 100,
        landTileCenters,
        tileSize: 50
      })
    ).toBe(true);
    expect(
      isPointOverRobberBoardLand({
        pointX: 280,
        pointY: 100,
        landTileCenters,
        tileSize: 50
      })
    ).toBe(false);
    expect(
      isPointOverRobberBoardLand({
        pointX: 145,
        pointY: 175,
        landTileCenters,
        tileSize: 50
      })
    ).toBe(false);
  });

  it("offsets locked robber preview placement away from the number token", () => {
    expect(
      getLockedRobberPreviewPosition({
        tileId: 4,
        landTileCenters: [{ tileId: 4, centerX: 100, centerY: 100 }],
        boardTileSize: 50
      })
    ).toEqual({ x: 83, y: 106 });
    expect(
      getLockedRobberPreviewPosition({
        tileId: 9,
        landTileCenters: [{ tileId: 4, centerX: 100, centerY: 100 }],
        boardTileSize: 50
      })
    ).toBeNull();
  });

  it("keeps the locked robber preview aligned to a hovered viewport target under zoom", () => {
    expect(
      getLockedRobberPreviewPosition({
        tileId: 4,
        landTileCenters: [{ tileId: 4, centerX: 100, centerY: 100 }],
        boardTileSize: 50,
        boardViewportScale: 2,
        targetCenterX: 300,
        targetCenterY: 200
      })
    ).toEqual({ x: 266, y: 212 });
  });
});
