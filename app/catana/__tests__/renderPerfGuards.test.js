import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readCatanaFile = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");

describe("render performance guards", () => {
  it("memoizes player view map in GameScreen", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toMatch(/useMemo\(\(\) => buildPlayerViewMap\(core\), \[core\]\)/);
  });

  it("only starts the timer ticker when timer is visible", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toMatch(/if \(!timerSnapshot \|\| hideTimer\) return;/);
  });

  it("precomputes resource counts in PlayerActionContainer", () => {
    const contents = readCatanaFile("components/PlayerActionContainer.js");
    expect(contents).toContain("resourceCounts");
    expect(contents).not.toContain("playerCards.filter(");
  });

  it("memoizes formatted game log entries", () => {
    const contents = readCatanaFile("components/GameLogPanel.js");
    expect(contents).toMatch(/useMemo/);
    expect(contents).toContain("formattedEntries");
  });

  it("memoizes GameLogPanel component", () => {
    const contents = readCatanaFile("components/GameLogPanel.js");
    expect(contents).toContain("React.memo");
  });

  it("builds log player colors from stable maps instead of full player view objects", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toContain("seatColorMap");
    expect(contents).not.toContain("playerViewMap[id]?.color");
  });
});
