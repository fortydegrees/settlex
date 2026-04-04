import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board build pickup preview", () => {
  it("wires explicit build target registration and renders the preview", () => {
    const source = fs.readFileSync(boardPath, "utf8");

    expect(source).toContain("BuildPlacementPreview");
    expect(source).toContain("buildPickupPresentation");
    expect(source).toContain("setBuildPickupPresentation");
    expect(source).toContain("onPresentationChange={setBuildPickupPresentation}");
    expect(source).toContain("magneticBuildTargets");
    expect(source).toContain("setBuildTargetElementsById");
    expect(source).toContain("setBuildPickup(null)");
  });
});
