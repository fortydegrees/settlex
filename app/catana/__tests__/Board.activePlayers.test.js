import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board activePlayers guards", () => {
  it("guards activePlayers before local player stage lookups", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain('ctx.activePlayers?.[playerID] ?? null');
  });

  it("keys board interaction guards off the local player's stage", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain(
      'const playerStage = ctx.activePlayers?.[playerID] ?? null'
    );
    expect(contents).toContain(
      'ctx.phase === "placement" && playerStage === "settlement"'
    );
    expect(contents).toContain(
      'ctx.phase === "placement" && playerStage === "road"'
    );
    expect(contents).toContain('playerStage === "moveRobber"');
  });

  it("declares turn-context guards before the mainBuildableNodes memo uses them", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    const perspectiveIndex = contents.indexOf(
      "const isCurrentPlayerPerspective ="
    );
    const memoIndex = contents.indexOf("const mainBuildableNodes = useMemo");

    expect(perspectiveIndex).toBeGreaterThan(-1);
    expect(memoIndex).toBeGreaterThan(-1);
    expect(perspectiveIndex).toBeLessThan(memoIndex);
  });

  it("gates placement and build affordances off the local player stage owner checks", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain(
      "const showPlacementNodes = isPlacementSettlementStage;"
    );
    expect(contents).toContain("isPlacementRoadStage &&");
    expect(contents).toContain(
      'isInteractiveStageOwner &&\n          (playerAction === "placeSettlement" || playerAction === "placeCity")'
    );
    expect(contents).toContain("flashing={isInteractiveStageOwner}");
    expect(contents).not.toContain("Object.entries(ctx.activePlayers ?? {})");
  });
});
