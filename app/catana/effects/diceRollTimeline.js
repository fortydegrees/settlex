const DEFAULT_FALLBACK_ROLL_MS = 1000;
const DEFAULT_SLOWDOWN_START_PORTION = 1;
const DEFAULT_SETTLE_MULTIPLIER = 0.25;

const toDurationMs = (value, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
};

const buildLayerTimings = ({ shakeMs, plan }) => {
  if (!Array.isArray(plan?.layers)) return [];

  return plan.layers
    .map((layer) => {
      if (layer?.durationMs == null) return null;

      const delayMs = toDurationMs(layer.timelineDelayMs ?? layer.delayMs, 0);
      const durationMs = toDurationMs(layer.durationMs, 0);
      const slowdownStartMs = shakeMs + delayMs;

      return {
        delayMs,
        durationMs,
        slowdownStartMs,
        rollMs: slowdownStartMs + durationMs
      };
    })
    .filter(Boolean);
};

export function buildDiceRollTimeline({
  plan,
  fallbackRollMs = DEFAULT_FALLBACK_ROLL_MS,
  slowdownStartPortion = DEFAULT_SLOWDOWN_START_PORTION,
  settleMultiplier = DEFAULT_SETTLE_MULTIPLIER
} = {}) {
  const shakeMs = toDurationMs(plan?.mainStartMs, 0);
  const fallbackDurationMs = toDurationMs(fallbackRollMs, DEFAULT_FALLBACK_ROLL_MS);
  const cueDurationMs = toDurationMs(
    plan?.totalDurationMs,
    fallbackDurationMs
  );
  const layerTimings = buildLayerTimings({ shakeMs, plan });
  const totalLayerRollMs = layerTimings.length
    ? Math.max(...layerTimings.map((layer) => layer.rollMs))
    : null;
  const resolvedCueDurationMs = totalLayerRollMs ?? cueDurationMs;
  const plannedSettleMs = resolvedCueDurationMs - shakeMs;
  const throwMs = plannedSettleMs > 0 || plan?.totalDurationMs != null
    ? Math.max(0, plannedSettleMs)
    : fallbackDurationMs;
  const slowdownStartMs = shakeMs > 0
    ? Math.max(0, Math.round(shakeMs * slowdownStartPortion))
    : Math.round(fallbackDurationMs * 0.4);
  const fallbackAnimatedRollMs = shakeMs > 0
    ? Math.max(shakeMs, shakeMs + Math.round(throwMs * settleMultiplier))
    : fallbackDurationMs;
  const rollMs = totalLayerRollMs ?? fallbackAnimatedRollMs;

  return {
    shakeMs,
    throwMs,
    slowdownStartMs,
    rollMs,
    totalDurationMs: rollMs,
    layerTimings
  };
}
