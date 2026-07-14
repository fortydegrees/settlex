import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const replay = fs.readFileSync(
  path.resolve("app/replays/components/ReplayPanel.jsx"),
  "utf8"
);
const rail = fs.readFileSync(
  path.resolve("app/catana/components/LeftMetaRail.js"),
  "utf8"
);
const board = fs.readFileSync(
  path.resolve("app/replays/PostgameGameBoard.js"),
  "utf8"
);
const overlay = fs.readFileSync(
  path.resolve("app/catana/components/GameOverOverlay.js"),
  "utf8"
);

describe("ReplayPanel", () => {
  it("shares native meta-panel chrome and contains no playback controls", () => {
    expect(replay).toContain("META_PANEL_FRAME_CLASS_NAME");
    expect(replay).toContain("META_PANEL_GLASS_STYLE");
    expect(rail).toContain("META_PANEL_FRAME_CLASS_NAME");
    expect(replay).toContain("Board");
    expect(replay).toContain("Results");
    expect(replay).toContain("Previous turn");
    expect(replay).not.toContain("Play replay");
    expect(replay).not.toContain("Replay speed");
    expect(replay).not.toContain("Match analysis");
  });

  it("lets session-owned Results state hide replay chrome above the modal", () => {
    expect(board).toContain("!displaySession.resultsOpen");
    expect(board).toContain("displaySession.mobilePanelOpen");
    expect(replay).toContain("getReplayMobileDockClassName(perspectiveId)");
    expect(overlay).toContain("z-[80]");
  });
});
