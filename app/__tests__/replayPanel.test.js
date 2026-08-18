import { describe, expect, it } from "vitest";
import {
  getReplayMobileDockClassName,
  getReplayRailOffset,
  getSegmentedReplayPerspectiveOptions,
  shouldUseSegmentedReplayPerspective,
} from "../replays/components/replayPanelLayout";
import { getReplayChartClipStyle } from "../replays/components/ReplayScoreChart";

const duel = [
  { id: "0", name: "Nora" },
  { id: "1", name: "Ilan" },
];

describe("replay perspective control", () => {
  it("puts the board between the two seats", () => {
    expect(
      getSegmentedReplayPerspectiveOptions(duel).map((option) => option.name)
    ).toEqual(["Nora", "Board", "Ilan"]);
  });

  it("still offers a board option when the roster is empty", () => {
    expect(getSegmentedReplayPerspectiveOptions([])).toEqual([
      { id: null, name: "Board" },
    ]);
  });

  it("segments a short-named duel", () => {
    expect(shouldUseSegmentedReplayPerspective(duel)).toBe(true);
  });

  it("falls back to the select for long names or more than two seats", () => {
    expect(
      shouldUseSegmentedReplayPerspective([
        { id: "0", name: "HexplorerNorthstar" },
        { id: "1", name: "Ilan" },
      ])
    ).toBe(false);
    expect(
      shouldUseSegmentedReplayPerspective([...duel, { id: "2", name: "Ada" }])
    ).toBe(false);
  });
});

describe("replay seek rail geometry", () => {
  it("tracks the thumb centre rather than the raw percentage", () => {
    expect(getReplayRailOffset(0)).toBe("calc(0% + 8.5px)");
    expect(getReplayRailOffset(0.5)).toBe("calc(50% + 0px)");
    expect(getReplayRailOffset(1)).toBe("calc(100% + -8.5px)");
  });

  it("clamps out-of-range and unusable ratios", () => {
    expect(getReplayRailOffset(-2)).toBe(getReplayRailOffset(0));
    expect(getReplayRailOffset(4)).toBe(getReplayRailOffset(1));
    expect(getReplayRailOffset(Number.NaN)).toBe(getReplayRailOffset(0));
  });
});

describe("replay chart spoiler clip", () => {
  it("starts at the playhead and runs to the edge of the plot", () => {
    expect(
      getReplayChartClipStyle({ currentEventIndex: 5, eventCount: 11 })
    ).toEqual({ left: "calc(30px + 0.5 * (100% - 38px))", right: "8px" });
  });

  it("collapses to nothing once the replay reaches the end", () => {
    expect(
      getReplayChartClipStyle({ currentEventIndex: 10, eventCount: 11 })
    ).toEqual({ left: "calc(30px + 1 * (100% - 38px))", right: "8px" });
    expect(
      getReplayChartClipStyle({ currentEventIndex: 0, eventCount: 1 })
    ).toEqual({ left: "calc(30px + 1 * (100% - 38px))", right: "8px" });
  });
});

describe("replay mobile dock placement", () => {
  it("stays in the bottom command-row layer for Board perspective", () => {
    const className = getReplayMobileDockClassName(null);
    expect(className).toContain(
      "bottom-[calc(0.6rem+env(safe-area-inset-bottom))]"
    );
    expect(className).not.toContain("17.375rem");
  });

  it("uses the same bottom layer for a seated player perspective", () => {
    const className = getReplayMobileDockClassName("1");
    expect(className).toContain(
      "bottom-[calc(0.6rem+env(safe-area-inset-bottom))]"
    );
    expect(className).toContain("pl-[6.25rem]");
    expect(className).toContain("min-[400px]:pl-[6.75rem]");
    expect(className).not.toContain("17.375rem");
  });
});
