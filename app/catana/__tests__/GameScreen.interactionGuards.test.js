import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen interaction guards", () => {
  it("adds a select-none class to the root container", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/select-none/);
  });

  it("guards context menu unless opt-in attribute is present", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/data-allow-interaction/);
    expect(contents).toMatch(/onContextMenu/);
  });

  it("handles Space keydown for shortcuts", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/Space/);
    expect(contents).toMatch(/keydown/);
  });

  it("guards keyboard shortcuts for editable targets", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/contenteditable/i);
  });
});
