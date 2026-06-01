import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stripPath = path.resolve(
  __dirname,
  "..",
  "components",
  "MobileTurnContextStrip.js"
);

describe("MobileTurnContextStrip source", () => {
  it("keeps the timer near mobile turn context instead of top-only chrome", () => {
    const source = fs.readFileSync(stripPath, "utf8");

    expect(source).toContain("showTimerChip");
    expect(source).toContain("mobile-turn-context__timer");
    expect(source).toContain("mobile-turn-context__timer--low");
    expect(source).toContain("timerText");
  });

  it("renders roll result and dice chips after a roll", () => {
    const source = fs.readFileSync(stripPath, "utf8");

    expect(source).toContain("MiniDiceFace");
    expect(source).toContain("Rolled ${dice[0]} and ${dice[1]}, total ${rollTotal}");
    expect(source).toContain("mobile-turn-context__die");
    expect(source).toContain("normalizeDiceRoll");
    expect(source).toContain("getRollTotal");
  });

  it("uses opponent turn copy when the viewer is waiting", () => {
    const source = fs.readFileSync(stripPath, "utf8");

    expect(source).toContain("activePlayerName");
    expect(source).toContain("${activePlayerName} to roll");
    expect(source).toContain("isViewerTurn");
  });
});
