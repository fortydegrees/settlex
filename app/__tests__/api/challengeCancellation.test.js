import { describe, expect, it, vi } from "vitest";
import { createChallengeAcceptRoute } from "../../api/challenges/[matchID]/accept/handler.js";
import { createChallengeCancelRoute } from "../../api/challenges/[matchID]/cancel/handler.js";

const pendingMatch = () => ({
  matchID: "m1",
  setupData: {
    matchKind: "friend_challenge",
    friendChallenge: {
      inviterAccountId: "inviter",
      inviterSeatId: "1",
      expiresAt: "2026-10-06T12:05:00Z",
    },
  },
  players: [
    { id: 0, name: "" },
    { id: 1, name: "Ada", credentials: "inviter-secret" },
  ],
});

const request = (action) => new Request(`http://localhost/api/challenges/m1/${action}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ credentials: "inviter-secret" }),
});
const params = { params: { matchID: "m1" } };
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

// Controlled adapter for the existing shared match lock, used by both handlers.
const createMatchLock = () => {
  const tails = new Map();
  return async ({ matchID, run }) => {
    const previous = tails.get(matchID) ?? Promise.resolve();
    const next = deferred();
    tails.set(matchID, next.promise);
    await previous;
    try { return await run(); } finally { next.resolve(); }
  };
};

describe("friend challenge cancellation", () => {
  it("preserves an accepted match after the invitation deadline", async () => {
    const match = pendingMatch();
    match.players[0] = { id: 0, name: "Bert" };
    const leaveMatchForAccount = vi.fn();
    const cancel = createChallengeCancelRoute({
      getSessionAccount: async () => ({ account: { id: "inviter" } }),
      getLiveMatch: async () => match,
      leaveMatchForAccount,
      withMatchMutationLock: createMatchLock(),
      now: () => new Date("2026-10-06T12:10:00Z"),
    });

    const response = await cancel(request("cancel"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ matchID: "m1", canceled: false, status: "accepted" });
    expect(leaveMatchForAccount).not.toHaveBeenCalled();
    expect(match.players[1].credentials).toBe("inviter-secret");
  });

  it.each(["accept", "cancel"])("serializes concurrent acceptance and cancellation when %s starts first", async (firstAction) => {
    const match = pendingMatch();
    const mutationStarted = deferred();
    const releaseMutation = deferred();
    const withMatchMutationLock = createMatchLock();
    const shared = {
      getLiveMatch: async () => structuredClone(match),
      withMatchMutationLock,
      now: () => new Date("2026-10-06T12:02:00Z"),
    };
    const joinMatchForAccount = vi.fn(async () => {
      mutationStarted.resolve();
      await releaseMutation.promise;
      match.players[0] = { id: 0, name: "Bert", credentials: "friend-secret" };
      return { playerCredentials: "friend-secret" };
    });
    const leaveMatchForAccount = vi.fn(async () => {
      mutationStarted.resolve();
      await releaseMutation.promise;
      match.players[1] = { id: 1, name: "" };
    });
    const routes = {
      accept: createChallengeAcceptRoute({
        ...shared,
        getSessionAccount: async () => ({ account: { id: "friend" } }),
        joinMatchForAccount,
        reserveAlertsBeforeHumanJoin: async () => null,
      }),
      cancel: createChallengeCancelRoute({
        ...shared,
        getSessionAccount: async () => ({ account: { id: "inviter" } }),
        leaveMatchForAccount,
      }),
    };
    const first = routes[firstAction](request(firstAction), params);
    await mutationStarted.promise;
    const secondAction = firstAction === "accept" ? "cancel" : "accept";
    const second = routes[secondAction](request(secondAction), params);
    // Let the second request reach the lock while the first mutation is paused.
    await new Promise(setImmediate);
    releaseMutation.resolve();
    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    expect(firstResponse.status).toBe(200);

    if (firstAction === "accept") {
      expect(await secondResponse.json()).toEqual({ matchID: "m1", canceled: false, status: "accepted" });
      expect(leaveMatchForAccount).not.toHaveBeenCalled();
      expect(match.players.map((player) => player.name)).toEqual(["Bert", "Ada"]);
      expect(match.players[1].credentials).toBe("inviter-secret");
    } else {
      expect(secondResponse.status).toBe(410);
      expect(joinMatchForAccount).not.toHaveBeenCalled();
      expect(match.players.map((player) => player.name)).toEqual(["", ""]);
    }
  });
});
