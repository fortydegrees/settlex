const asFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizePresenceEvent = (event, index) => {
  const eventId = event?.id ?? `${event?.type ?? "server"}-${index}`;
  return {
    id: `server-${eventId}`,
    type: event?.type ?? "server:unknown",
    actorId: "system",
    data: {
      ...(event?.data ?? {}),
      playerId: event?.playerId == null ? null : String(event.playerId)
    },
    afterGameLogSeq: asFiniteNumber(event?.afterGameLogSeq) ?? Number.MAX_SAFE_INTEGER,
    createdAtMs: asFiniteNumber(event?.createdAtMs) ?? 0
  };
};

export function readPresenceSnapshot(
  snapshot,
  serverTimeMs,
  receivedAtMs = Date.now()
) {
  if (!snapshot) return null;

  const normalizedServerTimeMs = asFiniteNumber(serverTimeMs);
  const normalizedReceivedAtMs =
    asFiniteNumber(receivedAtMs) ?? Date.now();

  return {
    ...snapshot,
    serverTimeMs: normalizedServerTimeMs,
    receivedAtMs: normalizedReceivedAtMs,
    serverDelayMs:
      normalizedServerTimeMs == null
        ? 0
        : Math.max(0, normalizedReceivedAtMs - normalizedServerTimeMs)
  };
}

export function getDisconnectRemainingMs(snapshot, nowMs = Date.now()) {
  if (!snapshot?.activeDisconnectPlayerId) return null;

  const receivedAtMs = asFiniteNumber(snapshot.receivedAtMs) ?? Date.now();
  const normalizedNowMs = asFiniteNumber(nowMs) ?? Date.now();
  const baselineRemainingMs =
    asFiniteNumber(snapshot.remainingMs) ??
    (() => {
      const deadlineAtMs = asFiniteNumber(snapshot.deadlineAtMs);
      const serverTimeMs = asFiniteNumber(snapshot.serverTimeMs);
      if (deadlineAtMs == null || serverTimeMs == null) return null;
      return Math.max(0, deadlineAtMs - serverTimeMs);
    })();

  if (baselineRemainingMs == null) return null;

  return Math.max(
    0,
    baselineRemainingMs -
      (normalizedNowMs - receivedAtMs) -
      (snapshot.serverDelayMs ?? 0)
  );
}

export function mergeVisibleLogEntries(gameLog = [], presenceEvents = []) {
  const logEntries = Array.isArray(gameLog) ? [...gameLog] : [];
  const serverEntries = (Array.isArray(presenceEvents) ? presenceEvents : [])
    .map(normalizePresenceEvent)
    .sort((left, right) => {
      if (left.afterGameLogSeq !== right.afterGameLogSeq) {
        return left.afterGameLogSeq - right.afterGameLogSeq;
      }
      if (left.createdAtMs !== right.createdAtMs) {
        return left.createdAtMs - right.createdAtMs;
      }
      return String(left.id).localeCompare(String(right.id));
    });

  if (serverEntries.length === 0) {
    return logEntries;
  }

  const merged = [];
  let nextServerIndex = 0;
  const pushServerEntriesAfter = (gameLogSeq) => {
    while (
      nextServerIndex < serverEntries.length &&
      serverEntries[nextServerIndex].afterGameLogSeq <= gameLogSeq
    ) {
      merged.push(serverEntries[nextServerIndex]);
      nextServerIndex += 1;
    }
  };

  pushServerEntriesAfter(0);

  logEntries.forEach((entry) => {
    merged.push(entry);
    pushServerEntriesAfter(asFiniteNumber(entry?.id) ?? 0);
  });

  while (nextServerIndex < serverEntries.length) {
    merged.push(serverEntries[nextServerIndex]);
    nextServerIndex += 1;
  }

  return merged;
}
