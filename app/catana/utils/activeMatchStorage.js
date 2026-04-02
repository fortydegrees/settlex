export const ACTIVE_MATCH_STORAGE_KEY = "catana:last-active-match";

export const getCredentialsStorageKey = ({ matchID, playerID }) =>
  `catana:lobby:credentials:${matchID}:${playerID}`;

const getDefaultStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

const normalizeRecord = (value) => {
  if (!value || typeof value !== "object") return null;
  if (!value.matchID || value.playerID == null) return null;

  const savedAtMs = Number(value.savedAtMs);

  return {
    matchID: String(value.matchID),
    playerID: String(value.playerID),
    playerName:
      typeof value.playerName === "string" && value.playerName
        ? value.playerName
        : undefined,
    savedAtMs: Number.isFinite(savedAtMs) ? savedAtMs : Date.now()
  };
};

export function readLastActiveMatch(storage = getDefaultStorage()) {
  try {
    const raw = storage?.getItem?.(ACTIVE_MATCH_STORAGE_KEY);
    if (!raw) return null;
    return normalizeRecord(JSON.parse(raw));
  } catch (err) {
    return null;
  }
}

export function writeLastActiveMatch(storage = getDefaultStorage(), record) {
  const normalized = normalizeRecord(record);
  if (!normalized) return;

  try {
    storage?.setItem?.(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    // ignore storage failures
  }
}

export function clearLastActiveMatch(storage = getDefaultStorage()) {
  try {
    storage?.removeItem?.(ACTIVE_MATCH_STORAGE_KEY);
  } catch (err) {
    // ignore storage failures
  }
}
