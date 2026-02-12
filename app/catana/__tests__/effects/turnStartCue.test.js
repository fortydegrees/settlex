import { describe, expect, it } from "vitest";

const loadTurnStartCue = async () => {
  try {
    return await import("../../effects/turnStartCue.js");
  } catch (err) {
    return null;
  }
};

describe("turnStartCue", () => {
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
