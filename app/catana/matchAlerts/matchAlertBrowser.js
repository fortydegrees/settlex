const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/;
const SAFARI_PATTERN = /Safari/i;
const NON_SAFARI_IOS_PATTERN = /CriOS|FxiOS|EdgiOS|OPiOS/i;

const isIpadOs = (navigatorLike) =>
  navigatorLike?.platform === "MacIntel" && navigatorLike?.maxTouchPoints > 1;

const isIosSafari = (navigatorLike) => {
  const userAgent = navigatorLike?.userAgent ?? "";
  const isIosDevice = IOS_DEVICE_PATTERN.test(userAgent) || isIpadOs(navigatorLike);
  return (
    isIosDevice &&
    SAFARI_PATTERN.test(userAgent) &&
    !NON_SAFARI_IOS_PATTERN.test(userAgent)
  );
};

const isStandalone = (windowLike, navigatorLike) =>
  navigatorLike?.standalone === true ||
  windowLike?.matchMedia?.("(display-mode: standalone)")?.matches === true;

export function getMatchAlertCapability({
  windowLike = globalThis.window,
  navigatorLike = globalThis.navigator,
} = {}) {
  if (isIosSafari(navigatorLike) && !isStandalone(windowLike, navigatorLike)) {
    return { supported: false, reason: "install_required" };
  }

  if (
    !windowLike?.Notification ||
    !windowLike?.PushManager ||
    !navigatorLike?.serviceWorker
  ) {
    return { supported: false, reason: "unsupported" };
  }

  const permission = windowLike.Notification.permission;
  return {
    supported: true,
    permission,
    reason: permission === "denied" ? "blocked" : null,
  };
}

export function urlBase64ToUint8Array(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("A VAPID public key is required.");
  }

  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = globalThis.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export async function getMatchAlertRegistration({
  navigatorLike = globalThis.navigator,
} = {}) {
  const serviceWorker = navigatorLike?.serviceWorker;
  if (typeof serviceWorker?.register !== "function") {
    throw new Error("Service workers are not available in this browser.");
  }

  const registered = await serviceWorker.register("/match-alerts-sw.js", {
    scope: "/",
  });
  const ready = await serviceWorker.ready;
  return ready ?? registered;
}

export async function getCurrentPushSubscription({
  navigatorLike = globalThis.navigator,
} = {}) {
  const registration = await getMatchAlertRegistration({ navigatorLike });
  if (typeof registration?.pushManager?.getSubscription !== "function") {
    throw new Error("Push subscriptions are not available in this browser.");
  }
  return registration.pushManager.getSubscription();
}

export async function createPushSubscription({
  publicKey,
  navigatorLike = globalThis.navigator,
} = {}) {
  const registration = await getMatchAlertRegistration({ navigatorLike });
  const pushManager = registration?.pushManager;
  if (
    typeof pushManager?.getSubscription !== "function" ||
    typeof pushManager?.subscribe !== "function"
  ) {
    throw new Error("Push subscriptions are not available in this browser.");
  }

  const current = await pushManager.getSubscription();
  if (current) return current;

  return pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export async function removeCurrentPushSubscription({
  navigatorLike = globalThis.navigator,
} = {}) {
  const subscription = await getCurrentPushSubscription({ navigatorLike });
  if (!subscription) return false;
  return subscription.unsubscribe();
}
