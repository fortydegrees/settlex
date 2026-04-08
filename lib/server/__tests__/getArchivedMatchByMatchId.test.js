import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const matchesRoot = path.join(repoRoot, "lib", "server", "matches");
const replaysRoot = path.join(repoRoot, "lib", "server", "replays");

const loadModule = async (root, filename, exportName) => {
  const modulePath = path.join(root, filename);
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href;
  const importedModule = await import(`${href}?t=${Date.now()}`);
  return importedModule[exportName];
};

const createArchiveLookupPool = () => {
  const matchRow = {
    archived_match_id: "arch_1",
    bgio_match_id: "match_1",
    replay_id: "rpl_1",
    game_name: "catan",
    finished_at: "2026-04-08T13:15:00.000Z",
    player_count: 2,
    winner_account_id: "acct_1",
    winner_seat_id: "0",
    initial_state_json: {
      G: { turn: 0 },
      ctx: { gameover: null },
    },
    log_json: [{ action: { type: "MAKE_MOVE" } }],
    final_state_json: {
      G: { turn: 1 },
      ctx: { gameover: { winner: "0" } },
    },
  };
  const participantRows = [
    {
      seat_id: "0",
      participant_type: "human",
      account_id: "acct_1",
      bot_key: null,
      username_snapshot: "Ada",
      avatar_emoji_snapshot: "🤠",
      avatar_color_snapshot: "sky",
      result: "win",
    },
    {
      seat_id: "1",
      participant_type: "bot",
      account_id: null,
      bot_key: "puffer",
      username_snapshot: "[BOT] Puffer 2",
      avatar_emoji_snapshot: "🤖",
      avatar_color_snapshot: "slate",
      result: "loss",
    },
  ];
  const chatRows = [
    {
      message_seq: 1,
      actor_id: "0",
      message_text: "gg",
      created_at: "2026-04-08T13:10:00.000Z",
    },
  ];

  return {
    async query(sql, params) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (
        normalizedSql.includes("from archived_matches am") &&
        normalizedSql.includes("where am.bgio_match_id = $1")
      ) {
        expect(params).toEqual(["match_1"]);
        return { rows: [matchRow] };
      }

      if (
        normalizedSql.includes("from archived_matches am") &&
        normalizedSql.includes("where am.replay_id = $1")
      ) {
        expect(params).toEqual(["rpl_1"]);
        return { rows: [matchRow] };
      }

      if (
        normalizedSql.includes("from archived_match_players") &&
        normalizedSql.includes("where archived_match_id = $1")
      ) {
        expect(params).toEqual(["arch_1"]);
        return { rows: participantRows };
      }

      if (
        normalizedSql.includes("from archived_match_chat_messages") &&
        normalizedSql.includes("where archived_match_id = $1")
      ) {
        expect(params).toEqual(["arch_1"]);
        return { rows: chatRows };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
};

describe("getArchivedMatchByMatchId", () => {
  it("returns archived match state, participants, and chat rows for a bgio match id", async () => {
    const getArchivedMatchByMatchId = await loadModule(
      matchesRoot,
      "getArchivedMatchByMatchId.js",
      "getArchivedMatchByMatchId"
    );

    const result = await getArchivedMatchByMatchId("match_1", {
      pool: createArchiveLookupPool(),
    });

    expect(result.match).toMatchObject({
      archivedMatchId: "arch_1",
      bgioMatchId: "match_1",
      replayId: "rpl_1",
      gameName: "catan",
      playerCount: 2,
      winnerAccountId: "acct_1",
      winnerSeatId: "0",
    });
    expect(result.participants).toHaveLength(2);
    expect(result.chatMessages).toEqual([
      expect.objectContaining({
        seq: 1,
        actorId: "0",
        message: "gg",
      }),
    ]);
  });
});

describe("getArchivedReplay", () => {
  it("includes archived chat rows alongside replay data", async () => {
    const getArchivedReplay = await loadModule(
      replaysRoot,
      "getArchivedReplay.js",
      "getArchivedReplay"
    );

    const result = await getArchivedReplay("rpl_1", {
      pool: createArchiveLookupPool(),
    });

    expect(result.match).toMatchObject({
      archivedMatchId: "arch_1",
      replayId: "rpl_1",
    });
    expect(result.chatMessages).toEqual([
      expect.objectContaining({
        seq: 1,
        actorId: "0",
        message: "gg",
      }),
    ]);
  });
});
