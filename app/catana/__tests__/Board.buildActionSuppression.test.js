import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Board build-action suppression", () => {
  it("tracks a local suppression flag for build highlights", () => {
    const source = read("../Board.js");
    expect(source).toContain("suppressBuildHighlights");
    expect(source).toContain("setSuppressBuildHighlights(true)");
  });

  it("wires edge placement callbacks for suppression", () => {
    const source = read("../Edge.js");
    expect(source).toContain("onPlaceCommitted");
  });
});
