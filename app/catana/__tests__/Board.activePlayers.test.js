import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const boardPath = path.resolve(__dirname, "..", "Board.js");
const interactionPath = path.resolve(
  __dirname,
  "..",
  "utils",
  "boardBuildInteraction.js"
);

describe("Board activePlayers guards", () => {
  it("guards activePlayers before local player stage lookups", () => {
    const contents = fs.readFileSync(interactionPath, "utf8");
    expect(contents).toContain("ctx?.activePlayers?.[normalizedPlayerId] ?? null");
  });

  it("keys board interaction guards off the local player's stage", () => {
    const boardContents = fs.readFileSync(boardPath, "utf8");
    const helperContents = fs.readFileSync(interactionPath, "utf8");

    expect(boardContents).toContain("getBoardInteractionState");
    expect(helperContents).toContain("const playerStage =");
    expect(helperContents).toContain(
      'ctx?.phase === "placement" && playerStage === "settlement"'
    );
    expect(helperContents).toContain(
      'ctx?.phase === "placement" && playerStage === "road"'
    );
    expect(boardContents).toContain('playerStage === "moveRobber"');
  });

  it("declares turn-context guards before the mainBuildableNodes memo uses them", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    const perspectiveIndex = contents.indexOf(
      "isCurrentPlayerPerspective,"
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
