import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "app/replays/[replayId]/ReplayPageClient.js"
  ),
  "utf8"
);

describe("ReplayPageClient", () => {
  it("drives board, log, chart, transport, and keyboard from one event index", () => {
    expect(source).toContain("buildReplayTimeline");
    expect(source).toContain("useReplayNavigation");
    expect(source).not.toContain("useReplayPlayback");
    expect(source).not.toContain("toggleReplayPlaying");
    expect(source).toContain("ReplayConsole");
    expect(source).toContain("GameScreenWithEffects");
    expect(source).toContain("replayLogEntries");
    expect(source).toContain("replayActiveLogEntryKey");
    expect(source).toContain("onReplayLogEntrySelect");
    expect(source).toContain("replayConsoleMobileOpen");
    expect(source).toContain("onReplayMobileMetaPanelOpen");
    expect(source).toContain("getReplayKeyboardAction");
    expect(source).toContain('window.addEventListener("keydown"');
    expect(source).not.toContain("ReplayControls");
  });
});
