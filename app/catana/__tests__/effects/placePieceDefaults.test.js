import { describe, expect, it } from "vitest";
import {
  getPlacementEffectDuration,
  PLACE_PIECE_DEFAULT_TUNING
} from "../../effects/placePieceDefaults.js";

import { getPlacementEffectDuration as getSharedDuration } from "../../../../lib/shared/placementEffectTiming.js";

describe.each([
  ["UI", getPlacementEffectDuration], ["shared", getSharedDuration]
])("%s placement duration contract", (_name, calculate) => {
  it("preserves the exact default floating-point duration", () => {
    expect(calculate()).toBe(0.6399999999999999);
    expect(calculate(undefined)).toBe(0.6399999999999999);
  });

  it.each(["dustDuration", "squishDuration", "shadowFadeOutDuration"])(
    "overlaps the three middle phases when %s is longest", (longest) => {
      expect(calculate({
        dropDuration: 1, settleDuration: 2,
        dustDuration: 3, squishDuration: 4, shadowFadeOutDuration: 5,
        [longest]: 6
      })).toBe(9);
    }
  );

  it.each([[{}, 0], [{ dropDuration: null, dustDuration: null }, 0], [{ settleDuration: 2 }, 2]])(
    "uses zero for absent/null fields without merging defaults: %j", (tuning, expected) => {
      expect(calculate(tuning)).toBe(expected);
    }
  );

  it("excludes post-hold and city-upgrade presentation phases", () => {
    expect(calculate({
      dropDuration: 1, dustDuration: 2, settleDuration: 3,
      postHoldDuration: 20, upgradeLiftDuration: 30, upgradeCityDropOverlap: 40
    })).toBe(6);
  });

  it("does not clamp negative durations or turn whole null into defaults", () => {
    expect(calculate({
      dropDuration: -1, dustDuration: -2, squishDuration: -3,
      shadowFadeOutDuration: -4, settleDuration: -5
    })).toBe(-8);
    expect(() => calculate(null)).toThrow(TypeError);
  });
});

it("uses the current UI default object for omitted tuning", () => {
  const previous = PLACE_PIECE_DEFAULT_TUNING.dropDuration;
  try {
    PLACE_PIECE_DEFAULT_TUNING.dropDuration = 1;
    expect(getPlacementEffectDuration()).toBe(1.42);
  } finally {
    PLACE_PIECE_DEFAULT_TUNING.dropDuration = previous;
  }
});
