import { describe, expect, it } from "vitest";
import {
  classifyIncomingGameLogEntries,
  shouldDelayGameLogEntry
} from "../utils/gameLogPresentation";

describe("gameLogPresentation", () => {
  it("marks distribution resolution entries as delayable", () => {
    expect(shouldDelayGameLogEntry({ type: "resource:gain" })).toBe(true);
    expect(shouldDelayGameLogEntry({ type: "resource:shortage" })).toBe(true);
    expect(shouldDelayGameLogEntry({ type: "roll" })).toBe(false);
  });

  it("defers distribution-resolution entries during live animated play", () => {
    const result = classifyIncomingGameLogEntries({
      entries: [
        { id: 1, type: "roll" },
        { id: 2, type: "resource:gain" }
      ],
      lastSeenId: 0,
      canDelay: true,
      isBackfill: false
    });

    expect(result.visibleNow.map((entry) => entry.type)).toEqual(["roll"]);
    expect(result.deferred.map((entry) => entry.type)).toEqual(["resource:gain"]);
    expect(result.nextLastSeenId).toBe(2);
  });

  it("reveals delayable entries immediately when delay is disabled", () => {
    const result = classifyIncomingGameLogEntries({
      entries: [
        { id: 1, type: "roll" },
        { id: 2, type: "resource:gain" }
      ],
      lastSeenId: 0,
      canDelay: false,
      isBackfill: false
    });

    expect(result.visibleNow.map((entry) => entry.type)).toEqual([
      "roll",
      "resource:gain"
    ]);
    expect(result.deferred).toEqual([]);
  });

  it("reveals backlog entries immediately after reconnect", () => {
    const result = classifyIncomingGameLogEntries({
      entries: [
        { id: 1, type: "roll" },
        { id: 2, type: "resource:gain" }
      ],
      lastSeenId: 0,
      canDelay: true,
      isBackfill: true
    });

    expect(result.visibleNow.map((entry) => entry.type)).toEqual([
      "roll",
      "resource:gain"
    ]);
    expect(result.deferred).toEqual([]);
  });

  it("keeps later entries deferred while an earlier distribution cluster is pending", () => {
    const result = classifyIncomingGameLogEntries({
      entries: [
        { id: 3, type: "resource:shortage" },
        { id: 4, type: "turn:end" }
      ],
      lastSeenId: 2,
      canDelay: true,
      isBackfill: false,
      hasPendingDeferred: true
    });

    expect(result.visibleNow).toEqual([]);
    expect(result.deferred.map((entry) => entry.type)).toEqual([
      "resource:shortage",
      "turn:end"
    ]);
  });
});
