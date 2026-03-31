import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tilePath = path.resolve(__dirname, "..", "Tile.js");

describe("Tile robber placement UX", () => {
  it("keeps the clickable robber action target in place", () => {
    const contents = fs.readFileSync(tilePath, "utf8");
    expect(contents).toContain("moves.moveRobber(id)");
    expect(contents).toContain("canPlaceRobber");
  });

  it("lets Board decide whether the tile-local ghost is shown", () => {
    const contents = fs.readFileSync(tilePath, "utf8");
    expect(contents).toContain("showRobberHoverGhost");
    expect(contents).toContain("onRobberTargetHoverChange");
    expect(contents).toContain("onRobberTargetRegister");
  });

  it("dims the current robber while it remains visible as the placement origin", () => {
    const contents = fs.readFileSync(tilePath, "utf8");
    expect(contents).toContain("showOriginRobber");
    expect(contents).toContain("opacity: showOriginRobber ? 0.4 : 1");
    expect(contents).toContain('cursor: "pointer"');
  });
});
