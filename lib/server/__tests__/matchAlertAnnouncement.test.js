import { describe, expect, it, vi } from "vitest";
import {
  buildMatchAlertPayload,
  sendMatchAlert,
} from "../matchAlerts/sendMatchAlert.js";
import {
  announceWaitingDuel,
  validateWaitingDuel,
} from "../matchAlerts/announceWaitingDuel.js";

const subscriptionA = {
  accountId: "acct_ada",
  endpoint: "https://push.example/a",
  p256dh: "p256dh-a",
  auth: "auth-a",
};

const subscriptionB = {
  accountId: "acct_grace",
  endpoint: "https://push.example/b",
  p256dh: "p256dh-b",
  auth: "auth-b",
};

const validWaitingMatch = {
  matchID: "match_1",
  gameName: "catana",
  setupData: { modeId: "duel", isPrivate: false },
  players: {
    0: {
      id: 0,
      name: "Zak",
      data: { participantType: "human", accountId: "acct_zak" },
    },
    1: { id: 1, name: "" },
  },
};

describe("waiting-duel verification", () => {
  it("accepts only the original lone human at an open public duel", () => {
    expect(
      validateWaitingDuel({
        liveMatch: validWaitingMatch,
        matchID: "match_1",
        seekerAccountId: "acct_zak",
      })
    ).toEqual({ valid: true, reason: "waiting", seekerName: "Zak" });
  });

  it("normalizes array players and setup data nested under metadata", () => {
    expect(
      validateWaitingDuel({
        liveMatch: {
          ...validWaitingMatch,
          setupData: undefined,
          metadata: { setupData: validWaitingMatch.setupData },
          players: Object.values(validWaitingMatch.players),
        },
        matchID: "match_1",
        seekerAccountId: "acct_zak",
      })
    ).toEqual({ valid: true, reason: "waiting", seekerName: "Zak" });
  });

  it.each([
    [
      "filled",
      {
        0: {
          name: "Zak",
          data: { participantType: "human", accountId: "acct_zak" },
        },
        1: {
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
      },
    ],
    ["cancelled", { 0: { name: "" }, 1: { name: "" } }],
    [
      "bot",
      {
        0: { name: "Puffer", data: { participantType: "bot" } },
        1: { name: "" },
      },
    ],
  ])("rejects a %s table", (_reason, players) => {
    expect(
      validateWaitingDuel({
        liveMatch: {
          matchID: "match_1",
          setupData: { modeId: "duel", isPrivate: false },
          players,
        },
        matchID: "match_1",
        seekerAccountId: "acct_zak",
      }).valid
    ).toBe(false);
  });

  it.each([
    ["wrong match ID", { matchID: "another_match" }, "acct_zak"],
    ["wrong mode", { setupData: { modeId: "classic", isPrivate: false } }, "acct_zak"],
    ["private table", { setupData: { modeId: "duel", isPrivate: true } }, "acct_zak"],
    [
      "friend challenge",
      { setupData: { modeId: "duel", matchKind: "friend_challenge" } },
      "acct_zak",
    ],
    ["wrong account", {}, "acct_forged"],
    [
      "non-human occupant",
      {
        players: {
          0: {
            id: 0,
            name: "Puffer",
            data: { participantType: "bot", accountId: "acct_zak" },
          },
          1: { id: 1, name: "" },
        },
      },
      "acct_zak",
    ],
  ])("collapses a %s to not_eligible", (_label, matchOverrides, seekerAccountId) => {
    expect(
      validateWaitingDuel({
        liveMatch: { ...validWaitingMatch, ...matchOverrides },
        matchID: "match_1",
        seekerAccountId,
      })
    ).toEqual({ valid: false, reason: "not_eligible", seekerName: null });
  });

  it("uses a generic seeker-name fallback when no trimmed public name is available", () => {
    expect(
      validateWaitingDuel({
        liveMatch: {
          ...validWaitingMatch,
          players: {
            ...validWaitingMatch.players,
            0: { ...validWaitingMatch.players[0], name: "   " },
          },
        },
        matchID: "match_1",
        seekerAccountId: "acct_zak",
      })
    ).toEqual({ valid: true, reason: "waiting", seekerName: null });
  });

  it("rejects a finished table without claiming it", () => {
    expect(
      validateWaitingDuel({
        liveMatch: { ...validWaitingMatch, gameover: { winner: "0" } },
        matchID: "match_1",
        seekerAccountId: "acct_zak",
      })
    ).toEqual({ valid: false, reason: "finished", seekerName: "Zak" });
  });
});

describe("waiting-duel announcement orchestration", () => {
  it("claims before fanout and makes duplicate requests harmless", async () => {
    const claim = vi.fn().mockResolvedValue({ claimed: false, reason: "duplicate" });
    const list = vi.fn();
    const send = vi.fn();
    await expect(
      announceWaitingDuel({
        matchID: "match_1",
        seekerAccountId: "acct_zak",
        getLiveMatchImpl: vi.fn().mockResolvedValue(validWaitingMatch),
        claimMatchAlertEventImpl: claim,
        listEligibleMatchAlertSubscriptionsImpl: list,
        sendMatchAlertImpl: send,
      })
    ).resolves.toEqual({ announced: false, reason: "duplicate" });
    expect(list).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["rate_limited_minute", "rate_limited_hour"])(
    "returns the store's %s result without fanout",
    async (reason) => {
      const list = vi.fn();
      const send = vi.fn();
      await expect(
        announceWaitingDuel({
          matchID: "match_1",
          seekerAccountId: "acct_zak",
          getLiveMatchImpl: vi.fn().mockResolvedValue(validWaitingMatch),
          claimMatchAlertEventImpl: vi.fn().mockResolvedValue({
            claimed: false,
            reason,
          }),
          listEligibleMatchAlertSubscriptionsImpl: list,
          sendMatchAlertImpl: send,
        })
      ).resolves.toEqual({ announced: false, reason });
      expect(list).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    }
  );

  it("fetches, validates, claims, lists, and sends in that order", async () => {
    const order = [];
    const getLiveMatchImpl = vi.fn(async (input) => {
      order.push("fetch");
      expect(input).toEqual({ matchID: "match_1" });
      return validWaitingMatch;
    });
    const claimMatchAlertEventImpl = vi.fn(async (input) => {
      order.push("claim");
      expect(input).toEqual({ matchID: "match_1", seekerAccountId: "acct_zak" });
      return { claimed: true, reason: "claimed" };
    });
    const listEligibleMatchAlertSubscriptionsImpl = vi.fn(async (input) => {
      order.push("list");
      expect(input).toEqual({ excludeAccountId: "acct_zak" });
      return [subscriptionA];
    });
    const delivery = { attempted: 1, delivered: 0, expired: 0, failed: 1 };
    const sendMatchAlertImpl = vi.fn(async (input) => {
      order.push("send");
      expect(input).toEqual({
        matchID: "match_1",
        seekerName: "Zak",
        subscriptions: [subscriptionA],
      });
      return delivery;
    });

    await expect(
      announceWaitingDuel({
        matchID: "match_1",
        seekerAccountId: "acct_zak",
        getLiveMatchImpl,
        claimMatchAlertEventImpl,
        listEligibleMatchAlertSubscriptionsImpl,
        sendMatchAlertImpl,
      })
    ).resolves.toEqual({ announced: true, reason: "announced", delivery });
    expect(order).toEqual(["fetch", "claim", "list", "send"]);
  });

  it.each([
    [
      "filled",
      {
        ...validWaitingMatch.players,
        1: {
          id: 1,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
      },
    ],
    ["cancelled", { 0: { id: 0, name: "" }, 1: { id: 1, name: "" } }],
  ])("does not claim a legitimately %s table", async (reason, players) => {
    const claim = vi.fn();
    await expect(
      announceWaitingDuel({
        matchID: "match_1",
        seekerAccountId: "acct_zak",
        getLiveMatchImpl: vi.fn().mockResolvedValue({
          ...validWaitingMatch,
          players,
        }),
        claimMatchAlertEventImpl: claim,
      })
    ).resolves.toEqual({ announced: false, reason });
    expect(claim).not.toHaveBeenCalled();
  });

  it.each([404, 410])("collapses a missing match response with status %s", async (status) => {
    await expect(
      announceWaitingDuel({
        matchID: "match_1",
        seekerAccountId: "acct_zak",
        getLiveMatchImpl: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("missing"), { status })),
      })
    ).resolves.toEqual({ announced: false, reason: "not_eligible" });
  });
});

describe("Web Push delivery", () => {
  it("builds the fixed named and generic payloads", () => {
    expect(
      buildMatchAlertPayload({ matchID: "match 1", seekerName: "Zak" })
    ).toEqual({
      type: "match-alert",
      matchID: "match 1",
      seekerName: "Zak",
      title: "⚔️ Zak is looking for a duel",
      body: "Tap to see if the table is still open.",
      url: "/?matchAlert=match%201",
      tag: "match-alert-match 1",
    });
    expect(buildMatchAlertPayload({ matchID: "match_2", seekerName: "" })).toEqual(
      expect.objectContaining({
        seekerName: null,
        title: "⚔️ Someone is looking for a duel",
      })
    );
  });

  it("removes expired endpoints and records the delivery summary", async () => {
    const sendNotification = vi
      .fn()
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }));
    const removeExpired = vi.fn();
    const record = vi.fn();
    await expect(
      sendMatchAlert({
        matchID: "match_1",
        seekerName: "Zak",
        subscriptions: [subscriptionA, subscriptionB],
        webPush: { sendNotification },
        config: {
          configured: true,
          subject: "mailto:hello@settlehex.com",
          publicKey: "pub",
          privateKey: "priv",
        },
        deleteExpiredImpl: removeExpired,
        recordDeliveryImpl: record,
      })
    ).resolves.toEqual({ attempted: 2, delivered: 1, expired: 1, failed: 0 });
    expect(removeExpired).toHaveBeenCalledWith(
      expect.objectContaining({ endpoints: [subscriptionB.endpoint] })
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ matchID: "match_1", delivered: 1, expired: 1 })
    );
    expect(sendNotification).toHaveBeenNthCalledWith(
      1,
      {
        endpoint: subscriptionA.endpoint,
        keys: { p256dh: subscriptionA.p256dh, auth: subscriptionA.auth },
      },
      JSON.stringify(buildMatchAlertPayload({ matchID: "match_1", seekerName: "Zak" })),
      {
        TTL: 300,
        vapidDetails: {
          subject: "mailto:hello@settlehex.com",
          publicKey: "pub",
          privateKey: "priv",
        },
      }
    );
  });

  it("treats 404 and 410 as expired and other rejections as failures", async () => {
    const sendNotification = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { statusCode: 404 }))
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error("unavailable"), { statusCode: 503 }));
    const deleteExpiredImpl = vi.fn();
    const recordDeliveryImpl = vi.fn();
    const subscriptions = [
      subscriptionA,
      subscriptionB,
      { ...subscriptionB, endpoint: "https://push.example/c" },
    ];

    await expect(
      sendMatchAlert({
        matchID: "match_1",
        subscriptions,
        webPush: { sendNotification },
        config: {
          configured: true,
          subject: "mailto:hello@settlehex.com",
          publicKey: "pub",
          privateKey: "priv",
        },
        deleteExpiredImpl,
        recordDeliveryImpl,
      })
    ).resolves.toEqual({ attempted: 3, delivered: 0, expired: 2, failed: 1 });
    expect(deleteExpiredImpl).toHaveBeenCalledWith({
      endpoints: [subscriptionA.endpoint, subscriptionB.endpoint],
    });
    expect(recordDeliveryImpl).toHaveBeenCalledWith({
      matchID: "match_1",
      attempted: 3,
      delivered: 0,
      expired: 2,
      failed: 1,
    });
  });

  it("isolates a synchronous sender failure and continues fanout", async () => {
    const sendNotification = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("invalid subscription");
      })
      .mockResolvedValueOnce({ statusCode: 201 });
    const recordDeliveryImpl = vi.fn();

    await expect(
      sendMatchAlert({
        matchID: "match_1",
        subscriptions: [subscriptionA, subscriptionB],
        webPush: { sendNotification },
        config: {
          configured: true,
          subject: "mailto:hello@settlehex.com",
          publicKey: "pub",
          privateKey: "priv",
        },
        recordDeliveryImpl,
      })
    ).resolves.toEqual({ attempted: 2, delivered: 1, expired: 0, failed: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(recordDeliveryImpl).toHaveBeenCalledWith({
      matchID: "match_1",
      attempted: 2,
      delivered: 1,
      expired: 0,
      failed: 1,
    });
  });

  it("records every attempt as failed when VAPID is not configured", async () => {
    const sendNotification = vi.fn();
    const deleteExpiredImpl = vi.fn();
    const recordDeliveryImpl = vi.fn();

    await expect(
      sendMatchAlert({
        matchID: "match_1",
        subscriptions: [subscriptionA, subscriptionB],
        webPush: { sendNotification },
        config: { configured: false, subject: "", publicKey: "", privateKey: "" },
        deleteExpiredImpl,
        recordDeliveryImpl,
      })
    ).resolves.toEqual({ attempted: 2, delivered: 0, expired: 0, failed: 2 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(deleteExpiredImpl).not.toHaveBeenCalled();
    expect(recordDeliveryImpl).toHaveBeenCalledWith({
      matchID: "match_1",
      attempted: 2,
      delivered: 0,
      expired: 0,
      failed: 2,
    });
  });
});
