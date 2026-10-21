import { describe, expect, it } from "vitest";
import { buildDiceRollTimeline } from "../../effects/diceRollTimeline";

describe("diceRollTimeline", () => {
  it("uses the planned shake and throw durations when available", () => {
    expect(
      buildDiceRollTimeline({
        plan: {
          mainStartMs: 334,
          totalDurationMs: 1236,
          layers: [
            { delayMs: 299, timelineDelayMs: 100, durationMs: 398 },
            { delayMs: 387, timelineDelayMs: 129, durationMs: 515 }
          ]
        }
      })
    ).toEqual({
      shakeMs: 334,
      throwMs: 644,
      slowdownStartMs: 334,
      rollMs: 978,
      totalDurationMs: 978,
      layerTimings: [
        {
          delayMs: 100,
          durationMs: 398,
          slowdownStartMs: 434,
          rollMs: 832
        },
        {
          delayMs: 129,
          durationMs: 515,
          slowdownStartMs: 463,
          rollMs: 978
        }
      ]
    });
  });

  it("falls back to a fixed roll duration when clip timings are unavailable", () => {
    expect(buildDiceRollTimeline({ plan: null })).toEqual({
      shakeMs: 0,
      throwMs: 1000,
      slowdownStartMs: 400,
      rollMs: 1000,
      totalDurationMs: 1000,
      layerTimings: []
    });
  });
});
