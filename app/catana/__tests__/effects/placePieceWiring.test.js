import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("placePiece wiring", () => {
  it("uses shared defaults to compute effect duration", () => {
    const source = read("../../Game.js");
    expect(source).toContain("getPlacementEffectDuration");
    expect(source).toContain("PLACE_PIECE_DEFAULT_TUNING");
  });
});
