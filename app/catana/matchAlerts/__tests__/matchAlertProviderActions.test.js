import { describe, expect, it, vi } from "vitest";

import {
  createLatestRefreshGuard,
  detachMatchAlertBrowser,
  loadMatchAlertSnapshot,
  requestMatchAnnouncement,
  runEnableTransaction,
  runPreferenceAction,
} from "../matchAlertProviderActions.js";

const response = ({ status = 200, body = {} } = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(body),
});

describe("latest refresh wins", () => {
  it("suppresses an older refresh that resolves after a newer request", () => {
    const guard = createLatestRefreshGuard();
    const committed = [];
    const older = guard.begin();
    const newer = guard.begin();

    expect(guard.commit(newer, () => committed.push("newer"))).toBe(true);
    expect(guard.commit(older, () => committed.push("older"))).toBe(false);
    expect(committed).toEqual(["newer"]);
  });
});

describe("loadMatchAlertSnapshot", () => {
  it("treats a 401 as normal signed-out state while still reading browser state", async () => {
    const subscription = { endpoint: "https://push.example/current" };
    const capability = {
      supported: true,
      permission: "granted",
      reason: null,
    };

    await expect(
      loadMatchAlertSnapshot({
        fetchImpl: vi.fn().mockResolvedValue(response({ status: 401 })),
        getCapability: vi.fn().mockReturnValue(capability),
        getSubscription: vi.fn().mockResolvedValue(subscription),
      })
    ).resolves.toEqual({
      signedIn: false,
      configured: false,
      vapidPublicKey: null,
      preference: {
        enabled: false,
        state: "off",
        pausedReason: null,
        pausedMatchId: null,
        pausedAt: null,
      },
      capability,
      permission: "granted",
      hasSubscription: true,
    });
  });
});

describe("runEnableTransaction", () => {
  it("requests permission, subscribes, saves the endpoint, enables, then refreshes", async () => {
    const order = [];
    const subscription = {
      endpoint: "https://push.example/new",
      keys: { p256dh: "key", auth: "secret" },
      toJSON: () => ({
        endpoint: "https://push.example/new",
        keys: { p256dh: "key", auth: "secret" },
      }),
    };
    const fetchImpl = vi.fn(async (url, options) => {
      order.push(`${options.method} ${url}`);
      return response();
    });
    const requestPermission = vi.fn(async () => {
      order.push("permission");
      return "granted";
    });
    const createSubscription = vi.fn(async () => {
      order.push("subscribe");
      return subscription;
    });
    const refresh = vi.fn(async () => {
      order.push("refresh");
    });

    await expect(
      runEnableTransaction({
        configured: true,
        publicKey: "vapid-public-key",
        getCapability: () => ({
          supported: true,
          permission: "default",
          reason: null,
        }),
        notificationLike: { requestPermission },
        createSubscription,
        fetchImpl,
        refresh,
      })
    ).resolves.toMatchObject({
      enabled: true,
      reason: "enabled",
      permission: "granted",
    });
    expect(order).toEqual([
      "permission",
      "subscribe",
      "POST /api/match-alerts/subscriptions",
      "PATCH /api/match-alerts",
      "refresh",
    ]);
    expect(createSubscription).toHaveBeenCalledWith({
      publicKey: "vapid-public-key",
    });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(
      subscription.toJSON()
    );
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      action: "enable",
    });
  });

  it("returns install guidance without requesting permission on iOS Safari", async () => {
    const requestPermission = vi.fn();
    const createSubscription = vi.fn();
    const fetchImpl = vi.fn();

    await expect(
      runEnableTransaction({
        configured: true,
        publicKey: "vapid-public-key",
        getCapability: () => ({
          supported: false,
          reason: "install_required",
        }),
        notificationLike: { requestPermission },
        createSubscription,
        fetchImpl,
        refresh: vi.fn(),
      })
    ).resolves.toMatchObject({
      enabled: false,
      reason: "install_required",
    });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(createSubscription).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("runPreferenceAction", () => {
  it("disables the account preference without deleting the browser subscription", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response());
    const refresh = vi.fn().mockResolvedValue(undefined);

    await expect(
      runPreferenceAction({ action: "disable", fetchImpl, refresh })
    ).resolves.toEqual({ updated: true, reason: "disable" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith("/api/match-alerts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "disable" }),
    });
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("detachMatchAlertBrowser", () => {
  it("deletes the authenticated endpoint before local unsubscribe", async () => {
    const order = [];
    const subscription = {
      endpoint: "https://push.example/current",
      unsubscribe: vi.fn(async () => {
        order.push("unsubscribe");
        return true;
      }),
    };
    const fetchImpl = vi.fn(async () => {
      order.push("delete");
      return response();
    });

    await expect(
      detachMatchAlertBrowser({
        getSubscription: vi.fn().mockResolvedValue(subscription),
        fetchImpl,
      })
    ).resolves.toMatchObject({
      detached: true,
      safeToSignOut: true,
      reason: "detached",
    });
    expect(order).toEqual(["delete", "unsubscribe"]);
  });

  it("does not unsubscribe when the authenticated DELETE fails", async () => {
    const unsubscribe = vi.fn();

    await expect(
      detachMatchAlertBrowser({
        getSubscription: vi.fn().mockResolvedValue({
          endpoint: "https://push.example/current",
          unsubscribe,
        }),
        fetchImpl: vi.fn().mockResolvedValue(
          response({
            status: 500,
            body: { error: "Database unavailable." },
          })
        ),
      })
    ).resolves.toMatchObject({
      detached: false,
      safeToSignOut: false,
      reason: "server_detach_failed",
    });
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("allows sign-out when only local unsubscribe fails after DELETE", async () => {
    await expect(
      detachMatchAlertBrowser({
        getSubscription: vi.fn().mockResolvedValue({
          endpoint: "https://push.example/current",
          unsubscribe: vi.fn().mockRejectedValue(new Error("Browser failure")),
        }),
        fetchImpl: vi.fn().mockResolvedValue(response()),
      })
    ).resolves.toMatchObject({
      detached: false,
      safeToSignOut: true,
      reason: "local_unsubscribe_failed",
    });
  });
});

describe("requestMatchAnnouncement", () => {
  it("returns a no-throw result for network errors", async () => {
    await expect(
      requestMatchAnnouncement({
        matchID: "match-1",
        fetchImpl: vi.fn().mockRejectedValue(new Error("offline")),
      })
    ).resolves.toEqual({ announced: false, reason: "request_failed" });
  });
});
