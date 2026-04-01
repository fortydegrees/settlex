import { describe, expect, it } from "vitest";
import {
  getDisconnectRemainingMs,
  mergeVisibleLogEntries,
  readPresenceSnapshot
} from "../utils/disconnectPresence";

describe("disconnectPresence helpers", () => {
  it("annotates pushed presence with receipt timing", () => {
    const snapshot = readPresenceSnapshot(
      {
        activeDisconnectPlayerId: "1",
        deadlineAtMs: 66_000,
        remainingMs: 60_000,
        events: []
      },
      6_000,
      6_120
    );

    expect(snapshot).toMatchObject({
      activeDisconnectPlayerId: "1",
      deadlineAtMs: 66_000,
      remainingMs: 60_000,
      serverTimeMs: 6_000,
      receivedAtMs: 6_120,
      serverDelayMs: 120
    });
  });

  it("computes reconnect time remaining from deadline and receipt time", () => {
    const snapshot = readPresenceSnapshot(
      {
        activeDisconnectPlayerId: "1",
        deadlineAtMs: 66_000,
        remainingMs: 60_000,
        events: []
      },
      6_000,
      6_120
    );

    expect(getDisconnectRemainingMs(snapshot, 16_120)).toBe(49_880);
  });

  it("merges server presence events after the referenced game log sequence", () => {
    const merged = mergeVisibleLogEntries(
      [
        { id: 1, type: "roll", actorId: "0", data: { total: 7 } },
        { id: 2, type: "build:road", actorId: "0", data: { edgeId: "1,2" } }
      ],
      [
        {
          id: 7,
          type: "server:disconnect",
          playerId: "1",
          createdAtMs: 100,
          afterGameLogSeq: 1
        },
        {
          id: 8,
          type: "server:reconnect",
          playerId: "1",
          createdAtMs: 200,
          afterGameLogSeq: 2
        }
      ]
    );

    expect(merged.map((entry) => entry.type)).toEqual([
      "roll",
      "server:disconnect",
      "build:road",
      "server:reconnect"
    ]);
    expect(merged[1]).toMatchObject({
      id: "server-7",
      data: { playerId: "1" }
    });
    expect(merged[3]).toMatchObject({
      id: "server-8",
      data: { playerId: "1" }
    });
  });
});
