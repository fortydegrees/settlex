import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewPath = path.resolve(__dirname, "..", "RobberPlacementPreview.js");

describe("RobberPlacementPreview spring motion", () => {
  it("uses magnetic target selection with a spring loop", () => {
    const contents = fs.readFileSync(previewPath, "utf8");
    expect(contents).toContain("magneticTargets");
    expect(contents).toContain("getMagneticRobberTarget");
    expect(contents).toContain("requestAnimationFrame");
    expect(contents).toContain("PREVIEW_HEAD_TRACK_Y_PERCENT");
    expect(contents).toContain("PREVIEW_HEAD_ROTATION_ORIGIN");
    expect(contents).toContain("previewGraphicRef");
    expect(contents).toContain("transformOrigin: PREVIEW_HEAD_ROTATION_ORIGIN");
    expect(contents).toContain("gsap.set(graphicNode");
    expect(contents).toContain("rotation");
  });
});
