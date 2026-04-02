import { describe, expect, it } from "vitest";
import {
  ACTIVE_MATCH_STORAGE_KEY,
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch,
  writeLastActiveMatch
} from "../utils/activeMatchStorage";

function createMemoryStorage(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));

  return {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      entries.set(key, String(value));
    },
    removeItem(key) {
      entries.delete(key);
    }
  };
}

describe("activeMatchStorage", () => {
  it("builds the seat credential key", () => {
    expect(
      getCredentialsStorageKey({ matchID: "abc", playerID: "1" })
    ).toBe("catana:lobby:credentials:abc:1");
  });

  it("round-trips the last active match record", () => {
    const storage = createMemoryStorage();

    writeLastActiveMatch(storage, {
      matchID: "abc",
      playerID: "1",
      playerName: "Alice",
      savedAtMs: 123
    });

    expect(readLastActiveMatch(storage)).toEqual({
      matchID: "abc",
      playerID: "1",
      playerName: "Alice",
      savedAtMs: 123
    });
  });

  it("fails closed on malformed JSON", () => {
    const storage = createMemoryStorage({
      [ACTIVE_MATCH_STORAGE_KEY]: "{bad json"
    });

    expect(readLastActiveMatch(storage)).toBeNull();
  });

  it("clears the saved active match", () => {
    const storage = createMemoryStorage();

    writeLastActiveMatch(storage, { matchID: "abc", playerID: "1" });
    clearLastActiveMatch(storage);

    expect(readLastActiveMatch(storage)).toBeNull();
  });
});
