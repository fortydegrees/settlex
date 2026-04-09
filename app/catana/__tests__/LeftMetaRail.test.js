import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const leftMetaRailPath = path.resolve(
  __dirname,
  "..",
  "components",
  "LeftMetaRail.js"
);
const gameLogPanelPath = path.resolve(
  __dirname,
  "..",
  "components",
  "GameLogPanel.js"
);
const chatPanelPath = path.resolve(
  __dirname,
  "..",
  "components",
  "ChatPanel.js"
);

describe("LeftMetaRail", () => {
  it("owns the fixed bottom-left rail layout for the meta panels", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain("fixed left-4 bottom-4");
    expect(contents).toContain("w-72 md:w-80 xl:w-96");
    expect(contents).toContain("GameLogPanel");
    expect(contents).toContain("ChatPanel");
    expect(contents).not.toContain("DebugPanel");
    expect(contents).toMatch(/gap-\d+/);
  });

  it("keeps the game log above chat in the same-width column", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");
    const gameLogIndex = contents.indexOf("GameLogPanel");
    const chatIndex = contents.indexOf("ChatPanel");

    expect(gameLogIndex).toBeGreaterThan(-1);
    expect(chatIndex).toBeGreaterThan(-1);
    expect(gameLogIndex).toBeLessThan(chatIndex);
  });

  it("keeps the feed panels at the same height", () => {
    const gameLogContents = fs.readFileSync(gameLogPanelPath, "utf8");
    const chatContents = fs.readFileSync(chatPanelPath, "utf8");

    expect(gameLogContents).toContain("h-[20vh] xl:h-[24vh]");
    expect(chatContents).toContain("h-[20vh] xl:h-[24vh]");
  });
});
