import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Piece", () => {
  it("does not keep raster-specific settlement rendering logic", () => {
    const source = read("../Piece.js");

    expect(source).not.toContain("isRasterAssetPath");
    expect(source).not.toContain("RASTER_SETTLEMENT_SCALE");
    expect(source).not.toContain("RASTER_SETTLEMENT_Y_LIFT_PX");
    expect(source).toContain('backgroundSize: "cover"');
    expect(source).toContain('backgroundPosition: "center"');
  });
});
