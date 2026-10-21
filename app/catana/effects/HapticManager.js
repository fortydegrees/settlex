import { isDocumentHidden } from "../utils/visibility";
import { DEFAULT_HAPTIC_THEME } from "./hapticThemes";

const DEFAULT_MIN_INTERVAL_MS = 80;

const defaultEnvironment = {
  getNavigator: () =>
    typeof navigator === "undefined" ? null : navigator,
  getWindow: () =>
    typeof window === "undefined" ? null : window,
  isHidden: () => isDocumentHidden(),
  now: () => Date.now()
};

const normalizePattern = (pattern) => {
  const values = Array.isArray(pattern) ? pattern : [pattern];
  const normalized = values
    .map((value) => Math.max(0, Math.round(Number(value) || 0)))
    .filter((value, index) => value > 0 || index > 0);

  if (normalized.every((value) => value === 0)) return null;
  return Array.isArray(pattern) ? normalized : normalized[0] ?? null;
};

const matchesMedia = (win, query) => {
  if (!win || typeof win.matchMedia !== "function") return false;
  return Boolean(win.matchMedia(query).matches);
};

const getIOSHapticBridge = (win) => {
  const bridge = win?.webkit?.messageHandlers?.haptic;
  return typeof bridge?.postMessage === "function" ? bridge : null;
};

const hasTouchLikePointer = (nav, win) =>
  matchesMedia(win, "(pointer: coarse)") || Number(nav?.maxTouchPoints ?? 0) > 0;

const isSupported = (nav, win) =>
  typeof nav?.vibrate === "function" || Boolean(getIOSHapticBridge(win));

const getPlanDelayMs = (entry, plan) => {
  const baseDelayMs = Number.isFinite(entry.delayMs) ? entry.delayMs : 0;
  if (!plan || !entry.planDelay) return Math.max(0, baseDelayMs);

  if (entry.planDelay === "firstLayer") {
    const layerDelays = (plan.layers ?? [])
      .map((layer) => layer.delayMs)
      .filter((delayMs) => Number.isFinite(delayMs));
    if (!layerDelays.length) return Math.max(0, baseDelayMs);
    return Math.max(0, baseDelayMs + (plan.mainStartMs ?? 0) + Math.min(...layerDelays));
  }

  if (entry.planDelay === "mainStart") {
    return Math.max(0, baseDelayMs + (plan.mainStartMs ?? 0));
  }

  return Math.max(0, baseDelayMs);
};

const postIOSHaptic = (bridge, entry) => {
  bridge.postMessage(
    entry.ios ?? {
      type: "impact",
      style: entry.iosStyle ?? "light"
    }
  );
};

export function createHapticManager({
  bus,
  theme = DEFAULT_HAPTIC_THEME,
  settings = {},
  environment = defaultEnvironment
} = {}) {
  const pendingTimeouts = new Set();
  const lastPlayByName = new Map();
  let unlocked = false;
  let destroyed = false;
  let lastPlay = null;

  const canPlay = (entry) => {
    if (settings.enabled === false) return false;
    if (!unlocked) return false;
    if (destroyed) return false;
    if (environment.isHidden?.() && !entry.allowWhenHidden) return false;

    const nav = environment.getNavigator?.();
    const win = environment.getWindow?.();
    if (matchesMedia(win, "(prefers-reduced-motion: reduce)")) return false;
    if (settings.mobileOnly !== false && !hasTouchLikePointer(nav, win)) return false;
    return isSupported(nav, win);
  };

  const runPattern = (entry) => {
    const pattern = normalizePattern(entry.pattern);
    if (pattern == null) return false;

    const nav = environment.getNavigator?.();
    if (typeof nav?.vibrate === "function") {
      nav.vibrate(pattern);
      return true;
    }

    const bridge = getIOSHapticBridge(environment.getWindow?.());
    if (bridge) {
      postIOSHaptic(bridge, entry);
      return true;
    }

    return false;
  };

  const playNow = (name, entry) => {
    if (!canPlay(entry)) return;

    const now = environment.now?.() ?? Date.now();
    const minIntervalMs = entry.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
    const lastAt = lastPlayByName.get(name) ?? Number.NEGATIVE_INFINITY;
    if (now - lastAt < minIntervalMs) return;

    if (runPattern(entry)) {
      lastPlayByName.set(name, now);
      lastPlay = name;
    }
  };

  const play = (name, plan = null) => {
    const entry = theme[name];
    if (!entry) return;

    const delayMs = getPlanDelayMs(entry, plan);
    if (delayMs > 0) {
      const timeoutId = setTimeout(() => {
        pendingTimeouts.delete(timeoutId);
        playNow(name, entry);
      }, delayMs);
      pendingTimeouts.add(timeoutId);
      return;
    }

    playNow(name, entry);
  };

  const cueUnsubscribe = bus?.on("cue", (event) => {
    const cueName = event.payload?.name;
    if (cueName) play(cueName, event.payload?.plan);
  });

  const hapticUnsubscribe = bus?.on("haptic", (event) => {
    const name =
      typeof event.payload === "string" ? event.payload : event.payload?.name;
    if (name) play(name, event.payload?.plan);
  });

  return {
    unlock: () => {
      unlocked = true;
    },
    destroy: () => {
      destroyed = true;
      pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingTimeouts.clear();
      cueUnsubscribe?.();
      hapticUnsubscribe?.();
    },
    _debugLastPlay: () => lastPlay
  };
}
