import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canResumePausedMatch,
  getHumanAccountsAfterJoin,
  pauseAlertsAfterHumanJoin,
} from "../matchAlerts/humanMatchAlertPause.js";

describe("human match alert pause", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns both humans only when the joining seat fills the match", () => {
    const liveMatch = {
      matchID: "match_1",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: { id: 1, name: "" },
      },
    };

    expect(
      getHumanAccountsAfterJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "human",
      })
    ).toEqual(["acct_ada", "acct_bren"]);
    expect(
      getHumanAccountsAfterJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "bot",
      })
    ).toEqual([]);
  });

  it("pauses alerts only for humans in a newly filled match", async () => {
    const pauseMatchAlerts = vi.fn().mockResolvedValue(["acct_ada", "acct_bren"]);
    const liveMatch = {
      matchID: "match_1",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: { id: 1, name: "" },
      },
    };

    await expect(
      pauseAlertsAfterHumanJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "bot",
        pauseMatchAlerts,
      })
    ).resolves.toEqual([]);
    expect(pauseMatchAlerts).not.toHaveBeenCalled();

    await expect(
      pauseAlertsAfterHumanJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "human",
        pauseMatchAlerts,
      })
    ).resolves.toEqual(["acct_ada", "acct_bren"]);
    expect(pauseMatchAlerts).toHaveBeenCalledWith({
      accountIds: ["acct_ada", "acct_bren"],
      matchID: "match_1",
    });
  });

  it("resumes only after the recorded match is over or gone", async () => {
    const active = vi.fn().mockResolvedValue({ matchID: "m1", gameover: false });
    const finished = vi
      .fn()
      .mockResolvedValue({ matchID: "m1", gameover: { winner: "0" } });
    const gone = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("missing"), { status: 404 }));

    await expect(
      canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: active })
    ).resolves.toBe(false);
    await expect(
      canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: finished })
    ).resolves.toBe(true);
    await expect(
      canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: gone })
    ).resolves.toBe(true);
  });

  it("preserves lobby response status when deciding whether a missing match can resume", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "missing" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(canResumePausedMatch({ matchID: "m1" })).resolves.toBe(true);
  });
});
