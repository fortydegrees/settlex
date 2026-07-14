import { describe, expect, it } from "vitest";
import {
  getReplayChartKeyboardSeekIndex,
  getReplayEventIndexAtChartX,
  getVisibleReplayScoreData,
} from "../replays/components/ReplayScoreChart";

it("hides future score samples and future turn labels", () => {
  const result = getVisibleReplayScoreData({
    scoreSeries: [0, 1, 2, 3].map((eventIndex) => ({ eventIndex })),
    turnStarts: [
      { turn: 1, eventIndex: 0 },
      { turn: 2, eventIndex: 2 },
      { turn: 3, eventIndex: 3 },
    ],
    currentEventIndex: 2,
  });
  expect(result.visibleScoreSeries.map((row) => row.eventIndex)).toEqual([
    0, 1, 2,
  ]);
  expect(result.visibleTurnStarts).toEqual([
    { turn: 1, eventIndex: 0 },
    { turn: 2, eventIndex: 2 },
  ]);
});

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

  it("steps the chart seek cursor with horizontal arrow keys", () => {
    const input = { currentEventIndex: 5, eventCount: 8 };
    expect(
      getReplayChartKeyboardSeekIndex({ ...input, key: "ArrowLeft" })
    ).toBe(4);
    expect(
      getReplayChartKeyboardSeekIndex({ ...input, key: "ArrowRight" })
    ).toBe(6);
    expect(
      getReplayChartKeyboardSeekIndex({ ...input, key: "Enter" })
    ).toBeNull();
    expect(
      getReplayChartKeyboardSeekIndex({
        currentEventIndex: 0,
        eventCount: 8,
        key: "ArrowLeft",
      })
    ).toBe(0);
  });
});
