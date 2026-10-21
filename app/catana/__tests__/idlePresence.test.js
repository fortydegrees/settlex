import { describe, expect, it } from "vitest";
import {
  getActiveIdleStateByPlayerId,
  getIdleRemainingMs,
  readIdlePresenceSnapshot
} from "../utils/idlePresence";

describe("idlePresence", () => {
  it("annotates snapshots with receive timing", () => {
    const snapshot = readIdlePresenceSnapshot(
      {
        activeIdlePlayerId: "1",
        remainingMs: 60_000
      },
      1_000,
      1_180
    );

    expect(snapshot).toMatchObject({
      activeIdlePlayerId: "1",
      serverTimeMs: 1_000,
      receivedAtMs: 1_180,
      serverDelayMs: 180
    });
  });

  it("computes remaining idle time from the deadline and receipt delay", () => {
    const snapshot = readIdlePresenceSnapshot(
      {
        activeIdlePlayerId: "1",
        deadlineAtMs: 11_000
      },
      1_000,
      1_150
    );

    expect(getIdleRemainingMs(snapshot, 2_150)).toBe(8_850);
  });

  it("only exposes active idle state while the grace window is still live", () => {
    const snapshot = readIdlePresenceSnapshot(
      {
        activeIdlePlayerId: "1",
        remainingMs: 5_000
      },
      2_000,
      2_100
    );

    expect(getActiveIdleStateByPlayerId(snapshot, 3_100)).toEqual({
      "1": {
        status: "idle",
        remainingMs: 3_900
      }
    });
    expect(getActiveIdleStateByPlayerId(snapshot, 8_500)).toEqual({});
  });
});
