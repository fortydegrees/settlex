// One migration per storage area. Afterward, old-tab writes cannot restore logout
// or released credentials. Native Storage events still carry canonical keys.
const MIGRATED = "settlehex:storage-migration-v1";
const PREFIX = "settlehex:";
const legacyKey = key => key.replace(/^settlehex:/, "catana:");
const knownKeys = ["lobby:playerName", "lobby:playerEmoji", "lobby:playerColor",
  "last-active-match", "lobby:pending-friend-challenge", "themeId", "audioMuted",
  "left-meta-rail:desktop", "game-start-transition"].map(key => PREFIX + key);

function migrate(storage, key, force = false) {
  if (!storage?.getItem || storage.getItem(MIGRATED) === "1") return;
  const keys = new Set([...knownKeys, key]);
  for (let i = 0; i < (storage.length ?? 0); i += 1) {
    const old = storage.key?.(i);
    if (old?.startsWith("catana:")) keys.add(PREFIX + old.slice(7));
  }
  const retained = [...keys].filter(key => storage.getItem(legacyKey(key)) != null);
  if (!force && retained.length === 0) return;
  // Never delete the only copy if quota/private-mode writes fail.
  for (const current of retained) {
    const old = legacyKey(current);
    if (storage.getItem(current) === null) storage.setItem(current, storage.getItem(old));
    storage.removeItem(old);
  }
  storage.setItem(MIGRATED, "1");
}

export function readBrowserStorage(storage, key) {
  if (!storage?.getItem) return null;
  try { migrate(storage, key); } catch { /* use retained data when migration cannot persist */ }
  const value = storage.getItem(key);
  if (value !== null || storage.getItem(MIGRATED) === "1") return value;
  return storage.getItem(legacyKey(key));
}

export function writeBrowserStorage(storage, key, value) {
  if (!storage?.setItem) return;
  try { migrate(storage, key, true); } catch { /* still attempt the requested operation */ }
  storage.setItem(key, value);
  storage.removeItem?.(legacyKey(key));
}

export function removeBrowserStorage(storage, key) {
  if (!storage?.removeItem) return;
  try { migrate(storage, key, true); } catch { /* still attempt the requested operation */ }
  storage.removeItem(key);
  storage.removeItem(legacyKey(key));
}
