import { describe, expect, it } from "vitest";
import {
  formatTimer,
  getLowTimerAlertState,
  getTimerSeconds,
} from "../components/useLocalPlayerDockModel";

describe("useLocalPlayerDockModel helpers", () => {
  it("formats countdown timers for HUD surfaces", () => {
    expect(formatTimer(null)).toBeNull();
    expect(formatTimer(85_900)).toBe("1:25");
    expect(formatTimer(5_000)).toBe("0:05");
    expect(formatTimer(-500)).toBe("0:00");
  });

  it("normalizes remaining timer seconds", () => {
    expect(getTimerSeconds(null)).toBe(Number.POSITIVE_INFINITY);
    expect(getTimerSeconds(5_999)).toBe(5);
    expect(getTimerSeconds(-1)).toBe(0);
  });

  it("suppresses low timer alert for roll-waiting statuses", () => {
    expect(
      getLowTimerAlertState({
        timerMs: 4_900,
        statusType: "rolling",
        gameStatus: { kind: "playing" },
      })
    ).toEqual({ showStatusTimer: true, isLowTimerAlertActive: false });

    expect(
      getLowTimerAlertState({
        timerMs: 4_900,
        statusType: "playing",
        gameStatus: { kind: "waiting_for_roll" },
      })
    ).toEqual({ showStatusTimer: true, isLowTimerAlertActive: false });
  });

  it("marks low active timers when the alert is not suppressed", () => {
    expect(
      getLowTimerAlertState({
        timerMs: 4_900,
        statusType: "playing",
        gameStatus: { kind: "playing" },
      })
    ).toEqual({ showStatusTimer: true, isLowTimerAlertActive: true });
  });
});
