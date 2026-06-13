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

describe("Board passive build hover wiring", () => {
  it("imports the passive build mode gate and derives passive road targets", () => {
    const boardSource = fs.readFileSync(boardPath, "utf8");
    const helperSource = fs.readFileSync(interactionPath, "utf8");

    expect(boardSource).toContain("getPassiveBuildTargets");
    expect(helperSource).toContain('from "./passiveBuildMode"');
    expect(helperSource).toContain("const passiveBuildEnabled =");
    expect(helperSource).toContain("const passiveBuildableEdges =");
  });

  it("renders hoverable edges only when passive mode is enabled", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain("passiveBuildEnabled &&");
    expect(source).toContain('key={`passive-road-${edgeId}`}');
    expect(source).toContain("hoverable");
  });

  it("derives passive settlement and city node targets when passive mode is enabled", () => {
    const boardSource = fs.readFileSync(boardPath, "utf8");
    const helperSource = fs.readFileSync(interactionPath, "utf8");

    expect(helperSource).toContain("const passiveSettlementNodes =");
    expect(helperSource).toContain("const passiveCityNodes =");
    expect(boardSource).toContain("showIdleCircle={false}");
  });

  it("reuses city-hover suppression for passive city upgrades", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain("passiveCityNodeSet");
    expect(source).toContain("passiveCityNodeSet.has(hoveredNode)");
  });

  it("keeps explicit dock build rendering as the higher-priority branch", () => {
    const boardSource = fs.readFileSync(boardPath, "utf8");
    const helperSource = fs.readFileSync(interactionPath, "utf8");

    expect(boardSource).toContain(
      'playerAction === "placeSettlement" || playerAction === "placeCity"'
    );
    expect(helperSource).toContain('playerAction !== "placeRoad"');
    expect(helperSource).toContain('playerAction !== "roadBuilding"');
  });
});
