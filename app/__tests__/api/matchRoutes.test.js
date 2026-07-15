import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const routePath = (...segments) =>
  path.join(repoRoot, "app", "api", "matches", ...segments);

const loadRoute = async (...segments) => {
  const targetPath = routePath(...segments);
  expect(fs.existsSync(targetPath)).toBe(true);
  const href = pathToFileURL(targetPath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const runWithoutLock = async ({ run }) => run();

afterEach(() => {
  vi.resetModules();
});

describe("match API routes", () => {
  it("recovers only the current account's seats for a matchmaking operation", async () => {
    const { createMatchRecoveryRoute } = await loadRoute("recover", "handler.js");
    const getSessionAccount = vi.fn();
    const findMatchmakingMutationSeats = vi
      .fn()
      .mockResolvedValue([{ matchID: "match_1", playerID: "0" }]);
    const POST = createMatchRecoveryRoute({
      getSessionAccount,
      findMatchmakingMutationSeats,
    });
    const requestId = "r".repeat(48);

    const unauthorized = await POST(
      new Request("http://localhost/api/matches/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
    );
    expect(unauthorized.status).toBe(401);
    expect(findMatchmakingMutationSeats).not.toHaveBeenCalled();

    getSessionAccount.mockResolvedValue({ account: { id: "acct_1" } });
    const recovered = await POST(
      new Request("http://localhost/api/matches/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "session=1" },
        body: JSON.stringify({ requestId }),
      })
    );
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toEqual({
      seats: [{ matchID: "match_1", playerID: "0" }],
    });
    expect(findMatchmakingMutationSeats).toHaveBeenCalledWith({
      accountId: "acct_1",
      requestId,
    });

    const invalid = await POST(
      new Request("http://localhost/api/matches/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "session=1" },
        body: JSON.stringify({ requestId: "short" }),
      })
    );
    expect(invalid.status).toBe(400);
  });

  it("requires a current session for create and returns seat credentials from the wrapper layer", async () => {
    const { createMatchCreateRoute } = await loadRoute("create", "handler.js");
    const getSessionAccount = vi.fn();
    const createMatchForAccount = vi.fn();
    const createBotMatchForAccount = vi.fn();
    const POST = createMatchCreateRoute({
      getSessionAccount,
      createMatchForAccount,
      createBotMatchForAccount,
    });

    const unauthorized = await POST(
      new Request("http://localhost/api/matches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numPlayers: 2 }),
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
      playerID: "0",
      playerCredentials: "secret_123",
    });

    const authorized = await POST(
      new Request("http://localhost/api/matches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({
          modeId: "duel",
          numPlayers: 4,
          matchmakingRequestId: "r".repeat(48),
          requestedCredentials: "c".repeat(48),
        }),
      })
    );
    const json = await authorized.json();

    expect(authorized.status).toBe(200);
    expect(createMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        numPlayers: 2,
        matchmakingRequestId: "r".repeat(48),
        requestedCredentials: "c".repeat(48),
        setupData: {
          modeId: "duel",
          rulesetId: "duel",
          boardSourceId: "duel-fair-official-v1",
        },
      })
    );
    expect(json.playerCredentials).toBe("secret_123");
    expect(authorized.headers.get("set-cookie")).toContain("HttpOnly");
    expect(authorized.headers.get("set-cookie")).toContain("secret_123");

    createBotMatchForAccount.mockResolvedValue({
      matchID: "bot_match_1",
      playerID: "0",
      playerCredentials: "bot_human_secret",
    });
    const botResponse = await POST(
      new Request("http://localhost/api/matches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({ modeId: "duel", opponentType: "bot" }),
      })
    );

    expect(botResponse.status).toBe(200);
    expect(createBotMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        numPlayers: 2,
        setupData: expect.objectContaining({ modeId: "duel" }),
      })
    );
    expect(createMatchForAccount).toHaveBeenCalledTimes(1);
  });

  it("requires a current session for join and leave, and proxies match metadata reads", async () => {
    const { createMatchJoinRoute } = await loadRoute("join", "handler.js");
    const { createMatchLeaveRoute } = await loadRoute("leave", "handler.js");
    const { createOpenMatchesRoute } = await loadRoute("open", "handler.js");
    const { createMatchDetailsRoute } = await loadRoute("[matchID]", "handler.js");

    const getSessionAccount = vi.fn();
    const getLiveMatch = vi.fn();
    const withMatchMutationLock = vi.fn(async ({ run }) => run());
    const joinMatchForAccount = vi.fn();
    const reservation = {
      matchID: "match_1",
      pausedAccountIds: ["acct_1"],
      previousPreferences: [],
    };
    const reserveAlertsBeforeHumanJoin = vi.fn().mockResolvedValue(reservation);
    const finalizeAlertsAfterHumanJoin = vi.fn().mockResolvedValue(["acct_1"]);
    const restoreAlertsAfterFailedHumanJoin = vi.fn();
    const leaveMatchForAccount = vi.fn();
    const listPublicOpenMatches = vi.fn().mockResolvedValue([
      { matchID: "public_1" },
    ]);
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        matchID: "match_1",
        players: [{ id: 0, name: "Ada" }],
      })
    );

    const JOIN = createMatchJoinRoute({
      getSessionAccount,
      getLiveMatch,
      withMatchMutationLock,
      joinMatchForAccount,
      reserveAlertsBeforeHumanJoin,
      finalizeAlertsAfterHumanJoin,
      restoreAlertsAfterFailedHumanJoin,
    });
    const LEAVE = createMatchLeaveRoute({
      getSessionAccount,
      getLiveMatch,
      withMatchMutationLock,
      leaveMatchForAccount,
    });
    const OPEN = createOpenMatchesRoute({
      listPublicOpenMatches,
    });
    const GET = createMatchDetailsRoute({
      fetchImpl,
      baseUrl: "http://game:8080",
    });

    const unauthorizedJoin = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchID: "match_1",
          playerID: "1",
          matchmakingRequestId: "j".repeat(48),
          requestedCredentials: "k".repeat(48),
        }),
      })
    );
    expect(unauthorizedJoin.status).toBe(401);

    const openResponse = await OPEN(new Request("http://localhost/api/matches/open?modeId=duel"));
    expect(openResponse.status).toBe(200);
    expect(await openResponse.json()).toEqual({
      matches: [{ matchID: "public_1" }],
    });
    expect(listPublicOpenMatches).toHaveBeenCalledWith(
      expect.objectContaining({ modeId: "duel" })
    );

    getSessionAccount.mockResolvedValue({
      account: {
        id: "acct_1",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
    });
    getLiveMatch.mockResolvedValueOnce({
      matchID: "match_private_1",
      metadata: {
        setupData: {
          matchKind: "friend_challenge",
        },
      },
      players: {
        0: { id: 0, name: "Ada" },
        1: { id: 1, name: "" },
      },
    });
    joinMatchForAccount.mockResolvedValue({
      playerID: "1",
      playerCredentials: "secret_join",
    });
    leaveMatchForAccount.mockResolvedValue({
      matchID: "match_1",
      playerID: "1",
      left: true,
    });

    const privateJoinResponse = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({ matchID: "match_private_1", playerID: "1" }),
      })
    );
    expect(privateJoinResponse.status).toBe(403);
    expect(await privateJoinResponse.json()).toEqual({
      error: "Private friend challenges must be joined through their challenge link.",
    });
    expect(joinMatchForAccount).not.toHaveBeenCalled();

    getLiveMatch.mockResolvedValueOnce({
      matchID: "match_1",
      players: {
        0: { id: 0, name: "Ada" },
        1: { id: 1, name: "" },
      },
    });

    const joinResponse = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({
          matchID: "match_1",
          playerID: "1",
          matchmakingRequestId: "j".repeat(48),
          requestedCredentials: "k".repeat(48),
        }),
      })
    );
    const leaveResponse = await LEAVE(
      new Request("http://localhost/api/matches/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({
          matchID: "match_1",
          playerID: "1",
          credentials: "secret_join",
        }),
      })
    );
    const detailsResponse = await GET(
      new Request("http://localhost/api/matches/match_1"),
      { params: { matchID: "match_1" } }
    );

    expect(joinResponse.status).toBe(200);
    expect(leaveResponse.status).toBe(200);
    expect(joinMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        matchID: "match_1",
        playerID: "1",
        matchmakingRequestId: "j".repeat(48),
        requestedCredentials: "k".repeat(48),
      })
    );
    expect(reserveAlertsBeforeHumanJoin).toHaveBeenCalledWith({
      liveMatch: expect.objectContaining({ matchID: "match_1" }),
      joiningAccountId: "acct_1",
      joiningPlayerId: "1",
      participantType: "human",
      matchID: "match_1",
    });
    expect(finalizeAlertsAfterHumanJoin).toHaveBeenCalledWith({ reservation });
    expect(restoreAlertsAfterFailedHumanJoin).not.toHaveBeenCalled();
    expect(leaveMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        credentials: "secret_join",
      })
    );
    expect(withMatchMutationLock).toHaveBeenCalledTimes(3);
    expect(withMatchMutationLock).toHaveBeenCalledWith(
      expect.objectContaining({
        matchID: "match_1",
        run: expect.any(Function),
      })
    );
    expect(joinResponse.headers.get("set-cookie")).toContain("HttpOnly");
    expect(joinResponse.headers.get("set-cookie")).toContain("secret_join");
    expect(leaveResponse.headers.get("set-cookie")).toContain("Max-Age=0");

    const detailsJson = await detailsResponse.json();
    expect(detailsJson.matchID).toBe("match_1");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://game:8080/games/catan/match_1",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("preserves a filled human duel when its seeker tries to cancel matchmaking", async () => {
    const { createMatchLeaveRoute } = await loadRoute("leave", "handler.js");
    const leaveMatchForAccount = vi.fn();
    const withMatchMutationLock = vi.fn(async ({ run }) => run());
    const LEAVE = createMatchLeaveRoute({
      getSessionAccount: vi.fn().mockResolvedValue({
        account: { id: "seeker_account", currentUsername: "Seeker" },
      }),
      getLiveMatch: vi.fn().mockResolvedValue({
        matchID: "filled_duel",
        players: {
          0: {
            id: 0,
            name: "Seeker",
            data: {
              accountId: "seeker_account",
              participantType: "human",
            },
          },
          1: {
            id: 1,
            name: "Joiner",
            data: {
              accountId: "joiner_account",
              participantType: "human",
            },
          },
        },
      }),
      withMatchMutationLock,
      leaveMatchForAccount,
    });

    const response = await LEAVE(
      new Request("http://localhost/api/matches/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "settlehex_session=a.b",
        },
        body: JSON.stringify({
          matchID: "filled_duel",
          playerID: "0",
          credentials: "seeker_secret",
          intent: "matchmaking_cancel",
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Another player has joined your duel.",
      code: "MATCH_FOUND",
    });
    expect(leaveMatchForAccount).not.toHaveBeenCalled();
    expect(withMatchMutationLock).toHaveBeenCalledWith({
      matchID: "filled_duel",
      run: expect.any(Function),
    });
  });

  it("makes the alert pause visible before a human seat and compensates a failed join", async () => {
    const { createMatchJoinRoute } = await loadRoute("join", "handler.js");
    const getSessionAccount = vi.fn().mockResolvedValue({
      account: {
        id: "acct_1",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
    });
    const liveMatch = {
      matchID: "match_1",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_1" },
        },
        1: { id: 1, name: "" },
      },
    };
    const getLiveMatch = vi.fn().mockResolvedValue(liveMatch);
    const order = [];
    let releasePause;
    const pauseGate = new Promise((resolve) => {
      releasePause = resolve;
    });
    const reservation = {
      matchID: "match_1",
      pausedAccountIds: ["acct_1"],
      previousPreferences: [],
    };
    const reserveAlertsBeforeHumanJoin = vi.fn(async ({ participantType }) => {
      order.push("pause:start");
      if (participantType === "bot") return null;
      await pauseGate;
      order.push("pause:done");
      return reservation;
    });
    const joinMatchForAccount = vi.fn(async () => {
      order.push("join");
      return {
        playerID: "1",
        playerCredentials: "secret_join",
      };
    });
    const restoreAlertsAfterFailedHumanJoin = vi.fn();
    const finalizeAlertsAfterHumanJoin = vi.fn().mockResolvedValue(["acct_1"]);
    const JOIN = createMatchJoinRoute({
      getSessionAccount,
      getLiveMatch,
      joinMatchForAccount,
      reserveAlertsBeforeHumanJoin,
      finalizeAlertsAfterHumanJoin,
      restoreAlertsAfterFailedHumanJoin,
      withMatchMutationLock: runWithoutLock,
    });

    const botResponse = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({
          matchID: "match_1",
          playerID: "1",
          participantType: "bot",
        }),
      })
    );

    expect(botResponse.status).toBe(200);
    expect(reserveAlertsBeforeHumanJoin).toHaveBeenCalledWith({
      liveMatch,
      joiningAccountId: "acct_1",
      joiningPlayerId: "1",
      participantType: "bot",
      matchID: "match_1",
    });
    reserveAlertsBeforeHumanJoin.mockClear();
    joinMatchForAccount.mockClear();
    order.length = 0;

    const humanResponsePromise = JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({ matchID: "match_1", playerID: "1" }),
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(joinMatchForAccount).not.toHaveBeenCalled();
    releasePause();
    const humanResponse = await humanResponsePromise;

    expect(humanResponse.status).toBe(200);
    expect(await humanResponse.json()).toMatchObject({
      playerID: "1",
      playerCredentials: "secret_join",
    });
    expect(humanResponse.headers.get("set-cookie")).toContain("secret_join");
    expect(order).toEqual(["pause:start", "pause:done", "join"]);
    expect(finalizeAlertsAfterHumanJoin).toHaveBeenCalledWith({ reservation });
    expect(restoreAlertsAfterFailedHumanJoin).not.toHaveBeenCalled();

    joinMatchForAccount.mockRejectedValueOnce(
      Object.assign(new Error("seat already filled"), { status: 409 })
    );
    restoreAlertsAfterFailedHumanJoin.mockResolvedValueOnce(["acct_1"]);
    const failedJoin = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlehex_session=a.b" },
        body: JSON.stringify({ matchID: "match_1", playerID: "1" }),
      })
    );
    expect(failedJoin.status).toBe(409);
    expect(restoreAlertsAfterFailedHumanJoin).toHaveBeenCalledWith({
      reservation,
      joiningAccountId: "acct_1",
      joiningPlayerId: "1",
      matchID: "match_1",
      joinError: expect.objectContaining({
        message: "seat already filled",
        status: 409,
      }),
    });
  });

  it("does not expose a human seat when reserving the pause fails", async () => {
    const { createMatchJoinRoute } = await loadRoute("join", "handler.js");
    const joinMatchForAccount = vi.fn();
    const JOIN = createMatchJoinRoute({
      getSessionAccount: vi.fn().mockResolvedValue({
        account: { id: "acct_1", currentUsername: "Ada" },
      }),
      getLiveMatch: vi.fn().mockResolvedValue({
        matchID: "match_1",
        players: {
          0: {
            id: 0,
            name: "Bren",
            data: { participantType: "human", accountId: "acct_2" },
          },
          1: { id: 1, name: "" },
        },
      }),
      joinMatchForAccount,
      reserveAlertsBeforeHumanJoin: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
      withMatchMutationLock: runWithoutLock,
    });

    const response = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "session=1" },
        body: JSON.stringify({ matchID: "match_1", playerID: "1" }),
      })
    );

    expect(response.status).toBe(500);
    expect(joinMatchForAccount).not.toHaveBeenCalled();
  });

  it("does not allow the public join route into a private bot-intent match", async () => {
    const { createMatchJoinRoute } = await loadRoute("join", "handler.js");
    const joinMatchForAccount = vi.fn();
    const JOIN = createMatchJoinRoute({
      getSessionAccount: vi.fn().mockResolvedValue({
        account: { id: "acct_1", currentUsername: "Ada" },
      }),
      getLiveMatch: vi.fn().mockResolvedValue({
        matchID: "bot_match_1",
        metadata: { setupData: { modeId: "duel", matchKind: "bot_game" } },
        players: {
          0: { id: 0, name: "Ada" },
          1: { id: 1, name: "" },
        },
      }),
      joinMatchForAccount,
      withMatchMutationLock: runWithoutLock,
    });

    const response = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "session=1" },
        body: JSON.stringify({ matchID: "bot_match_1", playerID: "1" }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Bot matches finish setup on the server.",
    });
    expect(joinMatchForAccount).not.toHaveBeenCalled();
  });
});
