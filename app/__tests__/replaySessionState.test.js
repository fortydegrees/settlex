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

    const start = replaySessionState.createReplayActivationState({
      identityKey: "A",
    });
    expect(
      replaySessionState.replayActivationReducer(start, {
        type: "payloadReady",
        identityKey: "A",
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

    const start = replaySessionState.createReplayActivationState({
      identityKey: "A",
    });
    const requested = replaySessionState.replayActivationReducer(start, {
      type: "requestReplay",
      payloadStatus: "loading",
      identityKey: "A",
    });
    expect(requested).toEqual({
      identityKey: "A",
      intentPending: true,
      replayActive: false,
    });

    const ready = replaySessionState.replayActivationReducer(requested, {
      type: "payloadReady",
      identityKey: "A",
    });
    expect(ready).toEqual({
      identityKey: "A",
      intentPending: false,
      replayActive: true,
    });
    expect(
      replaySessionState.replayActivationReducer(ready, {
        type: "payloadReady",
        identityKey: "A",
      })
    ).toBe(ready);
  });

  it("drops queued intent when the replay identity changes", () => {
    const start = replaySessionState.createReplayActivationState({
      identityKey: "A",
    });
    const requestedA = replaySessionState.replayActivationReducer(start, {
      type: "requestReplay",
      payloadStatus: "loading",
      identityKey: "A",
    });
    const resetB = replaySessionState.replayActivationReducer(requestedA, {
      type: "resetIdentity",
      identityKey: "B",
    });
    expect(resetB).toEqual({
      identityKey: "B",
      intentPending: false,
      replayActive: false,
    });

    const readyB = replaySessionState.replayActivationReducer(resetB, {
      type: "payloadReady",
      identityKey: "B",
    });
    expect(readyB).toBe(resetB);

    const requestedB = replaySessionState.replayActivationReducer(readyB, {
      type: "requestReplay",
      payloadStatus: "ready",
      identityKey: "B",
    });
    expect(requestedB).toEqual({
      identityKey: "B",
      intentPending: false,
      replayActive: true,
    });
    expect(
      replaySessionState.replayActivationReducer(requestedB, {
        type: "payloadReady",
        identityKey: "B",
      })
    ).toBe(requestedB);
  });

  it("deactivates an already-started replay when identity changes", () => {
    const activeA = replaySessionState.createReplayActivationState({
      identityKey: "A",
      replayActive: true,
    });
    expect(
      replaySessionState.replayActivationReducer(activeA, {
        type: "resetIdentity",
        identityKey: "B",
      })
    ).toEqual({
      identityKey: "B",
      intentPending: false,
      replayActive: false,
    });
  });

  it("atomically preserves a replay click across an identity change", () => {
    const stateA = replaySessionState.createReplayActivationState({
      identityKey: "A",
    });
    const requestedB = replaySessionState.replayActivationReducer(stateA, {
      type: "requestReplay",
      payloadStatus: "loading",
      identityKey: "B",
    });
    expect(requestedB).toEqual({
      identityKey: "B",
      intentPending: true,
      replayActive: false,
    });

    expect(
      replaySessionState.replayActivationReducer(requestedB, {
        type: "payloadReady",
        identityKey: "A",
      })
    ).toBe(requestedB);

    const readyB = replaySessionState.replayActivationReducer(requestedB, {
      type: "payloadReady",
      identityKey: "B",
    });
    expect(readyB).toEqual({
      identityKey: "B",
      intentPending: false,
      replayActive: true,
    });
    expect(
      replaySessionState.replayActivationReducer(readyB, {
        type: "payloadReady",
        identityKey: "B",
      })
    ).toBe(readyB);
  });

  it("queues B while the payload hook still exposes ready state for A", () => {
    expect(replaySessionState.getReplayPayloadStatusForIdentity).toBeTypeOf(
      "function"
    );
    expect(replaySessionState.isReplayReadyForIdentity).toBeTypeOf("function");
    if (
      !replaySessionState.getReplayPayloadStatusForIdentity ||
      !replaySessionState.isReplayReadyForIdentity
    ) {
      return;
    }

    const stateA = replaySessionState.createReplayActivationState({
      identityKey: "A",
    });
    const payloadStatusForB =
      replaySessionState.getReplayPayloadStatusForIdentity({
        identityKey: "B",
        payloadIdentityKey: "A",
        payloadStatus: "ready",
      });
    expect(payloadStatusForB).toBe("loading");

    const requestedB = replaySessionState.replayActivationReducer(stateA, {
      type: "requestReplay",
      payloadStatus: payloadStatusForB,
      identityKey: "B",
    });
    expect(requestedB).toEqual({
      identityKey: "B",
      intentPending: true,
      replayActive: false,
    });
    expect(
      replaySessionState.isReplayReadyForIdentity({
        identityKey: "B",
        activation: requestedB,
        sessionIdentityKey: "B",
        payloadIdentityKey: "A",
      })
    ).toBe(false);

    const staleReadyA = replaySessionState.replayActivationReducer(
      requestedB,
      { type: "payloadReady", identityKey: "A" }
    );
    expect(staleReadyA).toBe(requestedB);

    const readyB = replaySessionState.replayActivationReducer(staleReadyA, {
      type: "payloadReady",
      identityKey: "B",
    });
    expect(readyB).toEqual({
      identityKey: "B",
      intentPending: false,
      replayActive: true,
    });
    expect(
      replaySessionState.isReplayReadyForIdentity({
        identityKey: "B",
        activation: readyB,
        sessionIdentityKey: "B",
        payloadIdentityKey: "B",
      })
    ).toBe(true);
  });
});
