import { describe, expect, it } from "vitest";
import { scheduleResourceCues } from "../../effects/resourceDistribution";

describe("resourceDistribution cues", () => {
  it("registers travel-start cue", () => {
    const calls = [];
    const tl = {
      call: (_, __, label) => calls.push(label)
    };
    scheduleResourceCues(tl, () => {});
    expect(calls).toContain("travel");
  });
});
