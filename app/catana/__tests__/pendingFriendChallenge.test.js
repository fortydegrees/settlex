import { describe, expect, it, vi } from "vitest";
import {
  PENDING_FRIEND_CHALLENGE_STORAGE_KEY,
  clearPendingFriendChallenge,
  readPendingFriendChallenge,
  restorePendingFriendChallenge,
  writePendingFriendChallenge
} from "../utils/pendingFriendChallenge";

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

function okJson(payload) {
  return {
    ok: true,
    async json() {
      return payload;
    }
  };
}

describe("pendingFriendChallenge", () => {
  it("round-trips the saved pending friend challenge record", () => {
    const storage = createMemoryStorage();

    writePendingFriendChallenge(storage, {
      matchID: "m1",
      playerID: "0",
      savedAtMs: 123
    });

    expect(readPendingFriendChallenge(storage)).toEqual({
      matchID: "m1",
      playerID: "0",
      savedAtMs: 123
    });
  });

  it("clears the saved pending friend challenge record", () => {
    const storage = createMemoryStorage({
      [PENDING_FRIEND_CHALLENGE_STORAGE_KEY]: JSON.stringify({
        matchID: "m1",
        playerID: "0"
      })
    });

    clearPendingFriendChallenge(storage);

    expect(readPendingFriendChallenge(storage)).toBeNull();
  });

  it("returns null when there is no saved pending friend challenge", async () => {
    const result = await restorePendingFriendChallenge({
      storage: createMemoryStorage(),
      fetchImpl: vi.fn()
    });

    expect(result).toBeNull();
  });

  it("restores a pending friend challenge into waiting modal state", async () => {
    const storage = createMemoryStorage({
      [PENDING_FRIEND_CHALLENGE_STORAGE_KEY]: JSON.stringify({
        matchID: "m1",
        playerID: "0"
      }),
      "catana:lobby:credentials:m1:0": "secret"
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        status: "pending",
        matchID: "m1",
        expiresAt: "2099-04-23T10:05:00.000Z"
      })
    );

    const result = await restorePendingFriendChallenge({
      storage,
      fetchImpl
    });

    expect(result).toEqual({
      status: "pending",
      challengeState: {
        matchID: "m1",
        playerID: "0",
        challengeUrl: "/challenge/m1",
        expiresAt: "2099-04-23T10:05:00.000Z",
        playerCredentials: "secret",
        phase: "waiting"
      }
    });
    expect(fetchImpl).toHaveBeenCalledWith("/api/challenges/m1", undefined);
  });

  it("returns a live-game route and clears saved state when the challenge was accepted", async () => {
    const storage = createMemoryStorage({
      [PENDING_FRIEND_CHALLENGE_STORAGE_KEY]: JSON.stringify({
        matchID: "m1",
        playerID: "0"
      }),
      "catana:lobby:credentials:m1:0": "secret"
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        status: "accepted",
        matchID: "m1"
      })
    );

    const result = await restorePendingFriendChallenge({
      storage,
      fetchImpl
    });

    expect(result).toEqual({
      status: "accepted",
      href: "/g/m1?playerID=0"
    });
    expect(readPendingFriendChallenge(storage)).toBeNull();
  });

  it("clears expired saved state and requests cancel cleanup for the inviter seat", async () => {
    const storage = createMemoryStorage({
      [PENDING_FRIEND_CHALLENGE_STORAGE_KEY]: JSON.stringify({
        matchID: "m1",
        playerID: "0"
      }),
      "catana:lobby:credentials:m1:0": "secret"
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        okJson({
          status: "expired",
          matchID: "m1"
        })
      )
      .mockResolvedValueOnce(
        okJson({
          canceled: true
        })
      );

    const result = await restorePendingFriendChallenge({
      storage,
      fetchImpl
    });

    expect(result).toBeNull();
    expect(readPendingFriendChallenge(storage)).toBeNull();
    expect(fetchImpl).toHaveBeenNthCalledWith(1, "/api/challenges/m1", undefined);
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "/api/challenges/m1/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentials: "secret" })
    });
  });
});
