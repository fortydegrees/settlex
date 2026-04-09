import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen theme wiring", () => {
  it("stores the resolved theme in local storage", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toContain("CATANA_THEME_STORAGE_KEY");
    expect(contents).toMatch(/localStorage\.setItem\(CATANA_THEME_STORAGE_KEY/);
  });

  it("does not render the old dev theme select control", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).not.toMatch(/<select/);
    expect(contents).not.toMatch(/setThemeId\(resolveThemeId\(event\.target\.value\)\)/);
    expect(contents).not.toMatch(/showDevThemeSwitcher/);
  });

  it("falls back to the default theme when no stored theme exists", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/return resolveThemeId\(null\);/);
  });

  it("passes themeId into board and hud components", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/<MemoizedCatanBoard[\s\S]*themeId=\{themeId\}/);
    expect(contents).toMatch(/<PlayerActionContainer[\s\S]*themeId=\{themeId\}/);
    expect(contents).toMatch(/<TradeDiscardModal[\s\S]*themeId=\{themeId\}/);
  });
});
