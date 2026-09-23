import { describe, expect, it, vi } from "vitest";

import { matchmakePublicMatchForAccount } from "../matches/matchmakePublicMatchForAccount.js";

const account = (id, username) => ({
  id,
  currentUsername: username,
  avatarEmoji: "🐟",
  avatarColor: "sky",
});

describe("public matchmaking", () => {
  it("does not create a seat for a request that Cancel reached first", async () => {
    const listPublicOpenMatches = vi.fn();
    const createMatchForAccount = vi.fn();

    await expect(
      matchmakePublicMatchForAccount({
        account: account("acct_ada", "Ada"),
        modeId: "duel",
        numPlayers: 2,
        setupData: { modeId: "duel" },
        matchmakingRequestId: "r".repeat(48),
        requestedCredentials: "c".repeat(48),
        withMatchMutationLock: async ({ run }) => run(),
        isPublicMatchmakingRequestCancelled: vi.fn().mockResolvedValue(true),
        findMatchmakingMutationSeats: vi.fn(),
        listPublicOpenMatches,
        createMatchForAccount,
      })
    ).resolves.toEqual({ status: "cancelled", seats: [] });

    expect(listPublicOpenMatches).not.toHaveBeenCalled();
    expect(createMatchForAccount).not.toHaveBeenCalled();
  });

  it("randomizes which simultaneous seeker receives the first-placement seat", async () => {
    const matches = [];
    let nextMatch = 1;
    let lockTail = Promise.resolve();
    const withMatchMutationLock = async ({ matchID, run }) => {
      if (matchID !== "public-matchmaking:duel") return run();
      const previous = lockTail;
      let release;
      lockTail = new Promise((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await run();
      } finally {
        release();
      }
    };
    const createMatchForAccount = vi.fn(async ({
      account: creator,
      creatorSeatId = "0",
    }) => {
      const matchID = `duel_${nextMatch++}`;
      const openSeatId = creatorSeatId === "0" ? "1" : "0";
      matches.push({
        matchID,
        players: {
          0: { id: 0, name: "" },
          1: { id: 1, name: "" },
          [creatorSeatId]: {
            id: Number(creatorSeatId),
            name: creator.currentUsername,
            data: { accountId: creator.id },
          },
          [openSeatId]: { id: Number(openSeatId), name: "" },
        },
      });
      return {
        matchID,
        playerID: creatorSeatId,
        playerCredentials: `${creator.id}-credentials`,
      };
    });
    const joinMatchForAccount = vi.fn(
      async ({ account: joiner, matchID, playerID }) => {
        matches
          .find((match) => match.matchID === matchID)
          .players[playerID] = {
            id: Number(playerID),
            name: joiner.currentUsername,
            data: { accountId: joiner.id },
          };
        return {
          matchID,
          playerID: String(playerID),
          playerCredentials: `${joiner.id}-credentials`,
        };
      }
    );

    const dependencies = {
      withMatchMutationLock,
      isPublicMatchmakingRequestCancelled: vi.fn().mockResolvedValue(false),
      findMatchmakingMutationSeats: vi.fn().mockResolvedValue([]),
      listPublicOpenMatches: vi.fn(async () => matches),
      createMatchForAccount,
      joinMatchForAccount,
      getLiveMatch: vi.fn(async ({ matchID }) =>
        matches.find((match) => match.matchID === matchID)
      ),
      reserveAlertsBeforeHumanJoin: vi.fn().mockResolvedValue(null),
      finalizeAlertsAfterHumanJoin: vi.fn(),
      restoreAlertsAfterFailedHumanJoin: vi.fn(),
      pickCreatorSeatId: () => "1",
    };

    const [ada, grace] = await Promise.all([
      matchmakePublicMatchForAccount({
        ...dependencies,
        account: account("acct_ada", "Ada"),
        modeId: "duel",
        numPlayers: 2,
        setupData: { modeId: "duel" },
        matchmakingRequestId: "a".repeat(48),
        requestedCredentials: "c".repeat(48),
      }),
      matchmakePublicMatchForAccount({
        ...dependencies,
        account: account("acct_grace", "Grace"),
        modeId: "duel",
        numPlayers: 2,
        setupData: { modeId: "duel" },
        matchmakingRequestId: "b".repeat(48),
        requestedCredentials: "d".repeat(48),
      }),
    ]);

    expect(ada).toEqual(
      expect.objectContaining({
        matchID: "duel_1",
        playerID: "1",
        createdNewPublicDuel: true,
      })
    );
    expect(grace).toEqual(
      expect.objectContaining({
        matchID: "duel_1",
        playerID: "0",
        createdNewPublicDuel: false,
      })
    );
    expect(createMatchForAccount).toHaveBeenCalledTimes(1);
    expect(matches[0].players[0].data.accountId).toBe("acct_grace");
    expect(matches[0].players[1].data.accountId).toBe("acct_ada");
  });

  it("keeps random seat assignment when a listed duel fills before its join lock", async () => {
    const listedMatch = {
      matchID: "duel_filled",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: { id: 1, name: "" },
      },
    };
    const filledMatch = {
      ...listedMatch,
      players: {
        ...listedMatch.players,
        1: {
          id: 1,
          name: "Grace",
          data: { participantType: "human", accountId: "acct_grace" },
        },
      },
    };
    const createMatchForAccount = vi.fn(async ({ creatorSeatId = "0" }) => ({
      matchID: "duel_new",
      playerID: creatorSeatId,
      playerCredentials: "c".repeat(48),
    }));

    const result = await matchmakePublicMatchForAccount({
      account: account("acct_katherine", "Katherine"),
      modeId: "duel",
      numPlayers: 2,
      setupData: { modeId: "duel" },
      matchmakingRequestId: "r".repeat(48),
      requestedCredentials: "c".repeat(48),
      withMatchMutationLock: async ({ run }) => run(),
      isPublicMatchmakingRequestCancelled: vi.fn().mockResolvedValue(false),
      findMatchmakingMutationSeats: vi.fn().mockResolvedValue([]),
      listPublicOpenMatches: vi.fn().mockResolvedValue([listedMatch]),
      getLiveMatch: vi.fn().mockResolvedValue(filledMatch),
      createMatchForAccount,
      pickCreatorSeatId: () => "1",
    });

    expect(result).toEqual({
      matchID: "duel_new",
      playerID: "1",
      playerCredentials: "c".repeat(48),
      createdNewPublicDuel: true,
    });
  });

  it("returns the seat already owned by a retried request instead of matching twice", async () => {
    const requestedCredentials = "c".repeat(48);
    const listPublicOpenMatches = vi.fn().mockResolvedValue([]);
    const createMatchForAccount = vi.fn().mockResolvedValue({
      matchID: "duel_duplicate",
      playerID: "0",
      playerCredentials: requestedCredentials,
    });
    const joinMatchForAccount = vi.fn();

    const result = await matchmakePublicMatchForAccount({
      account: account("acct_ada", "Ada"),
      modeId: "duel",
      numPlayers: 2,
      setupData: { modeId: "duel" },
      matchmakingRequestId: "r".repeat(48),
      requestedCredentials,
      withMatchMutationLock: async ({ run }) => run(),
      isPublicMatchmakingRequestCancelled: vi.fn().mockResolvedValue(false),
      findMatchmakingMutationSeats: vi
        .fn()
        .mockResolvedValue([{ matchID: "duel_existing", playerID: "0" }]),
      getLiveMatch: vi.fn().mockResolvedValue({
        matchID: "duel_existing",
        players: {
          0: {
            id: 0,
            name: "Ada",
            data: {
              participantType: "human",
              accountId: "acct_ada",
              matchmakingRequestId: "r".repeat(48),
            },
          },
          1: { id: 1, name: "" },
        },
      }),
      listPublicOpenMatches,
      createMatchForAccount,
      joinMatchForAccount,
    });

    expect(result).toEqual({
      matchID: "duel_existing",
      playerID: "0",
      playerCredentials: requestedCredentials,
      createdNewPublicDuel: true,
    });
    expect(listPublicOpenMatches).not.toHaveBeenCalled();
    expect(createMatchForAccount).not.toHaveBeenCalled();
    expect(joinMatchForAccount).not.toHaveBeenCalled();
  });

  it("serializes an existing-seat join with both the public queue and target match", async () => {
    const lockKeys = [];
    const openMatch = {
      matchID: "duel_open",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: { id: 1, name: "" },
      },
    };

    await matchmakePublicMatchForAccount({
      account: account("acct_grace", "Grace"),
      modeId: "duel",
      numPlayers: 2,
      setupData: { modeId: "duel" },
      matchmakingRequestId: "r".repeat(48),
      requestedCredentials: "c".repeat(48),
      withMatchMutationLock: async ({ matchID, run }) => {
        lockKeys.push(matchID);
        return run();
      },
      isPublicMatchmakingRequestCancelled: vi.fn().mockResolvedValue(false),
      findMatchmakingMutationSeats: vi.fn().mockResolvedValue([]),
      listPublicOpenMatches: vi.fn().mockResolvedValue([openMatch]),
      getLiveMatch: vi.fn().mockResolvedValue(openMatch),
      joinMatchForAccount: vi.fn().mockResolvedValue({
        matchID: openMatch.matchID,
        playerID: "1",
        playerCredentials: "c".repeat(48),
      }),
      reserveAlertsBeforeHumanJoin: vi.fn().mockResolvedValue(null),
    });

    expect(lockKeys).toEqual(["public-matchmaking:duel", "duel_open"]);
  });
});
