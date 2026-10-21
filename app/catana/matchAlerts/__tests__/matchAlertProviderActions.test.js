import { describe, expect, it, vi } from "vitest";

import {
  createLatestRefreshGuard,
  detachMatchAlertBrowser,
  getSignedOutMatchAlertState,
  loadMatchAlertSnapshot,
  requestMatchAnnouncement,
  runEnableTransaction,
  runPreferenceAction,
} from "../matchAlertProviderActions.js";
import * as matchAlertActions from "../matchAlertProviderActions.js";

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

describe("match-alert prompt routing", () => {
  it("consumes a deep link without dropping unrelated query or hash state", () => {
    const replace = vi.fn();
    const openMatchAlert = vi.fn();

    const consumed = matchAlertActions.consumeMatchAlertDeepLink?.({
      href: "https://settlehex.com/g/current?matchAlert=duel_1&panel=chat#turn",
      replace,
      openMatchAlert,
    });

    expect(consumed).toEqual({
      consumed: true,
      matchID: "duel_1",
      nextHref: "/g/current?panel=chat#turn",
    });
    expect(replace).toHaveBeenCalledWith("/g/current?panel=chat#turn");
    expect(openMatchAlert).toHaveBeenCalledWith("duel_1");
  });

  it("routes worker receipt to attention and worker click to the prompt", () => {
    const requestAttention = vi.fn();
    const openMatchAlert = vi.fn();

    expect(
      matchAlertActions.routeMatchAlertWorkerMessage?.({
        data: { type: "match-alert-received", matchID: "duel_1" },
        requestAttention,
        openMatchAlert,
      })
    ).toEqual({ handled: true, action: "attention" });
    expect(requestAttention).toHaveBeenCalledWith("player-looking");
    expect(openMatchAlert).not.toHaveBeenCalled();

    expect(
      matchAlertActions.routeMatchAlertWorkerMessage?.({
        data: { type: "match-alert-click", matchID: "duel_1" },
        requestAttention,
        openMatchAlert,
      })
    ).toEqual({
      handled: true,
      action: "open",
      matchID: "duel_1",
    });
    expect(openMatchAlert).toHaveBeenCalledWith("duel_1");
  });

  it("keeps the current prompt unchanged while a confirmed join is pending", async () => {
    const setAlert = vi.fn();
    const resolveAlertMatch = vi.fn().mockResolvedValue({
      status: "open",
      match: { matchID: "duel_2" },
      seekerName: "HarbourFox",
    });
    const controller =
      matchAlertActions.createMatchAlertPromptController?.({
        resolveAlertMatch,
        setAlert,
      });

    controller?.setJoinPending(true);
    await expect(controller?.open("duel_2")).resolves.toBe(false);
    expect(resolveAlertMatch).not.toHaveBeenCalled();
    expect(setAlert).not.toHaveBeenCalled();
  });

  it("ignores an older prompt resolution after a newer alert opens", async () => {
    const setAlert = vi.fn();
    let resolveFirst;
    const resolveAlertMatch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({
        status: "open",
        match: { matchID: "duel_2" },
        seekerName: "NewPlayer",
      });
    const controller =
      matchAlertActions.createMatchAlertPromptController?.({
        resolveAlertMatch,
        setAlert,
      });

    const first = controller?.open("duel_1");
    await expect(controller?.open("duel_2")).resolves.toBe(true);
    resolveFirst({
      status: "open",
      match: { matchID: "duel_1" },
      seekerName: "OldPlayer",
    });
    await expect(first).resolves.toBe(false);

    expect(setAlert).toHaveBeenLastCalledWith({
      status: "open",
      match: { matchID: "duel_2" },
      seekerName: "NewPlayer",
      matchID: "duel_2",
    });
  });
});

describe("current-game registration", () => {
  it("registers only a live credentialed player game and returns no credentials", () => {
    const buildRegistration =
      matchAlertActions.getCurrentMatchAlertGameRegistration;
    const base = {
      isReplay: false,
      isGameOver: false,
      credentials: "secret",
      playerID: "0",
      matchID: "human_1",
      opponentType: "human",
    };

    expect(buildRegistration?.(base)).toEqual({
      matchID: "human_1",
      opponentType: "human",
    });
    expect(buildRegistration?.({ ...base, opponentType: "bot" })).toEqual({
      matchID: "human_1",
      opponentType: "bot",
    });
    expect(buildRegistration?.({ ...base, isReplay: true })).toBeNull();
    expect(buildRegistration?.({ ...base, isGameOver: true })).toBeNull();
    expect(buildRegistration?.({ ...base, credentials: "" })).toBeNull();
    expect(buildRegistration?.({ ...base, playerID: null })).toBeNull();
    expect(buildRegistration?.({ ...base, matchID: "dev-sandbox" })).toBeNull();
  });

  it("refreshes authoritative alert state when a human game is registered", async () => {
    expect(matchAlertActions.registerCurrentMatchAlertGame).toBeTypeOf("function");
    let currentGame = null;
    const setCurrentGame = (next) => {
      currentGame = typeof next === "function" ? next(currentGame) : next;
    };
    const refresh = vi.fn().mockResolvedValue(undefined);

    const unregister = matchAlertActions.registerCurrentMatchAlertGame({
      game: { matchID: "human_1", opponentType: "human" },
      setCurrentGame,
      refresh,
    });

    expect(currentGame).toEqual({ matchID: "human_1", opponentType: "human" });
    expect(refresh).toHaveBeenCalledOnce();
    unregister();
    expect(currentGame).toBeNull();
  });

  it("does not refresh or pause alerts for a Puffer game registration", () => {
    expect(matchAlertActions.registerCurrentMatchAlertGame).toBeTypeOf("function");
    const setCurrentGame = vi.fn();
    const refresh = vi.fn();

    matchAlertActions.registerCurrentMatchAlertGame({
      game: { matchID: "bot_1", opponentType: "bot" },
      setCurrentGame,
      refresh,
    });

    expect(setCurrentGame).toHaveBeenCalledWith({
      matchID: "bot_1",
      opponentType: "bot",
    });
    expect(refresh).not.toHaveBeenCalled();
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

describe("getSignedOutMatchAlertState", () => {
  it("clears account state after a complete browser detach", () => {
    expect(
      getSignedOutMatchAlertState({ reason: "detached" })
    ).toEqual({
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
      hasSubscription: false,
    });
  });

  it("retains only the unaffiliated local subscription after unsubscribe failure", () => {
    expect(
      getSignedOutMatchAlertState({ reason: "local_unsubscribe_failed" })
    ).toMatchObject({
      signedIn: false,
      preference: { state: "off" },
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
