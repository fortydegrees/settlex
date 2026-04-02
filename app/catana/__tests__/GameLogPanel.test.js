import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "GameLogPanel.js"
);

describe("GameLogPanel", () => {
  it("renders a log container with interaction opt-in", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("Game Log");
    expect(contents).toContain("data-allow-interaction");
    expect(contents).toContain("formatLogEntry");
  });

  it("uses a custom scroll class", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("game-log-scroll");
  });

  it("applies subtle feed animation hooks", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("game-log-fade");
    expect(contents).toContain("game-log-entry");
  });

  it("adds styling hooks for authoritative server entries", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain('startsWith("server:")');
    expect(contents).toContain("italic");
    expect(contents).not.toContain("not-italic");
    expect(contents).not.toContain("bg-amber-100/90");
  });

  it("auto-scrolls to the latest entry", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("scrollHeight");
    expect(contents).toContain("scrollTop");
  });

  it("re-enables auto-scroll after a delay", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("AUTO_SCROLL_IDLE_MS");
  });

  it("pauses auto-scroll while hovering the log", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("onMouseEnter");
    expect(contents).toContain("isHoveringRef");
  });

  it("anchors the log to the bottom-left of the screen", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("bottom-4");
    expect(contents).toContain("left-4");
  });
});
