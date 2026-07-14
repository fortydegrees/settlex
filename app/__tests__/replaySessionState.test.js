import { describe, expect, it } from "vitest";
import {
  createReplaySessionState,
  replaySessionReducer,
} from "../replays/replaySessionState";

describe("replay session state", () => {
  it("restores the cursor after an early Results reveal", () => {
    const start = {
      ...createReplaySessionState({ eventCount: 8, perspectiveId: "1" }),
      eventIndex: 3,
    };
    const open = replaySessionReducer(start, { type: "openResults" });
    expect(open).toMatchObject({
      eventIndex: 7,
      resultsOpen: true,
      resultsReturnEventIndex: 3,
    });
    expect(replaySessionReducer(open, { type: "closeResults" })).toMatchObject({
      eventIndex: 3,
      perspectiveId: "1",
      resultsOpen: false,
    });
  });

  it("automatically opens Results once at the terminal event", () => {
    const start = createReplaySessionState({
      eventCount: 3,
      perspectiveId: null,
    });
    const terminal = replaySessionReducer(start, {
      type: "seek",
      eventIndex: 2,
    });
    expect(terminal).toMatchObject({
      resultsOpen: true,
      terminalResultsSeen: true,
    });
    const closed = replaySessionReducer(terminal, { type: "closeResults" });
    expect(
      replaySessionReducer(closed, { type: "seek", eventIndex: 2 }).resultsOpen
    ).toBe(false);
  });
});
