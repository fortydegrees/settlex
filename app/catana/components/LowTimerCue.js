import { useEffect, useRef } from "react";
import { getTimerSeconds, useLiveTurnTimer } from "./LiveTurnTimer";

export const CRITICAL_TIMER_THRESHOLD_SECONDS = 2;

/**
 * Invisible companion to the visual low-timer alert: emits one tick cue per
 * remaining second while the alert is active, escalating to the critical
 * tick for the final stretch. Runs its own 250ms ticker internally (via
 * useLiveTurnTimer) so GameScreen never re-renders on timer ticks; render
 * exactly one instance per screen so ticks are never doubled.
 */
export function LowTimerCue({
  effectsBus,
  timerSnapshot,
  statusType,
  statusKind,
  enabled = true
}) {
  const { timerMs, isLowTimerAlertActive } = useLiveTurnTimer({
    timerSnapshot,
    enabled,
    statusType,
    statusKind
  });
  const lastSecondRef = useRef(null);

  useEffect(() => {
    if (!isLowTimerAlertActive) {
      lastSecondRef.current = null;
      return;
    }
    const seconds = getTimerSeconds(timerMs);
    if (!Number.isFinite(seconds)) return;
    if (seconds === lastSecondRef.current) return;
    lastSecondRef.current = seconds;
    const name =
      seconds <= CRITICAL_TIMER_THRESHOLD_SECONDS
        ? "timer:critical"
        : "timer:low";
    effectsBus?.emit({ type: "cue", payload: { name } });
  }, [effectsBus, isLowTimerAlertActive, timerMs]);

  return null;
}
