// One migration per storage area. Afterward, old-tab writes cannot restore logout
// or released credentials. Native Storage events still carry canonical keys.
const MIGRATED = "settlehex:storage-migration-v1";
const PREFIX = "settlehex:";
const importKey = key => `${PREFIX}storage-imported:${key.slice(PREFIX.length)}`;
const deletionKey = key => `${PREFIX}storage-deleted:${key.slice(PREFIX.length)}`;
const isDeleted = (storage, key) => storage.getItem(deletionKey(key)) === "1";
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
    // Snapshot the old value before checking the destination. Another tab may
    // migrate and remove the source between these calls; never write null.
    const value = storage.getItem(old);
    // Imports have their own slot: a migration copy can never overwrite a
    // canonical write by another tab, even if that write occurs mid-copy.
    if (value !== null && storage.getItem(current) === null && storage.getItem(importKey(current)) === null && !isDeleted(storage, current)) {
      storage.setItem(importKey(current), value);
    }
    storage.removeItem(old);
  }
  storage.setItem(MIGRATED, "1");
}

export function readBrowserStorage(storage, key) {
  if (!storage?.getItem) return null;
  try { migrate(storage, key); } catch { /* use retained data when migration cannot persist */ }
  // A deletion barrier wins even over a migration copy already in flight in
  // another tab, and does not depend on migrating unrelated preferences.
  if (isDeleted(storage, key)) return null;
  const value = storage.getItem(key);
  if (value !== null) return value;
  const imported = storage.getItem(importKey(key));
  if (imported !== null || storage.getItem(MIGRATED) === "1") return imported;
  return storage.getItem(legacyKey(key));
}

export function writeBrowserStorage(storage, key, value) {
  if (!storage?.setItem) return;
  try { migrate(storage, key, true); } catch { /* still attempt the requested operation */ }
  storage.setItem(key, value);
  storage.removeItem?.(legacyKey(key));
  storage.removeItem?.(importKey(key));
  storage.removeItem?.(deletionKey(key));
}

export function removeBrowserStorage(storage, key) {
  if (!storage?.removeItem) return;
  try { migrate(storage, key, true); } catch { /* still attempt the requested operation */ }
  storage.removeItem(key);
  storage.removeItem(legacyKey(key));
  storage.removeItem(importKey(key));
  // Remove the payload first to free quota for the small persistent barrier.
  storage.setItem(deletionKey(key), "1");
}
