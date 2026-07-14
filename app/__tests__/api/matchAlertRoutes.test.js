import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const loadModule = async (...segments) => {
  const targetPath = path.join(repoRoot, ...segments);
  expect(fs.existsSync(targetPath)).toBe(true);
  return import(`${pathToFileURL(targetPath).href}?t=${Date.now()}`);
};

const preference = ({
  enabled = true,
  state = "active",
  pausedReason = null,
  pausedMatchId = null,
  pausedAt = null,
} = {}) => ({ enabled, state, pausedReason, pausedMatchId, pausedAt });

afterEach(() => {
  vi.resetModules();
});

describe("match alert preference routes", () => {
  it("requires an account and returns configuration plus preference", async () => {
    const { createMatchAlertsGetRoute } = await loadModule(
      "app",
      "api",
      "match-alerts",
      "handler.js"
    );
    const getSessionAccount = vi.fn();
    const getMatchAlertPreference = vi.fn().mockResolvedValue(preference());
    const GET = createMatchAlertsGetRoute({
      getSessionAccount,
      getMatchAlertPreference,
      getWebPushConfig: () => ({ configured: true, publicKey: "public-vapid" }),
    });

    expect((await GET(new Request("http://localhost/api/match-alerts"))).status).toBe(401);
    getSessionAccount.mockResolvedValue({ account: { id: "acct_1" } });

    const response = await GET(
      new Request("http://localhost/api/match-alerts", {
        headers: { cookie: "settlehex_session=a.b" },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      configured: true,
      vapidPublicKey: "public-vapid",
      preference: expect.objectContaining({ state: "active" }),
    });
    expect(getSessionAccount).toHaveBeenLastCalledWith({
      cookieHeader: "settlehex_session=a.b",
    });
    expect(getMatchAlertPreference).toHaveBeenCalledWith({ accountId: "acct_1" });
  });

  it("reports unconfigured VAPID settings without reading them at module import", async () => {
    const { getWebPushConfig } = await loadModule(
      "lib",
      "server",
      "matchAlerts",
      "webPushConfig.js"
    );

    expect(getWebPushConfig({ env: {} })).toEqual({
      configured: false,
      publicKey: "",
      privateKey: "",
      subject: "",
    });
    expect(
      getWebPushConfig({
        env: {
          VAPID_PUBLIC_KEY: " public ",
          VAPID_PRIVATE_KEY: " private ",
          VAPID_SUBJECT: " mailto:alerts@example.com ",
        },
      })
    ).toEqual({
      configured: true,
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:alerts@example.com",
    });
  });

  it.each(["resume", "enable"])(
    "rejects %s while the paused human match is active",
    async (action) => {
      const { createMatchAlertsPatchRoute } = await loadModule(
        "app",
        "api",
        "match-alerts",
        "handler.js"
      );
      const canResumePausedMatch = vi.fn().mockResolvedValue(false);
      const setMatchAlertEnabled = vi.fn();
      const PATCH = createMatchAlertsPatchRoute({
        getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_1" } }),
        getMatchAlertPreference: vi.fn().mockResolvedValue(
          preference({
            state: "paused",
            pausedReason: "human_game",
            pausedMatchId: "match_1",
            pausedAt: "2026-07-14T10:00:00Z",
          })
        ),
        canResumePausedMatch,
        setMatchAlertEnabled,
      });

      const response = await PATCH(
        new Request("http://localhost/api/match-alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "Match alerts stay paused until your human game ends.",
      });
      expect(canResumePausedMatch).toHaveBeenCalledWith({ matchID: "match_1" });
      expect(setMatchAlertEnabled).not.toHaveBeenCalled();
    }
  );

  it("enables after a paused match ends and disables without a resume check", async () => {
    const { createMatchAlertsPatchRoute } = await loadModule(
      "app",
      "api",
      "match-alerts",
      "handler.js"
    );
    const getMatchAlertPreference = vi.fn().mockResolvedValue(
      preference({
        state: "paused",
        pausedReason: "human_game",
        pausedMatchId: "match_1",
      })
    );
    const canResumePausedMatch = vi.fn().mockResolvedValue(true);
    const setMatchAlertEnabled = vi.fn(({ enabled }) =>
      Promise.resolve(preference({ enabled, state: enabled ? "active" : "off" }))
    );
    const PATCH = createMatchAlertsPatchRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_1" } }),
      getMatchAlertPreference,
      canResumePausedMatch,
      setMatchAlertEnabled,
    });

    const resumeResponse = await PATCH(
      new Request("http://localhost/api/match-alerts", {
        method: "PATCH",
        body: JSON.stringify({ action: "resume" }),
      })
    );
    const disableResponse = await PATCH(
      new Request("http://localhost/api/match-alerts", {
        method: "PATCH",
        body: JSON.stringify({ action: "disable" }),
      })
    );

    expect(resumeResponse.status).toBe(200);
    expect(await resumeResponse.json()).toEqual({
      preference: expect.objectContaining({ state: "active" }),
    });
    expect(disableResponse.status).toBe(200);
    expect(setMatchAlertEnabled).toHaveBeenNthCalledWith(1, {
      accountId: "acct_1",
      enabled: true,
    });
    expect(setMatchAlertEnabled).toHaveBeenNthCalledWith(2, {
      accountId: "acct_1",
      enabled: false,
    });
    expect(getMatchAlertPreference).toHaveBeenCalledTimes(1);
    expect(canResumePausedMatch).toHaveBeenCalledTimes(1);
  });

  it("requires an account and rejects invalid actions", async () => {
    const { createMatchAlertsPatchRoute } = await loadModule(
      "app",
      "api",
      "match-alerts",
      "handler.js"
    );
    const getSessionAccount = vi.fn();
    const setMatchAlertEnabled = vi.fn();
    const PATCH = createMatchAlertsPatchRoute({
      getSessionAccount,
      setMatchAlertEnabled,
    });
    const request = (action) =>
      new Request("http://localhost/api/match-alerts", {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });

    expect((await PATCH(request("enable"))).status).toBe(401);
    getSessionAccount.mockResolvedValue({ account: { id: "acct_1" } });
    const invalid = await PATCH(request("pause"));

    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "Invalid match-alert action." });
    expect(setMatchAlertEnabled).not.toHaveBeenCalled();
  });
});

describe("match alert subscription routes", () => {
  it("validates and upserts a subscription for the current account", async () => {
    const { createMatchAlertSubscriptionPostRoute } = await loadModule(
      "app",
      "api",
      "match-alerts",
      "subscriptions",
      "handler.js"
    );
    const upsert = vi.fn().mockResolvedValue({ endpoint: "https://push.example/sub" });
    const POST = createMatchAlertSubscriptionPostRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_1" } }),
      upsertMatchAlertSubscription: upsert,
    });
    const subscription = {
      endpoint: "https://push.example/sub",
      keys: { p256dh: "public-key", auth: "auth-secret" },
    };

    const response = await POST(
      new Request("http://localhost/api/match-alerts/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ subscription: { endpoint: subscription.endpoint } });
    expect(upsert).toHaveBeenCalledWith({ accountId: "acct_1", subscription });
  });

  it("requires an account before storing or deleting a subscription", async () => {
    const {
      createMatchAlertSubscriptionDeleteRoute,
      createMatchAlertSubscriptionPostRoute,
    } = await loadModule(
      "app",
      "api",
      "match-alerts",
      "subscriptions",
      "handler.js"
    );
    const getSessionAccount = vi.fn();
    const upsertMatchAlertSubscription = vi.fn();
    const deleteMatchAlertSubscription = vi.fn();
    const POST = createMatchAlertSubscriptionPostRoute({
      getSessionAccount,
      upsertMatchAlertSubscription,
    });
    const DELETE = createMatchAlertSubscriptionDeleteRoute({
      getSessionAccount,
      deleteMatchAlertSubscription,
    });

    const postResponse = await POST(
      new Request("http://localhost/api/match-alerts/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://push.example/sub",
          keys: { p256dh: "public-key", auth: "auth-secret" },
        }),
      })
    );
    const deleteResponse = await DELETE(
      new Request("http://localhost/api/match-alerts/subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: "https://push.example/sub" }),
      })
    );

    expect(postResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(upsertMatchAlertSubscription).not.toHaveBeenCalled();
    expect(deleteMatchAlertSubscription).not.toHaveBeenCalled();
  });

  it.each([
    ["missing endpoint", { keys: { p256dh: "public-key", auth: "auth-secret" } }],
    [
      "HTTP endpoint",
      {
        endpoint: "http://push.example/sub",
        keys: { p256dh: "public-key", auth: "auth-secret" },
      },
    ],
    [
      "invalid endpoint",
      {
        endpoint: "not-a-url",
        keys: { p256dh: "public-key", auth: "auth-secret" },
      },
    ],
    ["missing keys", { endpoint: "https://push.example/sub", keys: {} }],
    [
      "blank p256dh",
      {
        endpoint: "https://push.example/sub",
        keys: { p256dh: " ", auth: "auth-secret" },
      },
    ],
    [
      "blank auth",
      {
        endpoint: "https://push.example/sub",
        keys: { p256dh: "public-key", auth: " " },
      },
    ],
    [
      "oversized endpoint",
      {
        endpoint: `https://push.example/${"x".repeat(4097)}`,
        keys: { p256dh: "public-key", auth: "auth-secret" },
      },
    ],
    [
      "oversized p256dh",
      {
        endpoint: "https://push.example/sub",
        keys: { p256dh: "x".repeat(4097), auth: "auth-secret" },
      },
    ],
    [
      "oversized auth",
      {
        endpoint: "https://push.example/sub",
        keys: { p256dh: "public-key", auth: "x".repeat(4097) },
      },
    ],
  ])("rejects a subscription with %s", async (_label, body) => {
    const { createMatchAlertSubscriptionPostRoute } = await loadModule(
      "app",
      "api",
      "match-alerts",
      "subscriptions",
      "handler.js"
    );
    const upsertMatchAlertSubscription = vi.fn();
    const POST = createMatchAlertSubscriptionPostRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_1" } }),
      upsertMatchAlertSubscription,
    });

    const response = await POST(
      new Request("http://localhost/api/match-alerts/subscriptions", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(400);
    expect(upsertMatchAlertSubscription).not.toHaveBeenCalled();
  });

  it("deletes only the current account's endpoint and is idempotent", async () => {
    const { createMatchAlertSubscriptionDeleteRoute } = await loadModule(
      "app",
      "api",
      "match-alerts",
      "subscriptions",
      "handler.js"
    );
    const deleteMatchAlertSubscription = vi.fn().mockResolvedValue(false);
    const DELETE = createMatchAlertSubscriptionDeleteRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_1" } }),
      deleteMatchAlertSubscription,
    });

    const response = await DELETE(
      new Request("http://localhost/api/match-alerts/subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: "https://push.example/sub" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(deleteMatchAlertSubscription).toHaveBeenCalledWith({
      accountId: "acct_1",
      endpoint: "https://push.example/sub",
    });
  });
});

describe("match alert announcement route", () => {
  const loadHandler = () =>
    loadModule("app", "api", "match-alerts", "announce", "handler.js");
  const request = (body) =>
    new Request("http://localhost/api/match-alerts/announce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: "settlehex_session=a.b",
      },
      body: JSON.stringify(body),
    });

  it("requires an authenticated account before announcing", async () => {
    const { createMatchAlertAnnouncePostRoute } = await loadHandler();
    const getSessionAccount = vi.fn();
    const announceWaitingDuel = vi.fn();
    const POST = createMatchAlertAnnouncePostRoute({
      getSessionAccount,
      announceWaitingDuel,
    });

    const missingResponse = await POST(request({ matchID: "match_1" }));
    getSessionAccount.mockResolvedValue({ account: {} });
    const unidentifiedResponse = await POST(request({ matchID: "match_1" }));

    expect(missingResponse.status).toBe(401);
    expect(unidentifiedResponse.status).toBe(401);
    expect(announceWaitingDuel).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", {}],
    ["blank", { matchID: "   " }],
    ["non-string", { matchID: 123 }],
    ["oversized", { matchID: "x".repeat(257) }],
  ])("rejects a %s match ID", async (_label, body) => {
    const { createMatchAlertAnnouncePostRoute } = await loadHandler();
    const announceWaitingDuel = vi.fn();
    const POST = createMatchAlertAnnouncePostRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_session" } }),
      announceWaitingDuel,
    });

    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid match ID." });
    expect(announceWaitingDuel).not.toHaveBeenCalled();
  });

  it("trims the match ID and trusts only the session account", async () => {
    const { createMatchAlertAnnouncePostRoute } = await loadHandler();
    const announceWaitingDuel = vi.fn().mockResolvedValue({
      announced: true,
      reason: "announced",
      delivery: { attempted: 1, delivered: 1, expired: 0, failed: 0 },
    });
    const POST = createMatchAlertAnnouncePostRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_session" } }),
      announceWaitingDuel,
    });

    const response = await POST(
      request({ matchID: "  match_1  ", seekerAccountId: "acct_forged" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      announced: true,
      reason: "announced",
      delivery: { attempted: 1, delivered: 1, expired: 0, failed: 0 },
    });
    expect(announceWaitingDuel).toHaveBeenCalledWith({
      matchID: "match_1",
      seekerAccountId: "acct_session",
    });
  });

  it("applies the 256-character cap after trimming", async () => {
    const { createMatchAlertAnnouncePostRoute } = await loadHandler();
    const matchID = "x".repeat(256);
    const announceWaitingDuel = vi
      .fn()
      .mockResolvedValue({ announced: false, reason: "duplicate" });
    const POST = createMatchAlertAnnouncePostRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_session" } }),
      announceWaitingDuel,
    });

    const response = await POST(request({ matchID: `  ${matchID}  ` }));

    expect(response.status).toBe(200);
    expect(announceWaitingDuel).toHaveBeenCalledWith({
      matchID,
      seekerAccountId: "acct_session",
    });
  });

  it.each(["duplicate", "filled", "cancelled", "rate_limited_minute", "rate_limited_hour"])(
    "returns 200 for a harmless %s no-op",
    async (reason) => {
      const { createMatchAlertAnnouncePostRoute } = await loadHandler();
      const POST = createMatchAlertAnnouncePostRoute({
        getSessionAccount: vi
          .fn()
          .mockResolvedValue({ account: { id: "acct_session" } }),
        announceWaitingDuel: vi.fn().mockResolvedValue({
          announced: false,
          reason,
        }),
      });

      const response = await POST(request({ matchID: "match_1" }));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ announced: false, reason });
    }
  );

  it("uses one generic 404 for forged, non-owner, and private matches", async () => {
    const { createMatchAlertAnnouncePostRoute } = await loadHandler();
    const POST = createMatchAlertAnnouncePostRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_session" } }),
      announceWaitingDuel: vi
        .fn()
        .mockResolvedValue({ announced: false, reason: "not_eligible" }),
    });

    const response = await POST(request({ matchID: "match_private_or_forged" }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Match not found." });
  });

  it("maps unexpected delivery errors to 500", async () => {
    const { createMatchAlertAnnouncePostRoute } = await loadHandler();
    const POST = createMatchAlertAnnouncePostRoute({
      getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_session" } }),
      announceWaitingDuel: vi.fn().mockRejectedValue(new Error("push database failed")),
    });

    const response = await POST(request({ matchID: "match_1" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to announce match." });
  });
});
