import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readAppFile = (...parts) =>
  fs.readFileSync(path.resolve(__dirname, "..", ...parts), "utf8");

describe("Home demo board source", () => {
  it("has a committed piece layer for demo-owned final state", () => {
    const source = readAppFile("homeDemo", "HomeDemoPieceLayer.js");
    expect(source).toContain("export function HomeDemoPieceLayer");
    expect(source).toContain("roadsByEdgeId");
    expect(source).toContain("buildingsByNodeId");
    expect(source).toContain("<Edge");
    expect(source).toContain("<Node");
  });

  it("renders a board-only home demo surface without game moves", () => {
    const source = readAppFile("homeDemo", "HomeDemoBoard.js");
    expect(source).toContain("export function HomeDemoBoard");
    expect(source).toContain("<BoardUnderlay");
    expect(source).toContain("<BoardPortChannels");
    expect(source).toContain("<Tile");
    expect(source).toContain("<Port");
    expect(source).toContain("<HomeDemoPieceLayer");
    expect(source).not.toContain("moves.");
    expect(source).not.toContain("EffectsBoardWrapper");
  });

  it("bridges homepage demo events through the existing placement effect stack", () => {
    const source = readAppFile("homeDemo", "HomeDemoEffectBridge.js");
    expect(source).toContain("export function HomeDemoEffectBridge");
    expect(source).toContain("createPiecePlacementRunner");
    expect(source).toContain("GameEffects");
    expect(source).toContain("build:place");
    expect(source).toContain("applyHomeDemoEvent");
  });

  it("wires the dev home table route to the demo board without sandbox game state", () => {
    const source = readAppFile("dev", "home-table", "HomeTablePrototypeClient.js");
    expect(source).toContain("HomeDemoBoard");
    expect(source).toContain("HomeDemoEffectBridge");
    expect(source).not.toContain("boardgame.io/react");
    expect(source).not.toContain("EffectsBoardWrapper");
    expect(source).not.toContain("createSandboxGame");
    expect(source).not.toContain("new_dev_game.json");
  });
});
