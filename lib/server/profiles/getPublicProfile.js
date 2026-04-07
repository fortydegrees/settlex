import { getPool } from "../db/getPool.js";

const toInt = (value) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getPublicProfile = async (
  username,
  { pool = getPool(), recentMatchesLimit = 10 } = {}
) => {
  if (!username) {
    return null;
  }

  const accountResult = await pool.query(
    `
      SELECT
        id,
        current_username,
        avatar_emoji,
        avatar_color,
        created_at
      FROM accounts
      WHERE LOWER(current_username) = LOWER($1)
      LIMIT 1
    `,
    [username]
  );

  if (accountResult.rows.length === 0) {
    return null;
  }

  const account = accountResult.rows[0];

  const summaryResult = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total_games,
        COALESCE(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END), 0)::int AS wins,
        COALESCE(SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END), 0)::int AS losses
      FROM archived_match_players
      WHERE account_id = $1
    `,
    [account.id]
  );

  const recentMatchesResult = await pool.query(
    `
      SELECT
        am.id AS archived_match_id,
        am.replay_id,
        am.finished_at,
        am.game_name,
        am.player_count,
        amp.result
      FROM archived_match_players amp
      JOIN archived_matches am ON am.id = amp.archived_match_id
      WHERE amp.account_id = $1
      ORDER BY am.finished_at DESC
      LIMIT $2
    `,
    [account.id, recentMatchesLimit]
  );

  const summary = summaryResult.rows[0] ?? {};

  return {
    account: {
      id: account.id,
      currentUsername: account.current_username,
      avatarEmoji: account.avatar_emoji,
      avatarColor: account.avatar_color,
      createdAt: new Date(account.created_at).toISOString(),
    },
    summary: {
      totalGames: toInt(summary.total_games),
      wins: toInt(summary.wins),
      losses: toInt(summary.losses),
    },
    recentMatches: recentMatchesResult.rows.map((row) => ({
      archivedMatchId: row.archived_match_id,
      replayId: row.replay_id,
      finishedAt: new Date(row.finished_at).toISOString(),
      gameName: row.game_name,
      playerCount: toInt(row.player_count),
      result: row.result,
    })),
  };
};
