import { describe, expect, it, vi } from "vitest";

import {
  findMatchmakingMutationSeats,
  generateMatchPlayerCredentials,
  normalizeMatchmakingMutationToken,
} from "../matches/matchmakingMutation.js";

describe("matchmaking mutation identity", () => {
  it("accepts only bounded URL-safe high-entropy tokens", () => {
    const valid = "a".repeat(32);
    expect(normalizeMatchmakingMutationToken(valid)).toBe(valid);
    expect(normalizeMatchmakingMutationToken("short")).toBeNull();
    expect(normalizeMatchmakingMutationToken(`${"a".repeat(31)}!`)).toBeNull();
    expect(normalizeMatchmakingMutationToken("a".repeat(129))).toBeNull();
  });

  it("uses a valid requested credential and otherwise creates a fresh one", () => {
    const requested = "r".repeat(48);
    const fallback = vi.fn().mockReturnValue("f".repeat(48));

    expect(
      generateMatchPlayerCredentials({
        context: { request: { body: { requestedCredentials: requested } } },
        fallback,
      })
    ).toBe(requested);
    expect(fallback).not.toHaveBeenCalled();
    expect(
      generateMatchPlayerCredentials({
        context: { request: { body: { requestedCredentials: "invalid" } } },
        fallback,
      })
    ).toBe("f".repeat(48));
  });

  it("finds every public human duel seat owned by the account and operation", async () => {
    const requestId = "q".repeat(48);
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          matches: [
            {
              matchID: "owned_1",
              setupData: { modeId: "duel" },
              players: {
                0: {
                  id: 0,
                  name: "Ada",
                  data: {
                    participantType: "human",
                    accountId: "acct_1",
                    matchmakingRequestId: requestId,
                  },
                },
                1: { id: 1, name: "" },
              },
            },
            {
              matchID: "someone_else",
              setupData: { modeId: "duel" },
              players: {
                0: {
                  id: 0,
                  name: "Bren",
                  data: {
                    participantType: "human",
                    accountId: "acct_2",
                    matchmakingRequestId: requestId,
                  },
                },
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      findMatchmakingMutationSeats({
        fetchImpl,
        baseUrl: "http://game:8080",
        accountId: "acct_1",
        requestId,
      })
    ).resolves.toEqual([{ matchID: "owned_1", playerID: "0" }]);
  });
});
