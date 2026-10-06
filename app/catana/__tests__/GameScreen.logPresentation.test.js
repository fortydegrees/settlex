import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen log presentation source", () => {
  it("uses controlled replay entries without changing live presentation", () => {
    const source = fs.readFileSync(screenPath, "utf8");
    expect(source).toContain("bgioProps.replayLogEntries");
    expect(source).toContain("replayActiveLogEntryKey");
    expect(source).toContain("onReplayLogEntrySelect");
    expect(source).toContain("replayConsoleMobileOpen");
    expect(source).toContain("onReplayMobileMetaPanelOpen");
    expect(source).toContain("showTurnControls={isReplay || !isGameOver}");
    expect(source).toContain("readOnly={isReplay}");
    expect(source).toMatch(/if \(isReplay\) return/);
  });
});
