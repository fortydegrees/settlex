import { describe, expect, it, vi } from "vitest";
import { ACTIVE_MATCH_STORAGE_KEY } from "../utils/activeMatchStorage";
import { resolveReconnectBannerCandidate } from "../utils/reconnectBanner";

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

function seededStorageForMatch(matchID, playerID, playerName) {
  const storage = createMemoryStorage({
    [ACTIVE_MATCH_STORAGE_KEY]: JSON.stringify({
      matchID,
      playerID,
      playerName
    }),
    [`catana:lobby:credentials:${matchID}:${playerID}`]: "secret"
  });

  return storage;
}

function okJson(payload) {
  return {
    ok: true,
    async json() {
      return payload;
    }
  };
}

describe("resolveReconnectBannerCandidate", () => {
  it("returns null when no active match is saved", async () => {
    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage: createMemoryStorage(),
      fetchImpl: vi.fn()
    });

    expect(result).toBeNull();
  });

  it("returns null and clears stale state when the seat credentials key is missing", async () => {
    const storage = createMemoryStorage({
      [ACTIVE_MATCH_STORAGE_KEY]: JSON.stringify({
        matchID: "m1",
        playerID: "0"
      })
    });

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl: vi.fn()
    });

    expect(result).toBeNull();
    expect(storage.getItem(ACTIVE_MATCH_STORAGE_KEY)).toBeNull();
  });

  it("returns null on the active match page", async () => {
    const fetchImpl = vi.fn();
    const result = await resolveReconnectBannerCandidate({
      pathname: "/g/m1",
      storage: seededStorageForMatch("m1", "0"),
      fetchImpl
    });

    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns a banner candidate when storage and match validation succeed", async () => {
    const storage = seededStorageForMatch("m1", "0", "Alice");
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        matchID: "m1",
        players: [{ id: 0, name: "Alice" }, { id: 1, name: "Bren" }]
      })
    );

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl,
      lobbyBaseUrl: "http://localhost:8080"
    });

    expect(result).toEqual({
      matchID: "m1",
      playerID: "0",
      playerName: "Alice",
      href: "/g/m1"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8080/games/catan/m1",
      { cache: "no-store" }
    );
  });

  it("returns null and clears stale state when the lobby match is missing", async () => {
    const storage = seededStorageForMatch("m1", "0");
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl
    });

    expect(result).toBeNull();
    expect(storage.getItem(ACTIVE_MATCH_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears stale state when the retained live match has ended", async () => {
    const storage = seededStorageForMatch("m1", "0", "Alice");
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        matchID: "m1",
        players: [{ id: 0, name: "Alice" }, { id: 1, name: "Bren" }],
        gameover: { winner: "1" }
      })
    );

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl
    });

    expect(result).toBeNull();
    expect(storage.getItem(ACTIVE_MATCH_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears stale state when the saved seat no longer exists", async () => {
    const storage = seededStorageForMatch("m1", "0");
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        matchID: "m1",
        players: [{ id: 1, name: "Bren" }]
      })
    );

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl
    });

    expect(result).toBeNull();
    expect(storage.getItem(ACTIVE_MATCH_STORAGE_KEY)).toBeNull();
  });

  it("suppresses pending friend challenges until both seats are occupied", async () => {
    const storage = seededStorageForMatch("m1", "0", "Alice");
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        matchID: "m1",
        players: [{ id: 0, name: "Alice" }, { id: 1, name: "" }],
        metadata: {
          setupData: {
            matchKind: "friend_challenge",
            friendChallenge: {
              inviterSeatId: "0",
              expiresAt: "2099-04-09T08:05:00.000Z"
            }
          }
        }
      })
    );

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl
    });

    expect(result).toBeNull();
    expect(storage.getItem(ACTIVE_MATCH_STORAGE_KEY)).not.toBeNull();
  });

  it("suppresses the banner without clearing state on fetch errors", async () => {
    const storage = seededStorageForMatch("m1", "0");
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl
    });

    expect(result).toBeNull();
    expect(storage.getItem(ACTIVE_MATCH_STORAGE_KEY)).not.toBeNull();
  });
});
