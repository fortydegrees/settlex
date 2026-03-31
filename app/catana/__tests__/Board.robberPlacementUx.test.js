import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board robber placement UX", () => {
  it("renders the playful preview component", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain("RobberPlacementPreview");
    expect(contents).toContain("robberPlacementMotionMode");
    expect(contents).toContain("magneticRobberTargets");
  });

  it("tracks robber target elements for hover and magnetic preview locking", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain("setHoveredRobberTarget");
    expect(contents).toContain("setRobberTargetElementsByTileId");
    expect(contents).toContain("handleRobberTargetRegister");
  });

  it("passes land tile geometry to the playful preview for board-only shadow gating", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain("tilePixelVector");
    expect(contents).toContain("landRobberPreviewTiles");
    expect(contents).toContain("const [boardCenterX, boardCenterY] = center");
    expect(contents).toContain("landTileCenters={landRobberPreviewTiles}");
    expect(contents).toContain("boardTileSize={size}");
  });

  it("uses a grabbing cursor during robber placement", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain('document.body.style.cursor = "grabbing"');
    expect(contents).toContain("isRobberPlacementActive");
  });
});
