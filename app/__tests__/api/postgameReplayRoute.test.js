import { describe, expect, it, vi } from "vitest";
import { createPostgameReplayRoute } from "../../api/matches/[matchID]/replay/handler";
import { getLiveMatch } from "../../../lib/server/matches/getLiveMatch.js";

describe("postgame replay payload route", () => {
  it("returns a ready archived payload", async () => {
    const payload = {
      replay: { match: { bgioMatchId: "m1" } },
      frames: [{ index: 0 }],
    };
    const response = await createPostgameReplayRoute({
      getPostgameReplayPayload: vi.fn().mockResolvedValue(payload),
      getLiveMatch: vi.fn(),
    })(new Request("http://local/api/matches/m1/replay"), {
      params: { matchID: "m1" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
  });

  it("distinguishes preparing, active, and missing matches", async () => {
    const make = (liveMatch) =>
      createPostgameReplayRoute({
        getPostgameReplayPayload: vi.fn().mockResolvedValue(null),
        getLiveMatch: vi.fn().mockResolvedValue(liveMatch),
      });
    expect(
      (await make({ gameover: { winner: "0" } })(null, {
        params: { matchID: "m1" },
      })).status
    ).toBe(202);
    expect(
      (await make({ gameover: null })(null, { params: { matchID: "m1" } }))
        .status
    ).toBe(409);
    expect(
      (await make(null)(null, { params: { matchID: "m1" } })).status
    ).toBe(404);
  });

  it("returns invalid when an archived replay cannot be reconstructed", async () => {
    const response = await createPostgameReplayRoute({
      getPostgameReplayPayload: vi
        .fn()
        .mockRejectedValue(new Error("Replay has no valid frames")),
      getLiveMatch: vi.fn(),
    })(null, { params: { matchID: "m1" } });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      status: "invalid",
      error: "Replay has no valid frames",
    });
  });

  it("returns missing when the real live-match loader receives HTTP 404", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: vi.fn().mockResolvedValue({ error: "Match not found" }),
    });
    const response = await createPostgameReplayRoute({
      getPostgameReplayPayload: vi.fn().mockResolvedValue(null),
      getLiveMatch: ({ matchID }) => getLiveMatch({ matchID, fetchImpl }),
    })(null, { params: { matchID: "missing" } });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ status: "missing" });
  });
});
