import { afterEach, describe, expect, it, vi } from "vitest";
import { createTurnStartCueGate } from "../../effects/turnStartCue.js";

const loadTurnStartCue = async () => {
  try {
    return await import("../../effects/turnStartCue.js");
  } catch (err) {
    return null;
  }
};

describe("turnStartCue", () => {
  it("requests the initial placement turn after a fresh-game jingle", async () => {
    const turnStartCue = await loadTurnStartCue();
    const result = turnStartCue.getTurnStartCueDecision({
      currentPlayerId: "0",
      playerID: "0",
      phase: "placement",
      gameStartPlayed: true,
      prevState: {
        currentPlayerId: "0",
        phase: "preGame",
        initialized: true
      }
    });

    expect(result.play).toBe(true);
    expect(result.nextState).toEqual({
      currentPlayerId: "0",
      phase: "placement",
      initialized: true
    });
  });

  it("requests the first local turn when a fresh board already starts in placement", async () => {
    const turnStartCue = await loadTurnStartCue();
    const result = turnStartCue.getTurnStartCueDecision({
      currentPlayerId: "0",
      playerID: "0",
      phase: "placement",
      gameStartPlayed: true
    });

    expect(result.play).toBe(true);
  });

  it("still announces later turns after the fresh-game jingle", async () => {
    const turnStartCue = await loadTurnStartCue();
    const result = turnStartCue.getTurnStartCueDecision({
      currentPlayerId: "1",
      playerID: "1",
      phase: "placement",
      gameStartPlayed: true,
      prevState: {
        currentPlayerId: "0",
        phase: "placement",
        initialized: true
      }
    });

    expect(result.play).toBe(true);
  });

  it("plays when placement begins for the active player", async () => {
    const turnStartCue = await loadTurnStartCue();
    const prevState = {
      currentPlayerId: "0",
      phase: "preGame",
      initialized: true
    };

    const result = turnStartCue?.getTurnStartCueDecision?.({
      currentPlayerId: "0",
      playerID: "0",
      phase: "placement",
      prevState
    });

    expect(result?.play).toBe(true);
    expect(result?.nextState).toEqual({
      currentPlayerId: "0",
      phase: "placement",
      initialized: true
    });
  });

  it("skips consecutive placement turns for the same player", async () => {
    const turnStartCue = await loadTurnStartCue();
    const prevState = {
      currentPlayerId: "1",
      phase: "placement",
      initialized: true
    };

    const result = turnStartCue?.getTurnStartCueDecision?.({
      currentPlayerId: "1",
      playerID: "1",
      phase: "placement",
      prevState
    });

    expect(result?.play).toBe(false);
  });

  it("plays when the current player changes during placement", async () => {
    const turnStartCue = await loadTurnStartCue();
    const prevState = {
      currentPlayerId: "0",
      phase: "placement",
      initialized: true
    };

    const result = turnStartCue?.getTurnStartCueDecision?.({
      currentPlayerId: "1",
      playerID: "1",
      phase: "placement",
      prevState
    });

    expect(result?.play).toBe(true);
    expect(result?.nextState?.currentPlayerId).toBe("1");
  });
});

describe("opening turn cue gate", () => {
  afterEach(() => vi.useRealTimers());

  it("waits for completion and a half-second gap, then emits once", () => {
    vi.useFakeTimers();
    const cues = [];
    const gate = createTurnStartCueGate({ emit: () => cues.push("turn:start"), isRelevant: () => true });
    gate.hold();
    gate.request();
    gate.request();
    vi.advanceTimersByTime(5_000);
    expect(cues).toEqual([]);
    gate.release();
    vi.advanceTimersByTime(499);
    expect(cues).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(cues).toEqual(["turn:start"]);
    gate.request();
    expect(cues).toEqual(["turn:start", "turn:start"]);
    gate.destroy();
  });

  it("drops a queued turn if it is no longer relevant when the gap ends", () => {
    vi.useFakeTimers();
    let relevant = true;
    const cues = [];
    const gate = createTurnStartCueGate({ emit: () => cues.push("turn:start"), isRelevant: () => relevant });
    gate.hold();
    gate.release();
    gate.request();
    relevant = false;
    vi.advanceTimersByTime(500);
    expect(cues).toEqual([]);
    gate.destroy();
  });

  it("cancels pending playback on unmount even if completion arrives later", () => {
    vi.useFakeTimers();
    const cues = [];
    const gate = createTurnStartCueGate({ emit: () => cues.push("turn:start"), isRelevant: () => true });
    gate.hold();
    gate.request();
    gate.release();
    gate.destroy();
    gate.release();
    vi.advanceTimersByTime(1_000);
    expect(cues).toEqual([]);
  });
});
