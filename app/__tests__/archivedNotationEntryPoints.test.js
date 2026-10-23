import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createGMatchPage } from "../g/[matchID]/page-content.js";
import { createReplayPage } from "../replays/[replayId]/page-content.js";
import { getPostgameReplayPayload } from "../../lib/server/replays/getPostgameReplayPayload.js";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createReplayPageClient } from "../_features/replay/ReplayPageClient.js";
import { loadPostgameReplayPayload } from "../_features/replay/usePostgameReplayPayload.js";
import { createPostgameReplayRoute } from "../api/matches/[matchID]/replay/handler.js";
vi.mock("../_features/replay/PostgameGameBoard", () => ({ PostgameGameBoard: () => null }));

const record = JSON.parse(readFileSync("docs/notation/examples/settlex-complete.han.json", "utf8"));
const archived = (status) => ({
  match: { replayId: "r1", bgioMatchId: "m1", winnerSeatId: "0", playerCount: 3 },
  participants: ["Ada", "Ben", "Cy"].map((name, index) => ({
    seatId: String(index), usernameSnapshot: name, accountId: `account-${index}`,
  })),
  chatMessages: [{ actorId: "1", message: "hello" }],
  notation: { status, record },
  initialState: {}, log: [], finalState: {},
});
const ReplayClient = () => null;
describe.each(["ready", "unavailable"])("archived notation entry points: %s", status => {
  const dependencies = () => ({
    buildReplayFrames: vi.fn(() => [{ index: 0, state: { legacy: true } }]),
    ReplayPageClient: ReplayClient,
    getSessionAccount: vi.fn(async () => ({ account: { id: "account-1" } })),
    headers: () => new Headers(),
    readSeatCredential: vi.fn(async () => null),
  });
  const check = (payload, deps) => {
    expect(payload.replay.source.kind).toBe(status === "ready" ? "notation" : "legacy");
    expect(payload.replay.chatMessages).toEqual([{ actorId: "1", message: "hello" }]);
    expect(payload.replay.participants[1].usernameSnapshot).toBe("Ben");
    expect(payload.replay).not.toHaveProperty("notation");
    if (status === "ready") {
      expect(deps.buildReplayFrames).not.toHaveBeenCalled();
      expect(payload.record).toBe(record);
      expect(payload).not.toHaveProperty("frames");
    } else expect(deps.buildReplayFrames).toHaveBeenCalledOnce();
  };
  it("uses the selected source on the canonical game page with the account perspective", async () => {
    const deps = dependencies();
    const Page = createGMatchPage({ ...deps, getMatchPageData: async () => ({ kind: "archived", archivedMatch: archived(status) }) });
    const element = await Page({ params: { matchID: "m1" } });
    expect(element.type).toBe(ReplayClient);
    expect(element.props.initialPerspectivePlayerID).toBe("1");
    check(element.props, deps);
  });
  it("uses the same selection on legacy replay links with the account perspective", async () => {
    const deps = dependencies();
    const Page = createReplayPage({ ...deps, getArchivedReplay: async () => archived(status) });
    const element = await Page({ params: { replayId: "r1" } });
    expect(element.props.initialPerspectivePlayerID).toBe("1");
    check(element.props, deps);
  });
  it("uses the same selection for the post-game fetch", async () => {
    const deps = dependencies();
    const payload = await getPostgameReplayPayload("m1", { ...deps, getArchivedMatchByMatchId: async () => archived(status) });
    check(payload, deps);
  });
  it("hydrates the chosen payload through the real page-client boundary", async () => {
    const deps = dependencies();
    const payload = await getPostgameReplayPayload("m1", { ...deps, getArchivedMatchByMatchId: async () => archived(status) });
    const Client = createReplayPageClient({
      PostgameGameBoard: ({ initialReplayPayload, initialPerspectivePlayerID }) => h("div", null,
        `${initialReplayPayload.frames.length}:${initialReplayPayload.replay.participants[1].usernameSnapshot}:${initialPerspectivePlayerID}`),
    });
    expect(renderToStaticMarkup(h(Client, { ...payload, initialPerspectivePlayerID: "1" })))
      .toContain(`${status === "ready" ? 2542 : 1}:Ben:1`);
  });
  it("serializes the real route and hydrates it through the post-game loader", async () => {
    const deps = dependencies();
    const selected = await getPostgameReplayPayload("m1", { ...deps, getArchivedMatchByMatchId: async () => archived(status) });
    // Fail before serialization if compact transport regresses: this retained
    // long game's expanded frames exceed the runtime's maximum JSON string.
    if (status === "ready") expect("frames" in selected).toBe(false);
    const Route = createPostgameReplayRoute({
      getPostgameReplayPayload: async () => selected,
    });
    const response = await Route(null, { params: { matchID: "m1" } });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text.length).toBeLessThan(25000);
    const payload = await loadPostgameReplayPayload({ matchID: "m1", fetchImpl: async () => new Response(text) });
    expect(payload.frames).toHaveLength(status === "ready" ? 2542 : 1);
    expect(payload.replay.participants[1].seatId).toBe("1");
  });
});
