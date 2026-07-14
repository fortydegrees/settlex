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
      liveMatch: { matchID: "m1", players: [{ id: 0, name: "Ada" }] },
    });
    const readSeatCredential = vi.fn().mockResolvedValue("secret_0");
    const MatchPageClient = ({
      matchID,
      initialPlayerID,
      initialCredentials,
      initialLiveMatch,
    }) =>
      h(
        "div",
        null,
        `Live ${matchID} seat ${initialPlayerID} credentials ${initialCredentials} players ${initialLiveMatch.players.length}`
      );

    const Page = createGMatchPage({
      getMatchPageData,
      readSeatCredential,
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

    expect(readSeatCredential).toHaveBeenCalledWith({
      matchID: "m1",
      playerID: "0",
    });
    expect(html).toContain("Live m1 seat 0 credentials secret_0 players 1");
  });

  it("hydrates the viewer seat from match credential cookies without a playerID query", async () => {
    const { createGMatchPage } = await loadPageModule();
    const getMatchPageData = vi.fn().mockResolvedValue({
      kind: "live",
      matchID: "m1",
      liveMatch: {
        matchID: "m1",
        players: [
          { id: 0, name: "Ada" },
          { id: 1, name: "Bren" },
        ],
      },
    });
    const readSeatCredential = vi.fn(async ({ playerID }) =>
      String(playerID) === "1" ? "secret_1" : null
    );
    const MatchPageClient = ({
      matchID,
      initialPlayerID,
      initialCredentials,
      initialLiveMatch,
    }) =>
      h(
        "div",
        null,
        `Live ${matchID} seat ${initialPlayerID} credentials ${initialCredentials} players ${initialLiveMatch.players.length}`
      );

    const Page = createGMatchPage({
      getMatchPageData,
      readSeatCredential,
      MatchPageClient,
      notFoundImpl: () => {
        throw new Error("not found");
      },
    });

    const element = await Page({
      params: { matchID: "m1" },
      searchParams: {},
    });
    const html = renderToStaticMarkup(element);

    expect(readSeatCredential).toHaveBeenNthCalledWith(1, {
      matchID: "m1",
      playerID: "0",
    });
    expect(readSeatCredential).toHaveBeenNthCalledWith(2, {
      matchID: "m1",
      playerID: "1",
    });
    expect(html).toContain("Live m1 seat 1 credentials secret_1 players 2");
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
      finalState: {
        G: { turn: 1 },
        ctx: { gameover: { winner: "0" } },
      },
    });
    expect(getMatchPageData).toHaveBeenCalledWith("m1");
    expect(html).toContain("Archived r1 frames 2 start 0");
  });

  it("shows replay preparation while a finished live match is being archived", async () => {
    const { createGMatchPage } = await loadPageModule();
    const getMatchPageData = vi.fn().mockResolvedValue({
      kind: "postgame-preparing",
      matchID: "m1",
      liveMatch: { matchID: "m1", gameover: true },
    });
    const ReplayStatusPage = ({ matchID, status }) =>
      h("div", null, `Replay status ${status} for ${matchID}`);
    const Page = createGMatchPage({
      getMatchPageData,
      ReplayStatusPage,
      notFoundImpl: () => {
        throw new Error("not found");
      },
    });

    const element = await Page({
      params: { matchID: "m1" },
      searchParams: {},
    });
    const html = renderToStaticMarkup(element);

    expect(getMatchPageData).toHaveBeenCalledWith("m1");
    expect(html).toContain("Replay status preparing for m1");
  });

  it("renders ?view=replay identically to the canonical archived URL", async () => {
    const { createGMatchPage } = await loadPageModule();
    const getMatchPageData = vi.fn().mockResolvedValue({
      kind: "archived",
      matchID: "m1",
      archivedMatch: {
        match: { replayId: "r1", bgioMatchId: "m1" },
        participants: [],
        initialState: { G: {}, ctx: {} },
        log: [],
      },
    });
    const buildReplayFrames = vi.fn().mockReturnValue([
      { index: 0, state: { G: {}, ctx: {} } },
      { index: 1, state: { G: {}, ctx: { gameover: true } } },
    ]);
    const ReplayPageClient = ({ initialFrameIndex }) =>
      h("div", null, `Replay starts at ${initialFrameIndex}`);
    const Page = createGMatchPage({
      getMatchPageData,
      buildReplayFrames,
      ReplayPageClient,
    });

    const element = await Page({
      params: { matchID: "m1" },
      searchParams: { view: "replay" },
    });
    const html = renderToStaticMarkup(element);

    expect(getMatchPageData).toHaveBeenCalledWith("m1");
    expect(html).toContain("Replay starts at 0");
  });

  it("uses the archived participant matching the current account as the initial perspective", async () => {
    const { createGMatchPage } = await loadPageModule();
    const ReplayPageClient = ({ initialPerspectivePlayerID }) =>
      h("div", null, `Perspective ${initialPerspectivePlayerID}`);
    const Page = createGMatchPage({
      getMatchPageData: vi.fn().mockResolvedValue({
        kind: "archived",
        matchID: "m1",
        archivedMatch: {
          match: { replayId: "r1", bgioMatchId: "m1" },
          participants: [
            { seatId: "0", accountId: "account_a" },
            { seatId: "1", accountId: "account_b" },
          ],
          initialState: { G: {}, ctx: {} },
          log: [],
        },
      }),
      buildReplayFrames: vi.fn().mockReturnValue([{ index: 0 }]),
      getSessionAccount: vi.fn().mockResolvedValue({
        account: { id: "account_b" },
      }),
      headers: vi.fn().mockReturnValue(new Headers()),
      readSeatCredential: vi.fn(),
      ReplayPageClient,
    });

    const html = renderToStaticMarkup(
      await Page({ params: { matchID: "m1" }, searchParams: {} })
    );

    expect(html).toContain("Perspective 1");
  });

  it("falls back to an archived participant's seat cookie for the initial perspective", async () => {
    const { createGMatchPage } = await loadPageModule();
    const readSeatCredential = vi.fn(async ({ playerID }) =>
      playerID === "0" ? "secret_0" : null
    );
    const ReplayPageClient = ({ initialPerspectivePlayerID }) =>
      h("div", null, `Perspective ${initialPerspectivePlayerID}`);
    const Page = createGMatchPage({
      getMatchPageData: vi.fn().mockResolvedValue({
        kind: "archived",
        matchID: "m1",
        archivedMatch: {
          match: { replayId: "r1", bgioMatchId: "m1" },
          participants: [
            { seatId: "0", accountId: "account_a" },
            { seatId: "1", accountId: "account_b" },
          ],
          initialState: { G: {}, ctx: {} },
          log: [],
        },
      }),
      buildReplayFrames: vi.fn().mockReturnValue([{ index: 0 }]),
      getSessionAccount: vi.fn().mockResolvedValue(null),
      headers: vi.fn().mockReturnValue(new Headers()),
      readSeatCredential,
      ReplayPageClient,
    });

    const html = renderToStaticMarkup(
      await Page({ params: { matchID: "m1" }, searchParams: {} })
    );

    expect(readSeatCredential).toHaveBeenCalledWith({
      matchID: "m1",
      playerID: "0",
    });
    expect(html).toContain("Perspective 0");
  });

  it("renders an invalid status when canonical replay reconstruction fails", async () => {
    const { createGMatchPage } = await loadPageModule();
    const archivedMatch = {
      match: { replayId: "r_bad", bgioMatchId: "m_bad" },
      participants: [],
      initialState: {},
      finalState: {},
      log: [],
    };
    const ReplayStatusPage = ({ matchID, status }) =>
      h("div", null, `Replay status ${status} for ${matchID}`);
    const Page = createGMatchPage({
      getMatchPageData: vi.fn().mockResolvedValue({
        kind: "archived",
        matchID: "m_bad",
        archivedMatch,
      }),
      buildReplayFrames: vi.fn().mockImplementation(() => {
        throw new Error("Initial replay state is invalid");
      }),
      ReplayStatusPage,
    });

    const element = await Page({
      params: { matchID: "m_bad" },
      searchParams: { view: "replay" },
    });

    expect(renderToStaticMarkup(element)).toContain(
      "Replay status invalid for m_bad"
    );
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
