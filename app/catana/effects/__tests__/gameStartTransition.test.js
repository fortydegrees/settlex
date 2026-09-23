import { describe, expect, it } from "vitest";

import {
  consumeGameStartTransition,
  markGameStartTransition,
  playGameStartTransition,
} from "../gameStartTransition.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

describe("game-start transitions", () => {
  it("consumes and emits at the audio boundary as one operation", () => {
    const storage = createStorage();
    const events = [];
    markGameStartTransition({ storage, matchID: "audio-duel", now: 1_000 });

    expect(
      playGameStartTransition({
        storage,
        matchID: "audio-duel",
        now: 1_500,
        audio: { unlock: () => events.push("unlock") },
        bus: { emit: (event) => events.push(event) },
      })
    ).toBe(true);
    expect(events).toEqual([
      "unlock",
      { type: "cue", payload: { name: "game:start" } },
    ]);

    expect(
      playGameStartTransition({
        storage,
        matchID: "audio-duel",
        now: 1_600,
        audio: { unlock: () => events.push("unlock-again") },
        bus: { emit: (event) => events.push(event) },
      })
    ).toBe(false);
    expect(events).toHaveLength(2);
  });

  it("is consumed once by the matching freshly loaded game", () => {
    const storage = createStorage();

    expect(
      markGameStartTransition({ storage, matchID: "fresh-duel", now: 1_000 })
    ).toBe(true);
    expect(
      consumeGameStartTransition({
        storage,
        matchID: "fresh-duel",
        now: 1_500,
      })
    ).toBe(true);
    expect(
      consumeGameStartTransition({
        storage,
        matchID: "fresh-duel",
        now: 1_600,
      })
    ).toBe(false);
  });

  it("does not play for a direct link, another match, or a stale transition", () => {
    const directStorage = createStorage();
    expect(
      consumeGameStartTransition({
        storage: directStorage,
        matchID: "direct-duel",
        now: 2_000,
      })
    ).toBe(false);

    const wrongMatchStorage = createStorage();
    markGameStartTransition({
      storage: wrongMatchStorage,
      matchID: "expected-duel",
      now: 2_000,
    });
    expect(
      consumeGameStartTransition({
        storage: wrongMatchStorage,
        matchID: "other-duel",
        now: 2_100,
      })
    ).toBe(false);

    const staleStorage = createStorage();
    markGameStartTransition({
      storage: staleStorage,
      matchID: "stale-duel",
      now: 2_000,
    });
    expect(
      consumeGameStartTransition({
        storage: staleStorage,
        matchID: "stale-duel",
        now: 123_000,
      })
    ).toBe(false);
  });
});
