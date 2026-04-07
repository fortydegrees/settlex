import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const modulePath = path.join(repoRoot, "lib", "server", "profiles", "getPublicProfile.js");

const loadGetPublicProfile = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href;
  const importedModule = await import(`${href}?t=${Date.now()}`);
  return importedModule.getPublicProfile;
};

const createProfilePool = () => {
  const accountRow = {
    id: "acct_ada",
    current_username: "Ada",
    avatar_emoji: "🤠",
    avatar_color: "sky",
    created_at: "2026-04-01T12:00:00.000Z",
  };
  const summaryRow = {
    total_games: 3,
    wins: 2,
    losses: 1,
  };
  const recentRows = [
    {
      archived_match_id: "arch_3",
      replay_id: "rpl_3",
      finished_at: "2026-04-07T18:00:00.000Z",
      game_name: "catan",
      player_count: 4,
      result: "win",
    },
    {
      archived_match_id: "arch_2",
      replay_id: "rpl_2",
      finished_at: "2026-04-06T18:00:00.000Z",
      game_name: "catan",
      player_count: 3,
      result: "loss",
    },
  ];

  return {
    async query(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

      if (normalizedSql.includes("from accounts")) {
        expect(params).toEqual(["Ada"]);
        return { rows: [accountRow] };
      }

      if (normalizedSql.includes("count(*)::int as total_games")) {
        expect(params).toEqual(["acct_ada"]);
        return { rows: [summaryRow] };
      }

      if (normalizedSql.includes("from archived_match_players amp join archived_matches am")) {
        expect(params).toEqual(["acct_ada", 10]);
        return { rows: recentRows };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
};

describe("getPublicProfile", () => {
  it("returns current identity, summary counts, and recent matches", async () => {
    const getPublicProfile = await loadGetPublicProfile();
    const profile = await getPublicProfile("Ada", {
      pool: createProfilePool(),
    });

    expect(profile.account).toMatchObject({
      id: "acct_ada",
      currentUsername: "Ada",
      avatarEmoji: "🤠",
      avatarColor: "sky",
      createdAt: "2026-04-01T12:00:00.000Z",
    });
    expect(profile.summary).toMatchObject({
      totalGames: 3,
      wins: 2,
      losses: 1,
    });
    expect(profile.recentMatches).toHaveLength(2);
    expect(profile.recentMatches[0]).toMatchObject({
      archivedMatchId: "arch_3",
      replayId: "rpl_3",
      result: "win",
    });
  });
});
