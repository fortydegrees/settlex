import { describe, expect, it } from "vitest";
import {
  getPlacementEffectDuration,
  PLACE_PIECE_DEFAULT_TUNING
} from "../../effects/placePieceDefaults.js";

describe("placePiece defaults", () => {
  it("includes post-hold time in the computed duration", () => {
    const duration = getPlacementEffectDuration({
      ...PLACE_PIECE_DEFAULT_TUNING,
      dropDuration: 0.2,
      dustDuration: 0.1,
      squishDuration: 0.08,
      shadowFadeOutDuration: 0.02,
      settleDuration: 0.1,
      postHoldDuration: 0.05
    });

    expect(duration).toBeCloseTo(0.4, 5);
  });
});
