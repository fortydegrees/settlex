import { describe, expect, it } from "vitest";
import { replayNavigationReducer } from "../replays/useReplayNavigation";

describe("replay navigation", () => {
  it("clamps step and seek actions without playback state", () => {
    const start = { eventIndex: 0, eventCount: 3 };
    expect(replayNavigationReducer(start, { type: "previous" })).toEqual(start);
    expect(replayNavigationReducer(start, { type: "next" })).toEqual({
      eventIndex: 1,
      eventCount: 3,
    });
    expect(
      replayNavigationReducer(start, { type: "seek", eventIndex: 99 })
    ).toEqual({ eventIndex: 2, eventCount: 3 });
  });

  it("clamps the cursor when the event count changes", () => {
    expect(
      replayNavigationReducer(
        { eventIndex: 4, eventCount: 5 },
        { type: "syncCount", eventCount: 2 }
      )
    ).toEqual({ eventIndex: 1, eventCount: 2 });
  });
});
