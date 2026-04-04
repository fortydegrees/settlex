import { describe, expect, it } from "vitest";
import {
  BUILD_PREVIEW_MAGNETIC_RADIUS_PX,
  BUILD_PREVIEW_RELEASE_RADIUS_PX,
  getBuildPickupLaunchBias,
  getBuildPickupLaunchMotion,
  getBuildTargetHandoffDelayMs,
  getMagneticBuildTarget,
  getShortestRotationDelta,
  isBuildTargetHandoffReady
} from "../../utils/buildPlacementPreviewMotion";

describe("buildPlacementPreviewMotion", () => {
  it("computes the shortest signed road rotation delta", () => {
    expect(getShortestRotationDelta(90, 330)).toBe(-120);
    expect(getShortestRotationDelta(330, 30)).toBe(60);
  });

  it("does not snap a build preview until the pointer is inside the action-circle hit area", () => {
    const target = getMagneticBuildTarget({
      pointerX: 113,
      pointerY: 100,
      targets: [{ id: "node", centerX: 100, centerY: 100, width: 24, height: 24 }]
    });

    expect(target).toBeNull();
  });

  it("keeps the current build target locked while no closer legal target is in range", () => {
    const pointerX = 100 + BUILD_PREVIEW_MAGNETIC_RADIUS_PX + 12;

    const target = getMagneticBuildTarget({
      pointerX,
      pointerY: 100,
      activeTargetId: "left",
      targets: [
        { id: "left", centerX: 100, centerY: 100 },
        {
          id: "right",
          centerX: pointerX + BUILD_PREVIEW_MAGNETIC_RADIUS_PX + 16,
          centerY: 100
        }
      ]
    });

    expect(target).toMatchObject({ id: "left" });
  });

  it("switches to a closer build target even before the old one fully releases", () => {
    const gapPx = 86;

    expect(gapPx).toBeLessThan(BUILD_PREVIEW_RELEASE_RADIUS_PX);
    expect(gapPx).toBeGreaterThan(BUILD_PREVIEW_MAGNETIC_RADIUS_PX);

    const target = getMagneticBuildTarget({
      pointerX: 100 + gapPx,
      pointerY: 100,
      activeTargetId: "left",
      targets: [
        { id: "left", centerX: 100, centerY: 100 },
        { id: "right", centerX: 100 + gapPx, centerY: 100 }
      ]
    });

    expect(target).toMatchObject({ id: "right" });
  });

  it("releases the active build target once the pointer leaves its hit area", () => {
    const target = getMagneticBuildTarget({
      pointerX: 113,
      pointerY: 100,
      activeTargetId: "node",
      targets: [{ id: "node", centerX: 100, centerY: 100, width: 24, height: 24 }]
    });

    expect(target).toBeNull();
  });

  it("uses a short two-step launch envelope for dock pickup", () => {
    const roadLaunch = getBuildPickupLaunchMotion("road");
    const cityLaunch = getBuildPickupLaunchMotion("city");

    expect(roadLaunch.totalDurationMs).toBeLessThanOrEqual(500);
    expect(roadLaunch.pressDurationMs).toBeGreaterThanOrEqual(56);
    expect(roadLaunch.liftDurationMs).toBeGreaterThan(roadLaunch.pressDurationMs);
    expect(roadLaunch.settleDurationMs).toBeGreaterThan(0);
    expect(roadLaunch.startOffsetY).toBeGreaterThanOrEqual(0);
    expect(roadLaunch.peakOffsetY).toBeLessThanOrEqual(-24);
    expect(roadLaunch.peakScale).toBeGreaterThan(1);
    expect(roadLaunch.settleScale).toBe(1);
    expect(cityLaunch.peakOffsetY).toBeLessThan(-20);
    expect(cityLaunch.peakOffsetY).toBeLessThan(roadLaunch.startOffsetY);
  });

  it("keeps the road follower visible a bit longer before handing off to the edge-local preview", () => {
    expect(getBuildTargetHandoffDelayMs("road")).toBeGreaterThan(
      getBuildTargetHandoffDelayMs("city")
    );
    expect(getBuildTargetHandoffDelayMs("road")).toBeGreaterThanOrEqual(140);
  });

  it("keeps the road follower visible until it is close to the edge angle", () => {
    expect(
      isBuildTargetHandoffReady({
        pieceType: "road",
        elapsedMs: getBuildTargetHandoffDelayMs("road"),
        currentRotationDegrees: 78,
        desiredRotationDegrees: 30,
        currentX: 120,
        currentY: 120,
        desiredX: 120,
        desiredY: 120
      })
    ).toBe(false);

    expect(
      isBuildTargetHandoffReady({
        pieceType: "road",
        elapsedMs: getBuildTargetHandoffDelayMs("road"),
        currentRotationDegrees: 37,
        desiredRotationDegrees: 30,
        currentX: 120,
        currentY: 120,
        desiredX: 120,
        desiredY: 120
      })
    ).toBe(true);
  });

  it("still falls back to a time-only handoff for non-road pieces", () => {
    expect(
      isBuildTargetHandoffReady({
        pieceType: "settlement",
        elapsedMs: getBuildTargetHandoffDelayMs("city") - 1,
        currentRotationDegrees: 0,
        desiredRotationDegrees: 0,
        currentX: 100,
        currentY: 100,
        desiredX: 100,
        desiredY: 100
      })
    ).toBe(false);

    expect(
      isBuildTargetHandoffReady({
        pieceType: "settlement",
        elapsedMs: getBuildTargetHandoffDelayMs("city"),
        currentRotationDegrees: 0,
        desiredRotationDegrees: 0,
        currentX: 100,
        currentY: 100,
        desiredX: 100,
        desiredY: 100
      })
    ).toBe(true);
  });

  it("adds a small cursor-directed drift during the dock launch", () => {
    const bias = getBuildPickupLaunchBias({
      originX: 100,
      originY: 100,
      pointerX: 140,
      pointerY: 70,
      progress: 0.5
    });

    expect(bias.x).toBeGreaterThan(0);
    expect(bias.y).toBeLessThan(0);
    expect(Math.hypot(bias.x, bias.y)).toBeLessThanOrEqual(18);
    expect(
      getBuildPickupLaunchBias({
        originX: 100,
        originY: 100,
        pointerX: 140,
        pointerY: 70,
        progress: 1
      })
    ).toEqual({ x: 0, y: 0 });
  });
});
