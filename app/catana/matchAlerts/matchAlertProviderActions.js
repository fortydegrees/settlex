import {
  createPushSubscription,
  getCurrentPushSubscription,
  getMatchAlertCapability,
} from "./matchAlertBrowser.js";

const offPreference = () => ({
  enabled: false,
  state: "off",
  pausedReason: null,
  pausedMatchId: null,
  pausedAt: null,
});

const responseError = async (response, fallback) => {
  try {
    const payload = await response.json();
    return new Error(payload?.error ?? fallback);
  } catch {
    return new Error(fallback);
  }
};

const serializeSubscription = (subscription) =>
  typeof subscription?.toJSON === "function"
    ? subscription.toJSON()
    : subscription;

export function createLatestRefreshGuard() {
  let latestRequest = 0;
  return {
    begin() {
      latestRequest += 1;
      return latestRequest;
    },
    isCurrent(request) {
      return request === latestRequest;
    },
    commit(request, callback) {
      if (request !== latestRequest) return false;
      callback();
      return true;
    },
  };
}

export function registerCurrentMatchAlertGame({
  game,
  setCurrentGame,
  refresh,
} = {}) {
  if (!game?.matchID) return () => {};
  const registered = {
    matchID: String(game.matchID),
    opponentType: game.opponentType === "bot" ? "bot" : "human",
  };
  setCurrentGame?.(registered);
  if (registered.opponentType === "human") {
    void Promise.resolve(refresh?.()).catch(() => {});
  }
  return () => {
    setCurrentGame?.((current) =>
      current?.matchID === registered.matchID ? null : current
    );
  };
}

export function getSignedOutMatchAlertState(detachResult = {}) {
  return {
    signedIn: false,
    configured: false,
    vapidPublicKey: null,
    preference: offPreference(),
    hasSubscription: detachResult.reason === "local_unsubscribe_failed",
  };
}

export async function loadMatchAlertSnapshot({
  fetchImpl = globalThis.fetch,
  getCapability = getMatchAlertCapability,
  getSubscription = getCurrentPushSubscription,
} = {}) {
  const capability = getCapability();
  let hasSubscription = false;
  if (capability.supported) {
    try {
      hasSubscription = Boolean(await getSubscription());
    } catch {
      hasSubscription = false;
    }
  }

  const browserState = {
    capability,
    permission: capability.permission ?? null,
    hasSubscription,
  };
  const response = await fetchImpl("/api/match-alerts", { cache: "no-store" });
  if (response.status === 401) {
    return {
      signedIn: false,
      configured: false,
      vapidPublicKey: null,
      preference: offPreference(),
      ...browserState,
    };
  }
  if (!response.ok) {
    throw await responseError(response, "Failed to load match alerts.");
  }

  const payload = await response.json();
  return {
    signedIn: true,
    configured: Boolean(payload?.configured),
    vapidPublicKey: payload?.vapidPublicKey ?? null,
    preference: payload?.preference ?? offPreference(),
    ...browserState,
  };
}

export async function runEnableTransaction({
  configured,
  publicKey,
  getCapability = getMatchAlertCapability,
  notificationLike = globalThis.window?.Notification,
  createSubscription = createPushSubscription,
  fetchImpl = globalThis.fetch,
  refresh,
  onCapability = () => {},
} = {}) {
  let capability = getCapability();
  onCapability(capability);

  if (!configured || !publicKey) {
    return { enabled: false, reason: "unconfigured", capability };
  }
  if (capability.reason === "install_required") {
    return { enabled: false, reason: "install_required", capability };
  }
  if (!capability.supported) {
    return { enabled: false, reason: "unsupported", capability };
  }

  let permission = capability.permission;
  if (permission === "default") {
    permission = await notificationLike.requestPermission();
  }
  capability = {
    supported: true,
    permission,
    reason: permission === "denied" ? "blocked" : null,
  };
  onCapability(capability);

  if (permission !== "granted") {
    return {
      enabled: false,
      reason: permission === "denied" ? "blocked" : "permission_required",
      permission,
      capability,
    };
  }

  const subscription = await createSubscription({ publicKey });
  const subscriptionResponse = await fetchImpl(
    "/api/match-alerts/subscriptions",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(serializeSubscription(subscription)),
    }
  );
  if (!subscriptionResponse.ok) {
    throw await responseError(
      subscriptionResponse,
      "Failed to save this browser subscription."
    );
  }

  const preferenceResponse = await fetchImpl("/api/match-alerts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "enable" }),
  });
  if (!preferenceResponse.ok) {
    throw await responseError(
      preferenceResponse,
      "Failed to enable match alerts."
    );
  }

  await refresh();
  return { enabled: true, reason: "enabled", permission, capability };
}

export async function runPreferenceAction({
  action,
  fetchImpl = globalThis.fetch,
  refresh,
} = {}) {
  const response = await fetchImpl("/api/match-alerts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    throw await responseError(response, "Failed to update match alerts.");
  }
  await refresh();
  return { updated: true, reason: action };
}

export async function detachMatchAlertBrowser({
  getSubscription = getCurrentPushSubscription,
  fetchImpl = globalThis.fetch,
} = {}) {
  let subscription;
  try {
    subscription = await getSubscription();
  } catch (error) {
    return {
      detached: false,
      safeToSignOut: false,
      reason: "server_detach_failed",
      error,
    };
  }

  if (!subscription) {
    return { detached: true, safeToSignOut: true, reason: "not_subscribed" };
  }

  try {
    const response = await fetchImpl("/api/match-alerts/subscriptions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) {
      throw await responseError(
        response,
        "Failed to detach this browser from your account."
      );
    }
  } catch (error) {
    return {
      detached: false,
      safeToSignOut: false,
      reason: "server_detach_failed",
      error,
    };
  }

  try {
    const unsubscribed = await subscription.unsubscribe();
    if (!unsubscribed) throw new Error("The browser kept its subscription.");
  } catch (error) {
    return {
      detached: false,
      safeToSignOut: true,
      reason: "local_unsubscribe_failed",
      error,
    };
  }

  return { detached: true, safeToSignOut: true, reason: "detached" };
}

export async function requestMatchAnnouncement({
  matchID,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof matchID !== "string" || matchID.trim().length === 0) {
    return { announced: false, reason: "invalid_match" };
  }

  try {
    const response = await fetchImpl("/api/match-alerts/announce", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchID: matchID.trim() }),
    });
    if (!response.ok) {
      return { announced: false, reason: "request_failed" };
    }
    const payload = await response.json();
    return {
      announced: Boolean(payload?.announced),
      reason: payload?.reason ?? "unknown",
    };
  } catch {
    return { announced: false, reason: "request_failed" };
  }
}
