// Canonical logs retain the outcome, but only the thief and victim receive
// the stolen resource in their player-facing log (including replay views).
export const maskGameLogEntries = (entries, playerID) => {
  if (!Array.isArray(entries)) return entries;
  let changed = false;
  const viewerId = playerID == null ? null : String(playerID);
  const masked = entries.map((entry) => {
    if (entry?.type !== "robber:steal" || entry.data?.resource == null) return entry;
    if (viewerId != null && (
      viewerId === String(entry.actorId) || viewerId === String(entry.data.victimId)
    )) return entry;

    changed = true;
    const data = { ...entry.data };
    delete data.resource;
    return { ...entry, data };
  });
  return changed ? masked : entries;
};
