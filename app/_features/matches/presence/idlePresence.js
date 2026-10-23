const asFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function readIdlePresenceSnapshot(
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

export function getIdleRemainingMs(snapshot, nowMs = Date.now()) {
  if (!snapshot?.activeIdlePlayerId) return null;

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

export function getActiveIdleStateByPlayerId(
  snapshot,
  nowMs = Date.now()
) {
  const activeIdlePlayerId = snapshot?.activeIdlePlayerId;
  const remainingMs = getIdleRemainingMs(snapshot, nowMs);

  if (!activeIdlePlayerId || remainingMs == null || remainingMs <= 0) {
    return {};
  }

  return {
    [activeIdlePlayerId]: {
      status: "idle",
      remainingMs
    }
  };
}
