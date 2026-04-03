import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("ActionNode", () => {
  it("marks action circles with data-action-circle", () => {
    const actionNodePath = fileURLToPath(
      new URL("../ActionNode.js", import.meta.url)
    );
    const source = fs.readFileSync(actionNodePath, "utf8");

    expect(source).toContain('data-action-circle="true"');
    expect(source).toContain("registerBuildTarget");
    expect(source).toContain("buildTargetRotationDegrees");
    expect(source).not.toContain("[buildTargetMeta, nodeId, registerBuildTarget]");
  });
});
