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
  it("delegates archived replay state to the shared postgame board", () => {
    expect(source).toContain("PostgameGameBoard");
    expect(source).toContain("initialReplayPayload: { replay, frames }");
    expect(source).not.toContain("buildReplayTimeline");
    expect(source).not.toContain("useReplayNavigation");
    expect(source).not.toContain("ReplayConsole");
    expect(source).not.toContain("GameScreenWithEffects");
  });

  it("forwards the initial archived perspective to the real game screen", () => {
    expect(source).toContain("initialPerspectivePlayerID = null");
    expect(source).toContain("initialPerspectivePlayerID,");
    expect(source).not.toContain("playerID: null");
  });
});
