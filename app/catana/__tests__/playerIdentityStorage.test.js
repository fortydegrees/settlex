import { describe, expect, it } from "vitest";
import {
  buildSuggestedGuestIdentity,
  readStoredPlayerIdentity,
  writeStoredPlayerIdentity,
} from "../lobby/playerIdentityStorage";

const createStorage = () => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
};

describe("playerIdentityStorage", () => {
  it("builds a suggested guest identity from deterministic generators", () => {
    expect(
      buildSuggestedGuestIdentity({
        randomInt: () => 4821,
        pickEmoji: () => "🥳",
        pickColor: () => "white",
      })
    ).toEqual({
      name: "Guest 4821",
      emoji: "🥳",
      color: "white",
    });
  });

  it("reads and writes stored identity values with normalized colors", () => {
    const storage = createStorage();

    writeStoredPlayerIdentity(storage, {
      name: "Ada",
      emoji: "🤠",
      color: "blue",
    });

    expect(readStoredPlayerIdentity(storage)).toEqual({
      name: "Ada",
      emoji: "🤠",
      color: "sky",
    });
  });
});
