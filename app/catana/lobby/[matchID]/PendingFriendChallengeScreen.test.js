import { describe, expect, it, vi } from "vitest";
import * as challengeScreen from "./friendChallengeCountdown";

describe("friend challenge expiry presentation", () => {
  it("uses a fixed clock for a stable production-scale countdown", () => {
    expect(
      challengeScreen.getChallengeCountdownPresentation
    ).toBeTypeOf("function");

    expect(
      challengeScreen.getChallengeCountdownPresentation({
        expiresAt: "2026-07-29T12:05:00.000Z",
        nowMs: Date.parse("2026-07-29T12:00:00.000Z"),
        liveNowMs: null,
      })
    ).toEqual({
      text: "This challenge expires in 5:00.",
      tickerEnabled: false,
    });
  });

  it("does not start an interval for a fixed clock", () => {
    expect(challengeScreen.startChallengeExpiryTicker).toBeTypeOf("function");

    const onTick = vi.fn();
    const setIntervalFn = vi.fn();
    const clearIntervalFn = vi.fn();
    const cleanup = challengeScreen.startChallengeExpiryTicker({
      enabled: false,
      onTick,
      setIntervalFn,
      clearIntervalFn,
    });

    expect(onTick).not.toHaveBeenCalled();
    expect(setIntervalFn).not.toHaveBeenCalled();
    cleanup();
    expect(clearIntervalFn).not.toHaveBeenCalled();
  });
});
