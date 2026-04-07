const toFiniteId = (entryId) => {
  const number = Number(entryId);
  return Number.isFinite(number) ? number : null;
};

export function shouldDelayGameLogEntry(entry) {
  return entry?.type === "resource:gain" || entry?.type === "resource:shortage";
}

export function classifyIncomingGameLogEntries({
  entries = [],
  lastSeenId = 0,
  canDelay = true,
  isBackfill = false,
  hasPendingDeferred = false
} = {}) {
  const normalizedLastSeenId = toFiniteId(lastSeenId) ?? 0;
  const visibleNow = [];
  const deferred = [];
  const incomingEntries = (Array.isArray(entries) ? entries : []).filter((entry) => {
    const entryId = toFiniteId(entry?.id);
    return entryId != null && entryId > normalizedLastSeenId;
  });

  let deferRemainingEntries = Boolean(hasPendingDeferred && canDelay && !isBackfill);

  incomingEntries.forEach((entry) => {
    const shouldDeferCurrentEntry =
      !isBackfill &&
      canDelay &&
      (deferRemainingEntries || shouldDelayGameLogEntry(entry));

    if (shouldDeferCurrentEntry) {
      deferred.push(entry);
      deferRemainingEntries = true;
      return;
    }

    visibleNow.push(entry);
  });

  const nextLastSeenId = incomingEntries.reduce((maxSeenId, entry) => {
    const entryId = toFiniteId(entry?.id);
    return entryId == null ? maxSeenId : Math.max(maxSeenId, entryId);
  }, normalizedLastSeenId);

  return {
    visibleNow,
    deferred,
    nextLastSeenId
  };
}

export function flushDeferredGameLogEntries(entries = []) {
  return Array.isArray(entries) ? [...entries] : [];
}
