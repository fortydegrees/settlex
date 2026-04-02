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
    expect(contents).toContain("FeedPanel");
    expect(contents).toContain("FeedTokenRow");
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

  it("does not use flex-wrap row layout for log entries", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).not.toContain("flex-wrap");
    expect(contents).not.toContain("items-center gap-1");
  });

  it("delegates auto-scroll behavior to the shared feed shell", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("rows={formattedEntries}");
    expect(contents).toContain("renderRow");
  });

  it("memoizes the formatted entries", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("useMemo");
    expect(contents).toContain("formattedEntries");
  });

  it("memoizes the panel component", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("React.memo");
  });

  it("anchors the log to the bottom-left of the screen", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("bottom-4");
    expect(contents).toContain("left-4");
  });
});
