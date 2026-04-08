import fs from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const modulePath = path.join(repoRoot, "app", "g", "[matchID]", "page-content.js");

const loadPageModule = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
};

describe("/g match page", () => {
  it("renders the live match client when the match still exists in bgio", async () => {
    const { createGMatchPage } = await loadPageModule();
    const getMatchPageData = vi.fn().mockResolvedValue({
      kind: "live",
      matchID: "m1",
      liveMatch: { matchID: "m1" },
    });
    const MatchPageClient = ({ matchID, initialPlayerID }) =>
      h("div", null, `Live ${matchID} seat ${initialPlayerID}`);

    const Page = createGMatchPage({
      getMatchPageData,
      MatchPageClient,
      notFoundImpl: () => {
        throw new Error("not found");
      },
    });

    const element = await Page({
      params: { matchID: "m1" },
      searchParams: { playerID: "0" },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Live m1 seat 0");
  });

  it("renders archived replay mode on the same URL after live cleanup", async () => {
    const { createGMatchPage } = await loadPageModule();
    const getMatchPageData = vi.fn().mockResolvedValue({
      kind: "archived",
      matchID: "m1",
      archivedMatch: {
        match: {
          replayId: "r1",
          bgioMatchId: "m1",
        },
        participants: [],
        initialState: { G: { turn: 0 }, ctx: { gameover: null } },
        finalState: { G: { turn: 1 }, ctx: { gameover: { winner: "0" } } },
        log: [{ action: { type: "MOVE" } }],
        chatMessages: [],
      },
    });
    const buildReplayFrames = vi.fn().mockReturnValue([
      { index: 0, state: { G: { turn: 0 }, ctx: { gameover: null } } },
      { index: 1, state: { G: { turn: 1 }, ctx: { gameover: { winner: "0" } } } },
    ]);
    const ReplayPageClient = ({ replay, frames, initialFrameIndex }) =>
      h(
        "div",
        null,
        `Archived ${replay.match.replayId} frames ${frames.length} start ${initialFrameIndex}`
      );

    const Page = createGMatchPage({
      getMatchPageData,
      buildReplayFrames,
      ReplayPageClient,
      notFoundImpl: () => {
        throw new Error("not found");
      },
    });

    const element = await Page({
      params: { matchID: "m1" },
      searchParams: {},
    });
    const html = renderToStaticMarkup(element);

    expect(buildReplayFrames).toHaveBeenCalledWith({
      initialState: { G: { turn: 0 }, ctx: { gameover: null } },
      log: [{ action: { type: "MOVE" } }],
    });
    expect(html).toContain("Archived r1 frames 2 start 1");
  });

  it("returns notFound when neither live nor archived data exists", async () => {
    const { createGMatchPage } = await loadPageModule();
    const getMatchPageData = vi.fn().mockResolvedValue({
      kind: "missing",
      matchID: "m404",
    });
    const notFoundImpl = vi.fn(() => {
      throw new Error("not found");
    });

    const Page = createGMatchPage({
      getMatchPageData,
      notFoundImpl,
    });

    await expect(
      Page({
        params: { matchID: "m404" },
        searchParams: {},
      })
    ).rejects.toThrow("not found");
    expect(notFoundImpl).toHaveBeenCalledTimes(1);
  });
});
