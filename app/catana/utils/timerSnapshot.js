export const normalizeTimerSnapshot = (
  timerSnapshot,
  serverTimeMs,
  receivedAtMs = Date.now()
) => {
  if (!timerSnapshot) return null;
  const serverDelayMs = serverTimeMs
    ? Math.max(0, receivedAtMs - serverTimeMs)
    : 0;
  return {
    ...timerSnapshot,
    receivedAtMs,
    serverDelayMs
  };
};

export const getTimerRemainingMs = (timerSnapshot, nowMs) =>
  timerSnapshot
    ? Math.max(
        0,
        timerSnapshot.remainingMs -
          (nowMs - timerSnapshot.receivedAtMs) -
          (timerSnapshot.serverDelayMs ?? 0)
      )
    : null;
