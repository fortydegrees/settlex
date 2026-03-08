import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen dev theme switcher", () => {
  it("stores theme selection in local storage", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toContain("CATANA_THEME_STORAGE_KEY");
    expect(contents).toMatch(/localStorage\.setItem\(CATANA_THEME_STORAGE_KEY/);
  });

  it("adds a dev-only theme select control", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/Theme/);
    expect(contents).toMatch(/<select/);
    expect(contents).toMatch(/process\.env\.NODE_ENV/);
  });

  it("passes themeId into board and hud components", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/<CatanBoard[\s\S]*themeId=\{themeId\}/);
    expect(contents).toMatch(/<PlayerActionContainer[\s\S]*themeId=\{themeId\}/);
    expect(contents).toMatch(/<TradeDiscardModal[\s\S]*themeId=\{themeId\}/);
  });
});
