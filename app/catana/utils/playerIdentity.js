const BOT_NAME_PREFIX_RE = /^\s*\[bot\]\s*/i;

export function sanitizeDisplayName(name) {
  if (typeof name !== "string") return "";
  return name.replace(BOT_NAME_PREFIX_RE, "").trim();
}

const asPlayerId = (value) => {
  if (value == null) return null;
  return String(value);
};

const mergePlayerRecord = (primary = {}, fallback = {}) => {
  const mergedData = {
    ...(fallback?.data ?? {}),
    ...(primary?.data ?? {}),
  };

  return {
    ...fallback,
    ...primary,
    ...(Object.keys(mergedData).length > 0 ? { data: mergedData } : {}),
  };
};

export function mergePlayerMetadata(primaryPlayers = [], fallbackPlayers = []) {
  const mergedById = new Map();

  fallbackPlayers.forEach((player) => {
    const playerId = asPlayerId(player?.id);
    if (playerId == null) return;
    mergedById.set(playerId, mergePlayerRecord({}, player));
  });

  primaryPlayers.forEach((player) => {
    const playerId = asPlayerId(player?.id);
    if (playerId == null) return;
    const existing = mergedById.get(playerId) ?? {};
    mergedById.set(playerId, mergePlayerRecord(player, existing));
  });

  return [...mergedById.values()];
}
