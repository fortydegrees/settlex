import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const archiveRoot = path.join(repoRoot, "server", "archive");

const modulePath = (filename) => path.join(archiveRoot, filename);

const loadModule = async (filename) => {
  const targetPath = modulePath(filename);
  expect(fs.existsSync(targetPath)).toBe(true);
  return import(`${pathToFileURL(targetPath).href}?t=${Date.now()}`);
};

const parseJsonbParam = (value) => {
  if (value == null) {
    return value;
  }

  expect(typeof value).toBe("string");
  return JSON.parse(value);
};

const createArchivePool = () => {
  const state = {
    archivedMatches: [],
    archivedMatchPlayers: [],
    archivedMatchReplays: [],
    archivedMatchChatMessages: [],
  };

  let transactionSnapshot = null;

  const snapshot = () => JSON.parse(JSON.stringify(state));
  const restore = () => {
    if (!transactionSnapshot) return;
    state.archivedMatches = transactionSnapshot.archivedMatches;
    state.archivedMatchPlayers = transactionSnapshot.archivedMatchPlayers;
    state.archivedMatchReplays = transactionSnapshot.archivedMatchReplays;
    state.archivedMatchChatMessages = transactionSnapshot.archivedMatchChatMessages;
    transactionSnapshot = null;
  };

  const client = {
    query: vi.fn(async (sql, params = []) => {
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized === "begin") {
        transactionSnapshot = snapshot();
        return { rows: [] };
      }

      if (normalized === "commit") {
        transactionSnapshot = null;
        return { rows: [] };
      }

      if (normalized === "rollback") {
        restore();
        return { rows: [] };
      }

      if (normalized.includes("select id from archived_matches where bgio_match_id = $1 limit 1")) {
        const existing = state.archivedMatches.find((entry) => entry.bgioMatchId === params[0]);
        return { rows: existing ? [{ id: existing.id }] : [] };
      }

      if (normalized.startsWith("insert into archived_matches")) {
        const row = {
          id: params[0],
          bgioMatchId: params[1],
          replayId: params[2],
          gameName: params[3],
          rulesetId: params[4],
          boardConfigId: params[5],
          startedAt: params[6],
          finishedAt: params[7],
          winnerAccountId: params[8],
          winnerSeatId: params[9],
          playerCount: params[10],
          summaryJson: parseJsonbParam(params[11]),
        };
        state.archivedMatches.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith("insert into archived_match_players")) {
        state.archivedMatchPlayers.push({
          archivedMatchId: params[0],
          seatId: params[1],
          participantType: params[2],
          accountId: params[3],
          botKey: params[4],
          usernameSnapshot: params[5],
          avatarEmojiSnapshot: params[6],
          avatarColorSnapshot: params[7],
          result: params[8],
        });
        return { rows: [] };
      }

      if (normalized.startsWith("insert into archived_match_replays")) {
        state.archivedMatchReplays.push({
          archivedMatchId: params[0],
          initialStateJson: parseJsonbParam(params[1]),
          logJson: parseJsonbParam(params[2]),
          finalStateJson: parseJsonbParam(params[3]),
          summaryJson: parseJsonbParam(params[4]),
        });
        return { rows: [] };
      }

      if (normalized.startsWith("insert into archived_match_chat_messages")) {
        state.archivedMatchChatMessages.push({
          archivedMatchId: params[0],
          messageSeq: params[1],
          actorId: params[2],
          messageText: params[3],
          createdAt: params[4],
        });
        return { rows: [] };
      }

      throw new Error(`Unhandled archive query: ${sql}`);
    }),
    release: vi.fn(),
  };

  return {
    state,
    client,
    pool: {
      connect: vi.fn(async () => client),
    },
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe("archive manager", () => {
  it("archives a finished match exactly once by bgio_match_id", async () => {
    const { ArchiveManager } = await loadModule("ArchiveManager.js");
    const archiveFinishedMatch = vi.fn().mockResolvedValue({ archived: true });
    const cleanupArchivedMatch = vi.fn().mockResolvedValue(undefined);
    const manager = new ArchiveManager({
      archiveFinishedMatch,
      cleanupArchivedMatch,
      graceMs: 10,
    });

    await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });
    await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });

    expect(archiveFinishedMatch).toHaveBeenCalledTimes(1);
    expect(archiveFinishedMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchID: "m1",
      })
    );
  });

  it("does not clean up the finished bgio match by default after archive succeeds", async () => {
    vi.useFakeTimers();

    const { ArchiveManager } = await loadModule("ArchiveManager.js");
    const archiveFinishedMatch = vi.fn().mockResolvedValue({ archived: true });
    const cleanupArchivedMatch = vi.fn().mockResolvedValue(undefined);
    const manager = new ArchiveManager({
      archiveFinishedMatch,
      cleanupArchivedMatch,
      graceMs: 10,
    });

    await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });
    vi.advanceTimersByTime(10);
    await Promise.resolve();

    expect(cleanupArchivedMatch).not.toHaveBeenCalled();
  });

  it("can explicitly clean up the finished bgio match after archive succeeds", async () => {
    vi.useFakeTimers();

    const { ArchiveManager } = await loadModule("ArchiveManager.js");
    const archiveFinishedMatch = vi.fn().mockResolvedValue({ archived: true });
    const cleanupArchivedMatch = vi.fn().mockResolvedValue(undefined);
    const manager = new ArchiveManager({
      archiveFinishedMatch,
      cleanupArchivedMatch,
      cleanupEnabled: true,
      graceMs: 10,
    });

    await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });
    vi.advanceTimersByTime(9);
    expect(cleanupArchivedMatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(cleanupArchivedMatch).toHaveBeenCalledTimes(1);
    expect(cleanupArchivedMatch).toHaveBeenCalledWith({ matchID: "m1" });
  });

  it("deleteMatch clears pending cleanup timers and match metadata", async () => {
    vi.useFakeTimers();

    const { ArchiveManager } = await loadModule("ArchiveManager.js");
    const archiveFinishedMatch = vi.fn().mockResolvedValue({ archived: true });
    const cleanupArchivedMatch = vi.fn().mockResolvedValue(undefined);
    const manager = new ArchiveManager({
      archiveFinishedMatch,
      cleanupArchivedMatch,
      cleanupEnabled: true,
      graceMs: 10,
    });

    manager.onMatchData("m1", [{ id: "0", name: "Ada" }]);
    await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });

    manager.deleteMatch("m1");
    await vi.advanceTimersByTimeAsync(10);

    expect(cleanupArchivedMatch).not.toHaveBeenCalled();
    expect(manager.cleanupTimers.has("m1")).toBe(false);
    expect(manager.archivedMatchIDs.has("m1")).toBe(false);
    expect(manager.matchDataByMatch.has("m1")).toBe(false);
  });
});

describe("archiveFinishedMatch", () => {
  it("writes archived match, participant, and replay rows and no-ops on duplicate bgio_match_id", async () => {
    const { archiveFinishedMatch } = await loadModule("archiveFinishedMatch.js");
    const { pool, state } = createArchivePool();
    const serverDb = {
      fetch: vi.fn().mockResolvedValue({
        metadata: {
          gameName: "catan",
          createdAt: 1712500000000,
          updatedAt: 1712500030000,
          players: {
            "0": {
              id: 0,
              name: "Ada",
              data: {
                participantType: "human",
                accountId: "acct_1",
                usernameSnapshot: "Ada",
                avatarSnapshot: {
                  emoji: "🤠",
                  color: "sky",
                },
              },
            },
            "1": {
              id: 1,
              name: "[BOT] Puffer 2",
              data: {
                participantType: "bot",
                botKey: "puffer",
                usernameSnapshot: "[BOT] Puffer 2",
                avatarSnapshot: {
                  emoji: "🤖",
                  color: "sky",
                },
              },
            },
          },
        },
        initialState: {
          G: { setup: true },
          ctx: { phase: "preGame" },
        },
        state: {
          G: { complete: true },
          ctx: {
            phase: "gameOver",
            gameover: { winner: "0" },
          },
        },
        log: [{ action: { type: "MAKE_MOVE" } }],
      }),
    };

    const first = await archiveFinishedMatch({
      pool,
      serverDb,
      matchID: "m1",
      chatMessages: [
        {
          id: "chat_1",
          seq: 1,
          actorId: "0",
          messageText: "gg",
          createdAt: "2026-04-08T13:10:00.000Z",
        },
      ],
    });
    const second = await archiveFinishedMatch({
      pool,
      serverDb,
      matchID: "m1",
      chatMessages: [
        {
          id: "chat_1",
          seq: 1,
          actorId: "0",
          messageText: "gg",
          createdAt: "2026-04-08T13:10:00.000Z",
        },
      ],
    });

    expect(first.archived).toBe(true);
    expect(second.archived).toBe(false);
    expect(state.archivedMatches).toHaveLength(1);
    expect(state.archivedMatchPlayers).toHaveLength(2);
    expect(state.archivedMatchReplays).toHaveLength(1);
    expect(state.archivedMatchChatMessages).toEqual([
      {
        archivedMatchId: state.archivedMatches[0].id,
        messageSeq: 1,
        actorId: "0",
        messageText: "gg",
        createdAt: "2026-04-08T13:10:00.000Z",
      },
    ]);
    expect(state.archivedMatchPlayers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          participantType: "human",
          accountId: "acct_1",
          usernameSnapshot: "Ada",
          result: "win",
        }),
        expect.objectContaining({
          participantType: "bot",
          botKey: "puffer",
          usernameSnapshot: "[BOT] Puffer 2",
          result: "loss",
        }),
      ])
    );
    expect(state.archivedMatchReplays[0]).toMatchObject({
      initialStateJson: { G: { setup: true }, ctx: { phase: "preGame" } },
      finalStateJson: {
        G: { complete: true },
        ctx: { phase: "gameOver", gameover: { winner: "0" } },
      },
      logJson: [{ action: { type: "MAKE_MOVE" } }],
    });
  });
});
