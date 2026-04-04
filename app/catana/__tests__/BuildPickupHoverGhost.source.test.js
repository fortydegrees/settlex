import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const actionNodePath = path.resolve(__dirname, "..", "ActionNode.js");
const edgePath = path.resolve(__dirname, "..", "Edge.js");

describe("build pickup hover ghost suppression", () => {
  it("suppresses node hover ghosts while explicit build pickup targets are registered", () => {
    const source = fs.readFileSync(actionNodePath, "utf8");

    expect(source).toContain("registerBuildTarget = null");
    expect(source).toContain("!registerBuildTarget && isHovered");
  });

  it("suppresses road hover ghosts while explicit build pickup targets are registered", () => {
    const source = fs.readFileSync(edgePath, "utf8");

    expect(source).toContain("registerBuildTarget");
    expect(source).toContain("isHovered && !registerBuildTarget");
  });
});
