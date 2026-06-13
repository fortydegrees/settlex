import { describe, expect, it } from "vitest";
import {
  getTimerRemainingMs,
  normalizeTimerSnapshot
} from "../utils/timerSnapshot";

describe("timerSnapshot", () => {
  it("normalizes server snapshots with local receipt time and server delay", () => {
    expect(
      normalizeTimerSnapshot(
        { kind: "stage", remainingMs: 10000 },
        900,
        1000
      )
    ).toEqual({
      kind: "stage",
      remainingMs: 10000,
      receivedAtMs: 1000,
      serverDelayMs: 100
    });
  });

  it("clamps negative server delay caused by clock skew", () => {
    expect(
      normalizeTimerSnapshot(
        { kind: "stage", remainingMs: 10000 },
        1200,
        1000
      )
    ).toMatchObject({
      serverDelayMs: 0
    });
  });

  it("returns null when no timer snapshot is available", () => {
    expect(normalizeTimerSnapshot(null, 900, 1000)).toBe(null);
  });

  it("computes visible remaining time and clamps elapsed snapshots to zero", () => {
    const snapshot = {
      remainingMs: 2000,
      receivedAtMs: 1000,
      serverDelayMs: 250
    };

    expect(getTimerRemainingMs(snapshot, 1500)).toBe(1250);
    expect(getTimerRemainingMs(snapshot, 4000)).toBe(0);
    expect(getTimerRemainingMs(null, 4000)).toBe(null);
  });
});
