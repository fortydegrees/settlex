// Seconds reserved by the placement effect queue. Visual-only hold/upgrade
// phases remain in the UI runner and do not extend this existing contract.
export const PLACEMENT_EFFECT_DEFAULT_TIMING = Object.freeze({
  dropDuration: 0.22,
  squishDuration: 0.08,
  settleDuration: 0.18,
  dustDuration: 0.24,
  shadowFadeOutDuration: 0.08
});

// Explicit tuning is a complete input: missing/null fields contribute zero.
export const getPlacementEffectDuration = (tuning = PLACEMENT_EFFECT_DEFAULT_TIMING) => {
  const overlap = Math.max(
    tuning.dustDuration ?? 0,
    tuning.squishDuration ?? 0,
    tuning.shadowFadeOutDuration ?? 0
  );
  return (tuning.dropDuration ?? 0) + overlap + (tuning.settleDuration ?? 0);
};
