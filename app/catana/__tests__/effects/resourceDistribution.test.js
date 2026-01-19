import { describe, expect, it } from "vitest";
import { getCardAnimationConfig, getRandomizedOffsets, scheduleResourceCues } from "../../effects/resourceDistribution";

describe("resourceDistribution cues", () => {
  it("registers pop-start cue", () => {
    const calls = [];
    const tl = {
      call: (_, __, label) => calls.push(label)
    };
    scheduleResourceCues(tl, () => {});
    expect(calls).toContain("pop");
  });

  it("builds a pop-heavy card animation config", () => {
    const config = getCardAnimationConfig({
      startX: 10,
      startY: 20,
      endX: 100,
      endY: 200,
      jitterX: 2,
      jitterY: -3,
      rotate: 4
    });

    expect(config.from.scale).toBeLessThan(1);
    expect(config.pop.scale).toBeGreaterThan(1);
    expect(config.settle.scale).toBe(1);
    expect(config.pop.ease).toContain("back");
    expect(config.from.x).toBe(12);
    expect(config.from.y).toBe(17);
    expect(config.travel.x).toBe(100);
    expect(config.travel.y).toBe(200);
  });

  it("computes jitter offsets from provided random", () => {
    const rand = () => 1;
    const offsets = getRandomizedOffsets(rand);
    expect(offsets.jitterX).toBeGreaterThan(0);
    expect(offsets.jitterY).toBeGreaterThan(0);
    expect(offsets.rotate).toBeGreaterThan(0);
  });
});
