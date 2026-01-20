export const PLACE_PIECE_DEFAULT_TUNING = {
  dropDistance: 1.5,
  dropDuration: 0.22,
  squishDuration: 0.08,
  settleDuration: 0.18,
  dustDuration: 0.24,
  dustScaleFrom: 0.2,
  dustScaleTo: 1.15,
  dustOpacity: 0.7,
  squishScaleX: 1,
  squishScaleY: 1,
  roadSquishScaleX: 1,
  roadSquishScaleY: 1,
  dustSizeSettlement: 1.05,
  dustSizeRoad: 0.85,
  shadowOpacity: 0.35,
  shadowScaleFrom: 0.4,
  shadowScaleTo: 0.9,
  shadowSizeSettlement: 0.85,
  shadowSizeRoad: 0.6,
  shadowFadeOutDuration: 0.08,
  shadowEase: "power2.out",
  easeDrop: "power2.in",
  easeDust: "power2.out",
  easeSquish: "power2.out",
  easeSettle: "back.out(1.6)",
  easeSettleRoad: "back.out(1.4)"
};

export const getPlacementEffectDuration = (tuning = PLACE_PIECE_DEFAULT_TUNING) => {
  const overlap = Math.max(
    tuning.dustDuration ?? 0,
    tuning.squishDuration ?? 0,
    tuning.shadowFadeOutDuration ?? 0
  );
  return (tuning.dropDuration ?? 0) + overlap + (tuning.settleDuration ?? 0);
};
