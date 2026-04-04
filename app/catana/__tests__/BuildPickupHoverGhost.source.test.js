import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const actionNodePath = path.resolve(__dirname, "..", "ActionNode.js");
const edgePath = path.resolve(__dirname, "..", "Edge.js");

describe("build pickup hover ghost suppression", () => {
  it("allows registered node hover ghosts only through the build-pickup handoff path", () => {
    const source = fs.readFileSync(actionNodePath, "utf8");

    expect(source).toContain("registerBuildTarget = null");
    expect(source).toContain("showRegisteredHoverPreview = false");
    expect(source).toContain("showRegisteredHoverPreview || (!registerBuildTarget && isHovered)");
  });

  it("allows registered road hover ghosts only through the build-pickup handoff path", () => {
    const source = fs.readFileSync(edgePath, "utf8");

    expect(source).toContain("registerBuildTarget");
    expect(source).toContain("showRegisteredHoverPreview={showRegisteredHoverPreview}");
    expect(source).toContain("showRegisteredHoverPreview ? (");
  });
});
