import { useEffect, useState } from "react";
import { getTimerRemainingMs } from "../utils/timerSnapshot";

export const LIVE_TURN_TIMER_INTERVAL_MS = 250;
export const LOW_TIMER_THRESHOLD_SECONDS = 5;

const LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS = new Set([
  "waiting_for_roll",
  "waiting_for_roll_other",
]);
const LOW_TIMER_ALERT_SUPPRESSED_STATUS_TYPES = new Set(["rolling"]);

export const getTimerSeconds = (ms) => {
  if (ms == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(ms / 1000));
};

export const formatTimer = (ms) => {
  if (ms == null) return null;
  const total = getTimerSeconds(ms);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return minutes + ":" + seconds;
};

export const getLiveTurnTimerPresentation = ({
  timerSnapshot,
  nowMs,
  enabled,
  statusType,
  statusKind,
}) => {
  const timerMs = enabled
    ? getTimerRemainingMs(timerSnapshot, nowMs)
    : null;
  const timerText = formatTimer(timerMs);
  const showStatusTimer = enabled && Boolean(timerText);
  const isLowTimerAlertSuppressed =
    LOW_TIMER_ALERT_SUPPRESSED_STATUS_TYPES.has(statusType) ||
    LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS.has(statusKind);

  return {
    timerMs,
    timerText,
    showStatusTimer,
    isLowTimerAlertActive:
      showStatusTimer &&
      !isLowTimerAlertSuppressed &&
      getTimerSeconds(timerMs) <= LOW_TIMER_THRESHOLD_SECONDS,
  };
};

export const startLiveTurnTimerTicker = ({
  enabled,
  onTick,
  nowFn = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) => {
  if (!enabled) return () => {};

  onTick(nowFn());
  const intervalId = setIntervalFn(
    () => onTick(nowFn()),
    LIVE_TURN_TIMER_INTERVAL_MS
  );
  return () => clearIntervalFn(intervalId);
};

export function useLiveTurnTimer({
  timerSnapshot,
  enabled,
  statusType,
  statusKind,
}) {
  const [nowMs, setNowMs] = useState(Date.now);
  const tickerEnabled = enabled && Boolean(timerSnapshot);

  useEffect(
    () =>
      startLiveTurnTimerTicker({
        enabled: tickerEnabled,
        onTick: setNowMs,
      }),
    [tickerEnabled, timerSnapshot]
  );

  return getLiveTurnTimerPresentation({
    timerSnapshot,
    nowMs,
    enabled: tickerEnabled,
    statusType,
    statusKind,
  });
}
