import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board passive build hover wiring", () => {
  it("imports the passive build mode gate and derives passive road targets", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain('from "./utils/passiveBuildMode"');
    expect(source).toContain("const passiveBuildEnabled =");
    expect(source).toContain("const passiveBuildableEdges = useMemo");
  });

  it("renders hoverable edges only when passive mode is enabled", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain("passiveBuildEnabled &&");
    expect(source).toContain('key={`passive-road-${edgeId}`}');
    expect(source).toContain("hoverable");
  });

  it("derives passive settlement and city node targets when passive mode is enabled", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain("const passiveSettlementNodes = useMemo");
    expect(source).toContain("const passiveCityNodes = useMemo");
    expect(source).toContain("showIdleCircle={false}");
  });

  it("reuses city-hover suppression for passive city upgrades", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain("passiveCityNodeSet");
    expect(source).toContain("passiveCityNodeSet.has(hoveredNode)");
  });

  it("keeps explicit dock build rendering as the higher-priority branch", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain(
      'playerAction === "placeSettlement" || playerAction === "placeCity"'
    );
    expect(source).toContain(
      'playerAction === "placeRoad" || playerAction === "roadBuilding"'
    );
  });
});
