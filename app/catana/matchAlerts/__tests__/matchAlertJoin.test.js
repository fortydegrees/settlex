import { describe, expect, it, vi } from "vitest";

import {
  joinAlertMatch,
  resolveAlertMatch,
} from "../matchAlertJoin.js";
import {
  ACTIVE_MATCH_STORAGE_KEY,
  getCredentialsStorageKey,
} from "../../utils/activeMatchStorage.js";

const validWaitingMatch = {
  matchID: "match_1",
  gameName: "catan",
  metadata: {
    setupData: { modeId: "duel", isPrivate: false },
  },
  players: {
    0: {
      id: 0,
      name: "Zak",
      data: {
        participantType: "human",
        accountId: "acct_zak",
        usernameSnapshot: "Zak",
      },
    },
    1: { id: 1, name: "" },
  },
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  };
};

describe("resolveAlertMatch", () => {
  it("returns the live seeker and open seat for a public human duel", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(validWaitingMatch));

    await expect(
      resolveAlertMatch({ matchID: "match_1", fetchImpl })
    ).resolves.toEqual({
      status: "open",
      seekerName: "Zak",
      match: {
        ...validWaitingMatch,
        setupData: { modeId: "duel", isPrivate: false },
        players: [
          validWaitingMatch.players[0],
          validWaitingMatch.players[1],
        ],
        openSeat: validWaitingMatch.players[1],
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith("/api/matches/match_1", {
      cache: "no-store",
    });
  });

  it.each([404, 410])("treats a deleted table (%s) as stale", async (status) => {
    await expect(
      resolveAlertMatch({
        matchID: "match_1",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse({}, status)),
      })
    ).resolves.toEqual({ status: "stale", match: null, seekerName: null });
  });

  it.each([
    [
      "filled",
      {
        players: {
          0: validWaitingMatch.players[0],
          1: {
            id: 1,
            name: "Ada",
            data: { participantType: "human", accountId: "acct_ada" },
          },
        },
      },
    ],
    ["cancelled", { status: "cancelled" }],
    ["canceled", { canceled: true }],
    ["private", { metadata: { setupData: { modeId: "duel", isPrivate: true } } }],
    [
      "friend challenge",
      { metadata: { setupData: { modeId: "duel", matchKind: "friend_challenge" } } },
    ],
    [
      "bot",
      {
        players: {
          0: {
            id: 0,
            name: "Puffer",
            data: { participantType: "bot", bot: "puffer" },
          },
          1: validWaitingMatch.players[1],
        },
      },
    ],
    ["wrong mode", { metadata: { setupData: { modeId: "standard-3p" } } }],
    ["game over", { gameover: { winner: "0" } }],
    [
      "ownerless",
      {
        players: {
          0: { id: 0, name: "" },
          1: { id: 1, name: "" },
        },
      },
    ],
  ])("treats a %s table as stale", async (_label, overrides) => {
    const match = { ...validWaitingMatch, ...overrides };

    await expect(
      resolveAlertMatch({
        matchID: "match_1",
        fetchImpl: vi.fn().mockResolvedValue(jsonResponse(match)),
      })
    ).resolves.toEqual({ status: "stale", match: null, seekerName: null });
  });

  it.each([
    ["server failure", vi.fn().mockResolvedValue(jsonResponse({}, 500))],
    ["network failure", vi.fn().mockRejectedValue(new Error("offline"))],
  ])("returns error for a %s", async (_label, fetchImpl) => {
    await expect(
      resolveAlertMatch({ matchID: "match_1", fetchImpl })
    ).resolves.toEqual({ status: "error", match: null, seekerName: null });
  });
});

describe("joinAlertMatch", () => {
  it("re-checks, leaves Puffer with the stored credential, joins, and persists the new seat", async () => {
    const activeBotMatch = {
      matchID: "bot_1",
      playerID: "0",
      savedAtMs: 1,
    };
    const oldCredentialKey = getCredentialsStorageKey(activeBotMatch);
    const storage = createStorage({
      [ACTIVE_MATCH_STORAGE_KEY]: JSON.stringify(activeBotMatch),
      [oldCredentialKey]: "puffer-secret",
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(validWaitingMatch))
      .mockResolvedValueOnce(jsonResponse({ left: true }))
      .mockResolvedValueOnce(
        jsonResponse({ playerID: "1", playerCredentials: "joined-secret" })
      );

    await expect(
      joinAlertMatch({
        matchID: "match_1",
        currentGame: { matchID: "bot_1", opponentType: "bot" },
        storage,
        fetchImpl,
      })
    ).resolves.toEqual({
      status: "joined",
      matchID: "match_1",
      playerID: "1",
    });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "/api/matches/match_1",
      "/api/matches/leave",
      "/api/matches/join",
    ]);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      matchID: "bot_1",
      playerID: "0",
      credentials: "puffer-secret",
    });
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({
      matchID: "match_1",
      playerID: "1",
      participantType: "human",
    });
    expect(storage.removeItem).toHaveBeenCalledWith(oldCredentialKey);
    expect(storage.setItem).toHaveBeenCalledWith(
      getCredentialsStorageKey({ matchID: "match_1", playerID: "1" }),
      "joined-secret"
    );
    expect(JSON.parse(storage.setItem.mock.calls.at(-1)[1])).toMatchObject({
      matchID: "match_1",
      playerID: "1",
    });
  });

  it("stops before join when leaving the active Puffer match fails", async () => {
    const activeBotMatch = { matchID: "bot_1", playerID: "0", savedAtMs: 1 };
    const storage = createStorage({
      [ACTIVE_MATCH_STORAGE_KEY]: JSON.stringify(activeBotMatch),
      [getCredentialsStorageKey(activeBotMatch)]: "puffer-secret",
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(validWaitingMatch))
      .mockResolvedValueOnce(jsonResponse({ error: "leave failed" }, 500));

    await expect(
      joinAlertMatch({
        matchID: "match_1",
        currentGame: { matchID: "bot_1", opponentType: "bot" },
        storage,
        fetchImpl,
      })
    ).resolves.toEqual({ status: "error", matchID: null, playerID: null });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns stale when the final join loses a 409 race", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(validWaitingMatch))
      .mockResolvedValueOnce(jsonResponse({}, 409));

    await expect(
      joinAlertMatch({
        matchID: "match_1",
        storage: createStorage(),
        fetchImpl,
      })
    ).resolves.toEqual({ status: "stale", matchID: null, playerID: null });
  });

  it("continues to the credential-cookie-backed route if local storage throws", async () => {
    const storage = createStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error("storage disabled");
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(validWaitingMatch))
      .mockResolvedValueOnce(
        jsonResponse({ playerID: "1", playerCredentials: "joined-secret" })
      );

    await expect(
      joinAlertMatch({ matchID: "match_1", storage, fetchImpl })
    ).resolves.toEqual({
      status: "joined",
      matchID: "match_1",
      playerID: "1",
    });
  });
});
