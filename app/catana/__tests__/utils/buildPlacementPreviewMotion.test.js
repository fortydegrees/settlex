import { describe, expect, it } from "vitest";
import {
  BUILD_PREVIEW_MAGNETIC_RADIUS_PX,
  BUILD_PREVIEW_RELEASE_RADIUS_PX,
  getMagneticBuildTarget
} from "../../utils/buildPlacementPreviewMotion";

describe("buildPlacementPreviewMotion", () => {
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
});
