export const createKnightDisplayOverride = (payload) => {
  if (!payload || payload.cardType !== "knight") return null;
  return {
    playerId: payload.playerId,
    knightsPlayed: payload.previousKnightsPlayed,
    largestArmyOwnerId: payload.previousLargestArmyOwnerId ?? null
  };
};

export const releaseKnightDisplayOverride = (payload) => {
  if (!payload || payload.cardType !== "knight") return null;
  return {
    playerId: payload.playerId,
    knightsPlayed: payload.nextKnightsPlayed,
    largestArmyOwnerId: payload.nextLargestArmyOwnerId ?? null
  };
};

export const upsertKnightDisplayOverride = (current, override) => {
  if (!override?.playerId) return current ?? {};
  return {
    ...(current ?? {}),
    [override.playerId]: override
  };
};

export const removeKnightDisplayOverride = (current, playerId) => {
  if (!current || playerId == null) return current ?? {};
  const next = { ...current };
  delete next[playerId];
  return next;
};
