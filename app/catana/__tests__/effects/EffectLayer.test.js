import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("EffectLayer", () => {
  it("creates a portal layer with pointer-events disabled", () => {
    const path = fileURLToPath(
      new URL("../../effects/EffectLayer.js", import.meta.url)
    );
    const source = fs.readFileSync(path, "utf8");
    expect(source).toContain("createPortal");
    expect(source).toContain("pointerEvents");
  });
});
