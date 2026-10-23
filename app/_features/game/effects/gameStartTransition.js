import { readBrowserStorage, writeBrowserStorage, removeBrowserStorage } from "../../../../lib/client/browserStorage.js";
const STORAGE_KEY = "settlehex:game-start-transition";
const MAX_AGE_MS = 60_000;

const browserStorage = () =>
  typeof window === "undefined" ? null : window.sessionStorage;

export function markGameStartTransition({
  storage = browserStorage(),
  matchID,
  now = Date.now(),
} = {}) {
  if (!storage || !matchID) return false;
  try {
    writeBrowserStorage(storage, STORAGE_KEY, JSON.stringify({ matchID, createdAt: now }));
    return true;
  } catch {
    return false;
  }
}

export function consumeGameStartTransition({
  storage = browserStorage(),
  matchID,
  now = Date.now(),
} = {}) {
  if (!storage || !matchID) return false;
  let transition = null;
  try {
    const raw = readBrowserStorage(storage, STORAGE_KEY);
    removeBrowserStorage(storage, STORAGE_KEY);
    transition = raw ? JSON.parse(raw) : null;
  } catch {
    return false;
  }

  return (
    transition?.matchID === matchID &&
    Number.isFinite(transition?.createdAt) &&
    now >= transition.createdAt &&
    now - transition.createdAt <= MAX_AGE_MS
  );
}

export function playGameStartTransition({
  storage = browserStorage(),
  matchID,
  now = Date.now(),
  audio,
  bus,
  onStart,
  onComplete,
} = {}) {
  if (!consumeGameStartTransition({ storage, matchID, now })) return false;
  audio?.unlock?.();
  onStart?.();
  bus?.emit?.({
    type: "cue",
    payload: { name: "game:start", ...(onComplete ? { onComplete } : {}) },
  });
  return true;
}
