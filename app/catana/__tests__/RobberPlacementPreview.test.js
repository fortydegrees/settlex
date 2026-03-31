import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewPath = path.resolve(__dirname, "..", "RobberPlacementPreview.js");

describe("RobberPlacementPreview", () => {
  it("uses a portal-based spring follower", () => {
    const contents = fs.readFileSync(previewPath, "utf8");
    expect(contents).toContain("ReactDOM.createPortal");
    expect(contents).toContain("pointermove");
    expect(contents).toContain("requestAnimationFrame");
    expect(contents).toContain('pointerEvents: "none"');
  });

  it("supports direct hover and proximity-based robber target snapping", () => {
    const contents = fs.readFileSync(previewPath, "utf8");
    expect(contents).toContain("hoveredTarget");
    expect(contents).toContain("magneticTargets");
    expect(contents).toContain("getMagneticRobberTarget");
  });

  it("renders a separate board shadow and gates it on land-hex hit testing", () => {
    const contents = fs.readFileSync(previewPath, "utf8");
    expect(contents).toContain("previewShadowRef");
    expect(contents).toContain("landTileCenters");
    expect(contents).toContain("boardTileSize");
    expect(contents).toContain("isPointOverRobberBoardLand");
    expect(contents).toContain("PREVIEW_SHADOW_WIDTH_PERCENT");
    expect(contents).toContain("PREVIEW_SHADOW_BLUR_PX");
  });

  it("uses a separate locked placement position when the preview snaps to a tile", () => {
    const contents = fs.readFileSync(previewPath, "utf8");
    expect(contents).toContain("getLockedRobberPreviewPosition");
    expect(contents).toContain("selectedTarget.tileId");
  });
});
