import fs from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const replayPagePath = path.join(repoRoot, "app", "replays", "[replayId]", "page-content.js");
const replayControlsPath = path.join(
  repoRoot,
  "app",
  "replays",
  "components",
  "ReplayControls.js"
);

const loadReplayPageModule = async () => {
  expect(fs.existsSync(replayPagePath)).toBe(true);
  const href = pathToFileURL(replayPagePath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
};

const loadReplayControls = async () => {
  expect(fs.existsSync(replayControlsPath)).toBe(true);
  const href = pathToFileURL(replayControlsPath).href;
  return import(`${href}?t=${Date.now()}`);
};

describe("replay page", () => {
  it("loads archived replay data and passes frames into the replay client", async () => {
    const { createReplayPage } = await loadReplayPageModule();
    const getArchivedReplay = vi.fn().mockResolvedValue({
      match: {
        archivedMatchId: "arch_3",
        bgioMatchId: "match_3",
        replayId: "rpl_3",
        gameName: "catan",
      },
      participants: [],
      initialState: {
        G: { score: 0 },
        ctx: { gameover: null },
      },
      finalState: {
        G: { score: 5 },
        ctx: { gameover: { winner: "0" } },
      },
      log: [{ action: { type: "score", payload: { increment: 5 } } }],
    });
    const buildReplayFrames = vi.fn().mockReturnValue([
      { index: 0, state: { G: { score: 0 }, ctx: { gameover: null } } },
      { index: 1, state: { G: { score: 5 }, ctx: { gameover: { winner: "0" } } } },
    ]);
    const ReplayPageClient = ({ replay, frames }) =>
      h(
        "div",
        null,
        `Replay ${replay.match.replayId} has ${frames.length} frame(s)`
      );

    const Page = createReplayPage({
      getArchivedReplay,
      buildReplayFrames,
      ReplayPageClient,
      notFoundImpl: () => {
        throw new Error("not found");
      },
    });

    const element = await Page({
      params: { replayId: "rpl_3" },
    });
    const html = renderToStaticMarkup(element);

    expect(getArchivedReplay).toHaveBeenCalledWith("rpl_3");
    expect(buildReplayFrames).toHaveBeenCalledWith({
      initialState: {
        G: { score: 0 },
        ctx: { gameover: null },
      },
      log: [{ action: { type: "score", payload: { increment: 5 } } }],
    });
    expect(html).toContain("Replay rpl_3 has 2 frame(s)");
  });

  it("renders replay controls with prev-next buttons and a scrubber", async () => {
    const { ReplayControls } = await loadReplayControls();
    const html = renderToStaticMarkup(
      h(ReplayControls, {
        frameIndex: 2,
        frameCount: 5,
        onFrameChange: () => {},
        onPrevious: () => {},
        onNext: () => {},
      })
    );

    expect(html).toContain("Previous");
    expect(html).toContain("Next");
    expect(html).toContain('type="range"');
    expect(html).toContain("Step 3 of 5");
  });
});
