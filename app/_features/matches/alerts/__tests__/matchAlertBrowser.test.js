import { describe, expect, it, vi } from "vitest";

import {
  createPushSubscription,
  getCurrentPushSubscription,
  getMatchAlertCapability,
  getMatchAlertRegistration,
  removeCurrentPushSubscription,
  urlBase64ToUint8Array,
} from "../matchAlertBrowser.js";

const supportedBrowser = (permission) => ({
  windowLike: {
    Notification: { permission },
    PushManager: class PushManager {},
  },
  navigatorLike: { serviceWorker: {} },
});

describe("getMatchAlertCapability", () => {
  it("reports unsupported browsers without touching a DOM", () => {
    expect(getMatchAlertCapability({ windowLike: {} })).toEqual({
      supported: false,
      reason: "unsupported",
    });
  });

  it.each([
    ["default", null],
    ["granted", null],
    ["denied", "blocked"],
  ])("maps %s notification permission", (permission, reason) => {
    expect(getMatchAlertCapability(supportedBrowser(permission))).toEqual({
      supported: true,
      permission,
      reason,
    });
  });

  it("requires iPhone and iPad Safari to be installed on the Home Screen", () => {
    const windowLike = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    };
    const navigatorLike = {
      serviceWorker: {},
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
    };

    expect(getMatchAlertCapability({ windowLike, navigatorLike })).toEqual({
      supported: false,
      reason: "install_required",
    });
    expect(windowLike.matchMedia).toHaveBeenCalledWith(
      "(display-mode: standalone)"
    );
  });

  it("recognizes standalone iPadOS Safari as a supported browser", () => {
    expect(
      getMatchAlertCapability({
        windowLike: {
          Notification: { permission: "default" },
          PushManager: class PushManager {},
          matchMedia: vi.fn().mockReturnValue({ matches: true }),
        },
        navigatorLike: {
          serviceWorker: {},
          platform: "MacIntel",
          maxTouchPoints: 5,
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15",
        },
      })
    ).toEqual({ supported: true, permission: "default", reason: null });
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes URL-safe unpadded VAPID keys", () => {
    expect(Array.from(urlBase64ToUint8Array("-_8AEA"))).toEqual([
      251, 255, 0, 16,
    ]);
  });
});

describe("service-worker subscription helpers", () => {
  it("registers the root worker and waits for the ready registration", async () => {
    const readyRegistration = { pushManager: {} };
    const register = vi.fn().mockResolvedValue({ installing: true });
    const navigatorLike = {
      serviceWorker: {
        register,
        ready: Promise.resolve(readyRegistration),
      },
    };

    await expect(
      getMatchAlertRegistration({ navigatorLike })
    ).resolves.toBe(readyRegistration);
    expect(register).toHaveBeenCalledWith("/match-alerts-sw.js", {
      scope: "/",
    });
  });

  it("reads the current PushSubscription", async () => {
    const subscription = { endpoint: "https://push.example/subscription" };
    const getSubscription = vi.fn().mockResolvedValue(subscription);
    const registration = { pushManager: { getSubscription } };
    const navigatorLike = {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    };

    await expect(
      getCurrentPushSubscription({ navigatorLike })
    ).resolves.toBe(subscription);
    expect(getSubscription).toHaveBeenCalledOnce();
  });

  it("reuses an existing PushSubscription", async () => {
    const subscription = { endpoint: "https://push.example/existing" };
    const subscribe = vi.fn();
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
        subscribe,
      },
    };
    const navigatorLike = {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    };

    await expect(
      createPushSubscription({ publicKey: "-_8AEA", navigatorLike })
    ).resolves.toBe(subscription);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("subscribes with userVisibleOnly and the decoded VAPID key", async () => {
    const subscription = { endpoint: "https://push.example/new" };
    const subscribe = vi.fn().mockResolvedValue(subscription);
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe,
      },
    };
    const navigatorLike = {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    };

    await expect(
      createPushSubscription({ publicKey: "-_8AEA", navigatorLike })
    ).resolves.toBe(subscription);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([251, 255, 0, 16]),
    });
  });

  it("unsubscribes the current browser without changing server state", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue({ unsubscribe }),
      },
    };
    const navigatorLike = {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    };

    await expect(
      removeCurrentPushSubscription({ navigatorLike })
    ).resolves.toBe(true);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
