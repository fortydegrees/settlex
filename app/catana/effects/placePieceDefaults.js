import {
  PLACEMENT_EFFECT_DEFAULT_TIMING,
  getPlacementEffectDuration as getSharedPlacementEffectDuration
} from "../../../lib/shared/placementEffectTiming.js";

export const PLACE_PIECE_DEFAULT_TUNING = {
  ...PLACEMENT_EFFECT_DEFAULT_TIMING,
  dropDistance: 1.5,
  postHoldDuration: 0.03,
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
  upgradeLiftDistance: 0.9,
  upgradeLiftDuration: 0.14,
  upgradeLiftScale: 0.96,
  upgradeCityDropOverlap: 0.04,
  shadowEase: "power2.out",
  easeDrop: "power2.in",
  easeDust: "power2.out",
  easeSquish: "power2.out",
  easeSettle: "back.out(1.6)",
  easeSettleRoad: "back.out(1.4)"
};

// UI callers keep their existing default-object API, including local tuning
// mutations. Server/replay code imports the neutral timing contract directly.
export const getPlacementEffectDuration = (tuning = PLACE_PIECE_DEFAULT_TUNING) =>
  getSharedPlacementEffectDuration(tuning);
