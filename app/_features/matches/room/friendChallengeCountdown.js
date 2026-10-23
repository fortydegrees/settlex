export const CHALLENGE_EXPIRY_INTERVAL_MS = 1000;

function formatChallengeExpiry(expiresAt, nowMs) {
  if (!expiresAt) return "a few minutes";
  const expiresAtDate = new Date(expiresAt);
  if (Number.isNaN(expiresAtDate.getTime())) return "a few minutes";
  if (!Number.isFinite(nowMs)) return "soon";

  const remainingSeconds = Math.max(
    0,
    Math.ceil((expiresAtDate.getTime() - nowMs) / 1000)
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getChallengeCountdownPresentation({
  expiresAt,
  nowMs,
  liveNowMs,
}) {
  const hasFixedClock = Number.isFinite(nowMs);
  const displayNowMs = hasFixedClock ? nowMs : liveNowMs;

  return {
    text:
      displayNowMs == null
        ? "This challenge expires soon."
        : `This challenge expires in ${formatChallengeExpiry(
            expiresAt,
            displayNowMs
          )}.`,
    tickerEnabled: !hasFixedClock,
  };
}

export function startChallengeExpiryTicker({
  enabled,
  onTick,
  nowFn = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  if (!enabled) return () => {};

  onTick(nowFn());
  const intervalId = setIntervalFn(
    () => onTick(nowFn()),
    CHALLENGE_EXPIRY_INTERVAL_MS
  );
  return () => clearIntervalFn(intervalId);
}
