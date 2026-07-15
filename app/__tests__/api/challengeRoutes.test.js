import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const routePath = (...segments) =>
  path.join(repoRoot, "app", "api", "challenges", ...segments);

const loadRoute = async (...segments) => {
  const targetPath = routePath(...segments);
  expect(fs.existsSync(targetPath)).toBe(true);
  const href = pathToFileURL(targetPath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
};

afterEach(() => {
  vi.resetModules();
});

describe("challenge API routes", () => {
  it("creates a private friend challenge and returns the share URL", async () => {
    const { createChallengeCreateRoute } = await loadRoute("create", "handler.js");
    const getSessionAccount = vi.fn();
    const createMatchForAccount = vi.fn();
    const now = () => new Date("2026-04-09T08:00:00.000Z");
    const POST = createChallengeCreateRoute({
      getSessionAccount,
      createMatchForAccount,
      pickInviterSeat: () => "1",
      now,
    });

    const unauthorized = await POST(
      new Request("http://localhost/api/challenges/create", {
        method: "POST",
      })
    );
    expect(unauthorized.status).toBe(401);
    expect(createMatchForAccount).not.toHaveBeenCalled();

    getSessionAccount.mockResolvedValue({
      account: {
        id: "acct_1",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
    });
    createMatchForAccount.mockResolvedValue({
      matchID: "match_1",
      playerID: "1",
      playerCredentials: "secret_inviter",
    });

    const response = await POST(
      new Request("http://localhost/api/challenges/create", {
        method: "POST",
        headers: { cookie: "settlehex_session=a.b" },
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      matchID: "match_1",
      playerID: "1",
      playerCredentials: "secret_inviter",
      challengeUrl: "/challenge/match_1",
      expiresAt: "2026-04-09T08:05:00.000Z",
    });
    expect(createMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        numPlayers: 2,
        creatorSeatId: "1",
        setupData: {
          modeId: "duel",
          rulesetId: "duel",
          boardSourceId: "duel-fair-official-v1",
          matchKind: "friend_challenge",
          friendChallenge: {
            inviterAccountId: "acct_1",
            inviterSeatId: "1",
            createdAt: "2026-04-09T08:00:00.000Z",
            expiresAt: "2026-04-09T08:05:00.000Z",
          },
        },
      })
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("secret_inviter");
  });

  it("resolves pending vs expired challenge state", async () => {
    const { createChallengeDetailsRoute } = await loadRoute("[matchID]", "handler.js");
    const getLiveMatch = vi.fn();
    const GET = createChallengeDetailsRoute({
      getLiveMatch,
      now: () => new Date("2026-04-09T08:02:00.000Z"),
    });

    getLiveMatch.mockResolvedValueOnce({
      matchID: "match_1",
      metadata: {
        setupData: {
          matchKind: "friend_challenge",
          friendChallenge: {
            inviterAccountId: "acct_1",
            inviterSeatId: "1",
            createdAt: "2026-04-09T08:00:00.000Z",
            expiresAt: "2026-04-09T08:05:00.000Z",
          },
        },
      },
      players: {
        0: { id: 0, name: "" },
        1: { id: 1, name: "Ada", data: { accountId: "acct_1" } },
      },
    });
    const pendingResponse = await GET(
      new Request("http://localhost/api/challenges/match_1"),
      { params: { matchID: "match_1" } }
    );
    expect(await pendingResponse.json()).toEqual({
      status: "pending",
      matchID: "match_1",
      inviterSeatId: "1",
      inviteeSeatId: "0",
      expiresAt: "2026-04-09T08:05:00.000Z",
    });

    getLiveMatch.mockResolvedValueOnce({
      matchID: "match_1",
      metadata: {
        setupData: {
          matchKind: "friend_challenge",
          friendChallenge: {
            inviterAccountId: "acct_1",
            inviterSeatId: "1",
            createdAt: "2026-04-09T08:00:00.000Z",
            expiresAt: "2026-04-09T08:01:00.000Z",
          },
        },
      },
      players: {
        0: { id: 0, name: "" },
        1: { id: 1, name: "Ada", data: { accountId: "acct_1" } },
      },
    });
    const expiredResponse = await GET(
      new Request("http://localhost/api/challenges/match_1"),
      { params: { matchID: "match_1" } }
    );
    expect(await expiredResponse.json()).toEqual({
      status: "expired",
      matchID: "match_1",
      error: "This invite has expired.",
    });
  });

  it("accepts and cancels a pending friend challenge through app-owned routes", async () => {
    const { createChallengeAcceptRoute } = await loadRoute("[matchID]", "accept", "handler.js");
    const { createChallengeCancelRoute } = await loadRoute("[matchID]", "cancel", "handler.js");

    const getSessionAccount = vi.fn();
    const getLiveMatch = vi.fn();
    const joinMatchForAccount = vi.fn();
    const reservation = {
      matchID: "match_1",
      pausedAccountIds: ["acct_inviter", "acct_friend"],
      previousPreferences: [],
    };
    const order = [];
    const reserveAlertsBeforeHumanJoin = vi.fn(async () => {
      order.push("reserve");
      return reservation;
    });
    const finalizeAlertsAfterHumanJoin = vi
      .fn()
      .mockResolvedValue(["acct_inviter", "acct_friend"]);
    const restoreAlertsAfterFailedHumanJoin = vi.fn().mockResolvedValue([]);
    const logger = { error: vi.fn(), warn: vi.fn() };
    const leaveMatchForAccount = vi.fn();

    const pendingMatch = {
      matchID: "match_1",
      metadata: {
        setupData: {
          matchKind: "friend_challenge",
          friendChallenge: {
            inviterAccountId: "acct_inviter",
            inviterSeatId: "1",
            createdAt: "2026-04-09T08:00:00.000Z",
            expiresAt: "2026-04-09T08:05:00.000Z",
          },
        },
      },
      players: {
        0: { id: 0, name: "" },
        1: { id: 1, name: "Ada", data: { accountId: "acct_inviter" } },
      },
    };

    const ACCEPT = createChallengeAcceptRoute({
      getSessionAccount,
      getLiveMatch,
      joinMatchForAccount,
      reserveAlertsBeforeHumanJoin,
      finalizeAlertsAfterHumanJoin,
      restoreAlertsAfterFailedHumanJoin,
      logger,
      now: () => new Date("2026-04-09T08:02:00.000Z"),
    });
    const CANCEL = createChallengeCancelRoute({
      getSessionAccount,
      getLiveMatch,
      leaveMatchForAccount,
      now: () => new Date("2026-04-09T08:02:00.000Z"),
    });

    const unauthorizedAccept = await ACCEPT(
      new Request("http://localhost/api/challenges/match_1/accept", {
        method: "POST",
      }),
      { params: { matchID: "match_1" } }
    );
    expect(unauthorizedAccept.status).toBe(401);
    expect(joinMatchForAccount).not.toHaveBeenCalled();

    getSessionAccount.mockResolvedValueOnce({
      account: {
        id: "acct_friend",
        currentUsername: "Bert",
        avatarEmoji: "😎",
        avatarColor: "white",
      },
    });
    getLiveMatch.mockResolvedValueOnce(pendingMatch);
    joinMatchForAccount.mockImplementationOnce(async () => {
      order.push("join");
      return {
        playerID: "0",
        playerCredentials: "secret_friend",
      };
    });

    const acceptResponse = await ACCEPT(
      new Request("http://localhost/api/challenges/match_1/accept", {
        method: "POST",
        headers: { cookie: "settlehex_session=a.b" },
      }),
      { params: { matchID: "match_1" } }
    );
    expect(acceptResponse.status).toBe(200);
    expect(await acceptResponse.json()).toMatchObject({
      matchID: "match_1",
      playerID: "0",
      playerCredentials: "secret_friend",
    });
    expect(acceptResponse.headers.get("set-cookie")).toContain("HttpOnly");
    expect(acceptResponse.headers.get("set-cookie")).toContain("secret_friend");
    expect(joinMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        matchID: "match_1",
        playerID: "0",
        account: expect.objectContaining({ id: "acct_friend" }),
      })
    );
    expect(reserveAlertsBeforeHumanJoin).toHaveBeenCalledWith({
      liveMatch: pendingMatch,
      joiningAccountId: "acct_friend",
      joiningPlayerId: "0",
      participantType: "human",
      matchID: "match_1",
    });
    expect(order).toEqual(["reserve", "join"]);
    expect(finalizeAlertsAfterHumanJoin).toHaveBeenCalledWith({ reservation });
    expect(restoreAlertsAfterFailedHumanJoin).not.toHaveBeenCalled();

    getSessionAccount.mockResolvedValueOnce({
      account: {
        id: "acct_friend_2",
        currentUsername: "Bren",
        avatarEmoji: "😎",
        avatarColor: "white",
      },
    });
    getLiveMatch.mockResolvedValueOnce(pendingMatch);
    const failedReservation = {
      matchID: "match_1",
      pausedAccountIds: ["acct_inviter", "acct_friend_2"],
      previousPreferences: [],
    };
    reserveAlertsBeforeHumanJoin.mockResolvedValueOnce(failedReservation);
    joinMatchForAccount.mockRejectedValueOnce(
      Object.assign(new Error("seat already filled"), { status: 409 })
    );

    const rejectedJoinResponse = await ACCEPT(
      new Request("http://localhost/api/challenges/match_1/accept", {
        method: "POST",
        headers: { cookie: "settlehex_session=a.b" },
      }),
      { params: { matchID: "match_1" } }
    );
    expect(rejectedJoinResponse.status).toBe(409);
    expect(await rejectedJoinResponse.json()).toEqual({
      error: "seat already filled",
    });
    expect(restoreAlertsAfterFailedHumanJoin).toHaveBeenCalledWith({
      reservation: failedReservation,
      joiningAccountId: "acct_friend_2",
      joiningPlayerId: "0",
      matchID: "match_1",
      joinError: expect.objectContaining({
        message: "seat already filled",
        status: 409,
      }),
    });

    getSessionAccount.mockResolvedValueOnce({
      account: {
        id: "acct_inviter",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
    });
    getLiveMatch.mockResolvedValueOnce(pendingMatch);
    leaveMatchForAccount.mockResolvedValueOnce({
      matchID: "match_1",
      playerID: "1",
      left: true,
    });

    const cancelResponse = await CANCEL(
      new Request("http://localhost/api/challenges/match_1/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "settlehex_session=a.b",
        },
        body: JSON.stringify({ credentials: "secret_inviter" }),
      }),
      { params: { matchID: "match_1" } }
    );
    expect(cancelResponse.status).toBe(200);
    expect(await cancelResponse.json()).toEqual({
      matchID: "match_1",
      playerID: "1",
      canceled: true,
    });
    expect(leaveMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        matchID: "match_1",
        playerID: "1",
        credentials: "secret_inviter",
        account: expect.objectContaining({ id: "acct_inviter" }),
      })
    );
  });
});
