import { describe, expect, it } from "vitest";
import { getReplayEventIndexAtChartX } from "../replays/components/ReplayScoreChart";

describe("ReplayScoreChart seeking", () => {
  it("maps clicks within the plotted area to a replay event", () => {
    expect(
      getReplayEventIndexAtChartX({
        clientX: 280,
        rectLeft: 100,
        rectWidth: 338,
        eventCount: 11,
      })
    ).toBe(5);
  });

  it("clamps clicks outside the plotted area", () => {
    const input = { rectLeft: 100, rectWidth: 338, eventCount: 11 };

    expect(getReplayEventIndexAtChartX({ ...input, clientX: 100 })).toBe(0);
    expect(getReplayEventIndexAtChartX({ ...input, clientX: 500 })).toBe(10);
  });
});
