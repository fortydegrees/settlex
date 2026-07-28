import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createArchivePool } from "./helpers/archiveTestUtils.js";

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

  it("does not reject when archiving fails, and retries on a later publish", async () => {
    const { ArchiveManager } = await loadModule("ArchiveManager.js");
    const archiveFinishedMatch = vi
      .fn()
      .mockRejectedValueOnce(new Error("db down"));
    const logger = { error: vi.fn() };
    const manager = new ArchiveManager({
      archiveFinishedMatch,
      cleanupArchivedMatch: vi.fn(),
      graceMs: 10,
      logger,
    });

    await expect(
      manager.onState("m1", { ctx: { gameover: { winner: "0" } } })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(manager.archivedMatchIDs.has("m1")).toBe(false);

    archiveFinishedMatch.mockResolvedValueOnce({ archived: true });
    await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });

    expect(archiveFinishedMatch).toHaveBeenCalledTimes(2);
    expect(manager.archivedMatchIDs.has("m1")).toBe(true);
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
          G: {
            rulesetId: "duel",
            boardSourceId: "duel-fair-official-v1",
            boardConfigId: "standard-official-spiral",
            boardProvenance: {
              sourceKind: "catalog",
              catalogId: "duel-fair-official-v1",
              catalogRank: 37,
              seed: 12345,
              generatorFamily: "official-spiral",
              generatorVersion: "official-spiral-v1",
              evaluatorVersion: "duel-fair-v3",
            },
          },
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
    expect(state.archivedMatches[0]).toMatchObject({
      rulesetId: "duel",
      boardSourceId: "duel-fair-official-v1",
      boardConfigId: "standard-official-spiral",
      boardProvenanceJson: {
        sourceKind: "catalog",
        catalogId: "duel-fair-official-v1",
        catalogRank: 37,
        seed: 12345,
      },
    });
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
      initialStateJson: {
        G: {
          rulesetId: "duel",
          boardSourceId: "duel-fair-official-v1",
          boardConfigId: "standard-official-spiral",
          boardProvenance: {
            sourceKind: "catalog",
            catalogId: "duel-fair-official-v1",
            catalogRank: 37,
            seed: 12345,
            generatorFamily: "official-spiral",
            generatorVersion: "official-spiral-v1",
            evaluatorVersion: "duel-fair-v3",
          },
        },
        ctx: { phase: "preGame" },
      },
      finalStateJson: {
        G: { complete: true },
        ctx: { phase: "gameOver", gameover: { winner: "0" } },
      },
      logJson: [{ action: { type: "MAKE_MOVE" } }],
    });
  });

  it("uses legacy setup metadata while leaving source and provenance null", async () => {
    const { archiveFinishedMatch } = await loadModule("archiveFinishedMatch.js");
    const { pool, state } = createArchivePool();
    const serverDb = {
      fetch: vi.fn().mockResolvedValue({
        metadata: {
          gameName: "catan",
          setupData: {
            rulesetId: "standard",
            boardConfigId: "standard-random"
          },
          players: {}
        },
        initialState: { G: {}, ctx: { phase: "preGame" } },
        state: { G: {}, ctx: { gameover: {} } },
        log: []
      })
    };

    await archiveFinishedMatch({ pool, serverDb, matchID: "legacy-1" });

    expect(state.archivedMatches[0]).toMatchObject({
      rulesetId: "standard",
      boardSourceId: null,
      boardConfigId: "standard-random",
      boardProvenanceJson: null
    });
  });

  it("rolls back the archive insert when a later transaction step fails", async () => {
    const { archiveFinishedMatch } = await loadModule("archiveFinishedMatch.js");
    const { pool, client, state } = createArchivePool({
      failAfterArchivedMatchInsert: true
    });
    const serverDb = {
      fetch: vi.fn().mockResolvedValue({
        metadata: { gameName: "catan", players: {} },
        initialState: { G: {}, ctx: {} },
        state: { G: {}, ctx: { gameover: {} } },
        log: []
      })
    };

    await expect(
      archiveFinishedMatch({ pool, serverDb, matchID: "rollback-1" })
    ).rejects.toThrow("injected failure after archived match insert");

    expect(state.archivedMatches).toEqual([]);
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
