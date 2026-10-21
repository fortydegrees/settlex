import { describe, expect, it, vi } from "vitest";
import {
  LIVE_TURN_TIMER_INTERVAL_MS,
  formatTimer,
  getLiveTurnTimerPresentation,
  getTimerSeconds,
  startLiveTurnTimerTicker,
} from "../components/LiveTurnTimer";

const timerSnapshot = {
  kind: "turn",
  remainingMs: 6_000,
  receivedAtMs: 1_000,
  serverDelayMs: 0,
};

describe("LiveTurnTimer", () => {
  it("preserves HUD timer formatting", () => {
    expect(formatTimer(null)).toBeNull();
    expect(formatTimer(85_900)).toBe("1:25");
    expect(formatTimer(5_000)).toBe("0:05");
    expect(formatTimer(-500)).toBe("0:00");
    expect(getTimerSeconds(null)).toBe(Number.POSITIVE_INFINITY);
    expect(getTimerSeconds(5_999)).toBe(5);
    expect(getTimerSeconds(-1)).toBe(0);
  });

  it("derives visible low-time presentation", () => {
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: true,
        statusType: "playing",
        statusKind: "your_turn",
      })
    ).toEqual({
      timerMs: 5_900,
      timerText: "0:05",
      showStatusTimer: true,
      isLowTimerAlertActive: true,
    });
  });

  it("preserves suppression and hidden behaviour", () => {
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: true,
        statusType: "rolling",
        statusKind: "your_turn",
      }).isLowTimerAlertActive
    ).toBe(false);
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: true,
        statusType: "playing",
        statusKind: "waiting_for_roll",
      }).isLowTimerAlertActive
    ).toBe(false);
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: false,
        statusType: "playing",
        statusKind: "your_turn",
      })
    ).toEqual({
      timerMs: null,
      timerText: null,
      showStatusTimer: false,
      isLowTimerAlertActive: false,
    });
  });

  it("starts one 250ms ticker and cleans it up", () => {
    const onTick = vi.fn();
    const setIntervalFn = vi.fn(() => 41);
    const clearIntervalFn = vi.fn();
    const nowFn = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_250);

    const cleanup = startLiveTurnTimerTicker({
      enabled: true,
      onTick,
      nowFn,
      setIntervalFn,
      clearIntervalFn,
    });

    expect(onTick).toHaveBeenCalledWith(1_000);
    expect(setIntervalFn).toHaveBeenCalledWith(
      expect.any(Function),
      LIVE_TURN_TIMER_INTERVAL_MS
    );
    setIntervalFn.mock.calls[0][0]();
    expect(onTick).toHaveBeenLastCalledWith(1_250);
    cleanup();
    expect(clearIntervalFn).toHaveBeenCalledWith(41);
  });

  it("does not tick while disabled", () => {
    const onTick = vi.fn();
    const setIntervalFn = vi.fn();
    const clearIntervalFn = vi.fn();
    const cleanup = startLiveTurnTimerTicker({
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
