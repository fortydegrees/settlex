import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewPath = path.resolve(
  __dirname,
  "..",
  "BuildPlacementPreview.js"
);

describe("BuildPlacementPreview spring motion", () => {
  it("launches from the dock origin and hands off to a magnetic cursor follower", () => {
    const contents = fs.readFileSync(previewPath, "utf8");

    expect(contents).toContain("originRect");
    expect(contents).toContain("magneticTargets");
    expect(contents).toContain("onPresentationChange");
    expect(contents).toContain("showTargetPreview");
    expect(contents).toContain("requestAnimationFrame");
    expect(contents).toContain("gsap");
    expect(contents).toContain("prefersReducedMotion");
    expect(contents).toContain("isPointOverRobberBoardLand");
    expect(contents).toContain("boardShadowVisible");
    expect(contents).toContain("launchDelayMs");
    expect(contents).toContain("startedAtMs");
    expect(contents).toContain("launchReady");
    expect(contents).toContain("launchReadyRef.current");
    expect(contents).toContain("desiredPositionRef.current = {\n          x: pointerRef.current.x,");
    expect(contents).not.toContain(
      "currentPositionRef.current = origin;\n            velocityRef.current = { x: 0, y: 0 };"
    );
    expect(contents).toContain('pieceType === "road"');
    expect(contents).toContain('pieceType === "settlement"');
    expect(contents).toContain('pieceType === "city"');
    expect(contents).toContain("getBuildPickupLaunchBias");
    expect(contents).toContain("getBuildTargetHandoffDelayMs");
    expect(contents).toContain('currentRotationRef.current = pieceType === "road" ? 90 : 0');
  });
});
