import { describe, expect, it } from "vitest";
import {
  createReplaySessionState,
  replaySessionReducer,
} from "../replays/replaySessionState";
import * as replaySessionState from "../replays/replaySessionState";

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

describe("postgame replay activation", () => {
  it("does not activate when hydration becomes ready without user intent", () => {
    expect(replaySessionState.createReplayActivationState).toBeTypeOf(
      "function"
    );
    expect(replaySessionState.replayActivationReducer).toBeTypeOf("function");
    if (
      !replaySessionState.createReplayActivationState ||
      !replaySessionState.replayActivationReducer
    ) {
      return;
    }

    const start = replaySessionState.createReplayActivationState();
    expect(
      replaySessionState.replayActivationReducer(start, {
        type: "payloadReady",
      })
    ).toEqual(start);
  });

  it("queues one replay activation until a requested payload becomes ready", () => {
    expect(replaySessionState.createReplayActivationState).toBeTypeOf(
      "function"
    );
    expect(replaySessionState.replayActivationReducer).toBeTypeOf("function");
    if (
      !replaySessionState.createReplayActivationState ||
      !replaySessionState.replayActivationReducer
    ) {
      return;
    }

    const start = replaySessionState.createReplayActivationState();
    const requested = replaySessionState.replayActivationReducer(start, {
      type: "requestReplay",
      payloadStatus: "loading",
    });
    expect(requested).toEqual({ intentPending: true, replayActive: false });

    const ready = replaySessionState.replayActivationReducer(requested, {
      type: "payloadReady",
    });
    expect(ready).toEqual({ intentPending: false, replayActive: true });
    expect(
      replaySessionState.replayActivationReducer(ready, {
        type: "payloadReady",
      })
    ).toBe(ready);
  });
});
