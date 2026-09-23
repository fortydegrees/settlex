import { describe, expect, it } from "vitest";
import {
  createHomeDemoEventProgress,
  createPausableTimeoutScheduler
} from "../homeDemo/homeDemoPlayback";

function createFakeTimers() {
  let nowMs = 0;
  let nextId = 1;
  const timers = new Map();

  const setTimeoutImpl = (callback, delayMs) => {
    const id = nextId;
    nextId += 1;
    timers.set(id, {
      callback,
      runAtMs: nowMs + delayMs
    });
    return id;
  };

  const clearTimeoutImpl = (id) => {
    timers.delete(id);
  };

  const advanceTo = (nextNowMs) => {
    nowMs = nextNowMs;
    let dueTimer = [...timers.entries()]
      .filter(([, timer]) => timer.runAtMs <= nowMs)
      .sort(([, a], [, b]) => a.runAtMs - b.runAtMs)[0];

    while (dueTimer) {
      const [id, timer] = dueTimer;
      timers.delete(id);
      timer.callback();
      dueTimer = [...timers.entries()]
        .filter(([, candidate]) => candidate.runAtMs <= nowMs)
        .sort(([, a], [, b]) => a.runAtMs - b.runAtMs)[0];
    }
  };

  return {
    advanceTo,
    clearTimeoutImpl,
    now: () => nowMs,
    pendingDelays: () =>
      [...timers.values()]
        .map((timer) => timer.runAtMs - nowMs)
        .sort((a, b) => a - b),
    setTimeoutImpl
  };
}

describe("homepage demo playback", () => {
  it("commits a reused event ID again after the scene loops", () => {
    const committed = [];
    const progress = createHomeDemoEventProgress((event) => committed.push(event));
    const event = { id: "quiet-expansion-setup-32" };

    progress.beginScene();
    progress.start(event);
    progress.commit(event);
    progress.beginScene();
    progress.start(event);
    progress.commit(event);

    expect(committed).toEqual([event, event]);
  });

  it("settles an interrupted placement only once", () => {
    const committed = [];
    const progress = createHomeDemoEventProgress((event) => committed.push(event));
    const event = { id: "quiet-expansion-setup-32" };

    progress.beginScene();
    progress.start(event);
    progress.settleStarted();
    progress.commit(event);

    expect(committed).toEqual([event]);
  });

  it("preserves event spacing across a hidden interval", () => {
    const timers = createFakeTimers();
    const scheduler = createPausableTimeoutScheduler({
      clearTimeoutImpl: timers.clearTimeoutImpl,
      nowImpl: timers.now,
      setTimeoutImpl: timers.setTimeoutImpl
    });
    const calls = [];

    scheduler.schedule(() => calls.push("first"), 1000);
    scheduler.schedule(() => calls.push("second"), 2000);

    timers.advanceTo(500);
    scheduler.pause();
    timers.advanceTo(5500);

    expect(calls).toEqual([]);

    scheduler.resume();
    expect(timers.pendingDelays()).toEqual([500, 1500]);

    timers.advanceTo(5999);
    expect(calls).toEqual([]);
    timers.advanceTo(6000);
    expect(calls).toEqual(["first"]);
    timers.advanceTo(7000);
    expect(calls).toEqual(["first", "second"]);
  });

  it("does not arm callbacks until an initially paused scheduler resumes", () => {
    const timers = createFakeTimers();
    const scheduler = createPausableTimeoutScheduler({
      clearTimeoutImpl: timers.clearTimeoutImpl,
      initiallyPaused: true,
      nowImpl: timers.now,
      setTimeoutImpl: timers.setTimeoutImpl
    });
    const calls = [];

    scheduler.schedule(() => calls.push("visible"), 400);
    timers.advanceTo(2000);

    expect(calls).toEqual([]);
    expect(timers.pendingDelays()).toEqual([]);

    scheduler.resume();
    expect(timers.pendingDelays()).toEqual([400]);
    timers.advanceTo(2400);
    expect(calls).toEqual(["visible"]);
  });

  it("clears pending callbacks without leaving native timers behind", () => {
    const timers = createFakeTimers();
    const scheduler = createPausableTimeoutScheduler({
      clearTimeoutImpl: timers.clearTimeoutImpl,
      nowImpl: timers.now,
      setTimeoutImpl: timers.setTimeoutImpl
    });
    const callback = () => {
      throw new Error("cleared homepage callback ran");
    };

    scheduler.schedule(callback, 1000);
    scheduler.clear();
    timers.advanceTo(2000);

    expect(timers.pendingDelays()).toEqual([]);
  });
});
