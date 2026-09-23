const STORAGE_KEY = "catana:game-start-transition";
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
    storage.setItem(STORAGE_KEY, JSON.stringify({ matchID, createdAt: now }));
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
    const raw = storage.getItem(STORAGE_KEY);
    storage.removeItem(STORAGE_KEY);
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
} = {}) {
  if (!consumeGameStartTransition({ storage, matchID, now })) return false;
  audio?.unlock?.();
  bus?.emit?.({ type: "cue", payload: { name: "game:start" } });
  return true;
}
