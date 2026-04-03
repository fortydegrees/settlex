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
    expect(contents).toContain("requestAnimationFrame");
    expect(contents).toContain("gsap");
    expect(contents).toContain("prefersReducedMotion");
    expect(contents).toContain('pieceType === "road"');
    expect(contents).toContain('pieceType === "settlement"');
    expect(contents).toContain('pieceType === "city"');
  });
});
