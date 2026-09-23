import { describe, expect, it, vi } from "vitest";

import { cancelPublicMatchmakingForAccount } from "../matches/cancelPublicMatchmakingForAccount.js";

const account = {
  id: "acct_ada",
  currentUsername: "Ada",
};

const waitingMatch = () => ({
  matchID: "duel_waiting",
  players: {
    0: {
      id: 0,
      name: "Ada",
      data: {
        participantType: "human",
        accountId: account.id,
        matchmakingRequestId: "r".repeat(48),
      },
    },
    1: { id: 1, name: "" },
  },
});

describe("public matchmaking cancellation", () => {
  it("removes a waiting seat located by account and request identity", async () => {
    const match = waitingMatch();
    const lockKeys = [];
    const recordPublicMatchmakingCancellation = vi.fn().mockResolvedValue(undefined);
    const leaveMatchForAccount = vi.fn(async ({ matchID, playerID }) => {
      match.players[playerID].name = "";
      return { matchID, playerID, left: true };
    });

    const result = await cancelPublicMatchmakingForAccount({
      account,
      modeId: "duel",
      matchmakingRequestId: "r".repeat(48),
      requestedCredentials: "c".repeat(48),
      withMatchMutationLock: async ({ matchID, run }) => {
        lockKeys.push(matchID);
        return run();
      },
      findMatchmakingMutationSeats: vi
        .fn()
        .mockResolvedValue([{ matchID: match.matchID, playerID: "0" }]),
      getLiveMatch: vi.fn(async () => match),
      leaveMatchForAccount,
      recordPublicMatchmakingCancellation,
    });

    expect(result).toEqual({
      status: "cancelled",
      seats: [{ matchID: "duel_waiting", playerID: "0" }],
    });
    expect(lockKeys).toEqual([
      "public-matchmaking:duel",
      "duel_waiting",
    ]);
    expect(match.players[0].name).toBe("");
    expect(recordPublicMatchmakingCancellation).toHaveBeenCalledWith({
      accountId: account.id,
      modeId: "duel",
      requestId: "r".repeat(48),
    });
  });

  it("preserves a filled human duel and returns the request-owned seat", async () => {
    const match = waitingMatch();
    match.players[1] = {
      id: 1,
      name: "Grace",
      data: {
        participantType: "human",
        accountId: "acct_grace",
        matchmakingRequestId: "g".repeat(48),
      },
    };
    const leaveMatchForAccount = vi.fn();

    const result = await cancelPublicMatchmakingForAccount({
      account,
      modeId: "duel",
      matchmakingRequestId: "r".repeat(48),
      requestedCredentials: "c".repeat(48),
      withMatchMutationLock: async ({ run }) => run(),
      findMatchmakingMutationSeats: vi
        .fn()
        .mockResolvedValue([{ matchID: match.matchID, playerID: "0" }]),
      getLiveMatch: vi.fn(async () => match),
      leaveMatchForAccount,
      recordPublicMatchmakingCancellation: vi.fn(),
    });

    expect(result).toEqual({
      status: "match_found",
      matchID: "duel_waiting",
      playerID: "0",
      playerCredentials: "c".repeat(48),
    });
    expect(leaveMatchForAccount).not.toHaveBeenCalled();
    expect(match.players[0].name).toBe("Ada");
  });

  it("records an unknown request so a delayed start cannot recreate it", async () => {
    const recordPublicMatchmakingCancellation = vi.fn().mockResolvedValue(undefined);
    await expect(
      cancelPublicMatchmakingForAccount({
        account,
        modeId: "duel",
        matchmakingRequestId: "r".repeat(48),
        requestedCredentials: "c".repeat(48),
        withMatchMutationLock: async ({ run }) => run(),
        findMatchmakingMutationSeats: vi.fn().mockResolvedValue([]),
        getLiveMatch: vi.fn(),
        leaveMatchForAccount: vi.fn(),
        recordPublicMatchmakingCancellation,
      })
    ).resolves.toEqual({ status: "cancelled", seats: [] });

    expect(recordPublicMatchmakingCancellation).toHaveBeenCalledWith({
      accountId: account.id,
      modeId: "duel",
      requestId: "r".repeat(48),
    });
  });
});
