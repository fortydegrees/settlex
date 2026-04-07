import { getPool } from "../db/getPool.js";

const toInt = (value) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getArchivedReplay = async (
  replayId,
  { pool = getPool() } = {}
) => {
  if (!replayId) {
    return null;
  }

  const replayResult = await pool.query(
    `
      SELECT
        am.id AS archived_match_id,
        am.bgio_match_id,
        am.replay_id,
        am.game_name,
        am.finished_at,
        am.player_count,
        am.winner_account_id,
        am.winner_seat_id,
        ar.initial_state_json,
        ar.log_json,
        ar.final_state_json
      FROM archived_matches am
      JOIN archived_match_replays ar ON ar.archived_match_id = am.id
      WHERE am.replay_id = $1
      LIMIT 1
    `,
    [replayId]
  );

  if (replayResult.rows.length === 0) {
    return null;
  }

  const row = replayResult.rows[0];
  const participantsResult = await pool.query(
    `
      SELECT
        seat_id,
        participant_type,
        account_id,
        bot_key,
        username_snapshot,
        avatar_emoji_snapshot,
        avatar_color_snapshot,
        result
      FROM archived_match_players
      WHERE archived_match_id = $1
      ORDER BY seat_id ASC
    `,
    [row.archived_match_id]
  );

  return {
    match: {
      archivedMatchId: row.archived_match_id,
      bgioMatchId: row.bgio_match_id,
      replayId: row.replay_id,
      gameName: row.game_name,
      finishedAt: new Date(row.finished_at).toISOString(),
      playerCount: toInt(row.player_count),
      winnerAccountId: row.winner_account_id,
      winnerSeatId: row.winner_seat_id,
    },
    participants: participantsResult.rows.map((participant) => ({
      seatId: participant.seat_id,
      participantType: participant.participant_type,
      accountId: participant.account_id,
      botKey: participant.bot_key,
      usernameSnapshot: participant.username_snapshot,
      avatarEmojiSnapshot: participant.avatar_emoji_snapshot,
      avatarColorSnapshot: participant.avatar_color_snapshot,
      result: participant.result,
    })),
    initialState: row.initial_state_json,
    finalState: row.final_state_json,
    log: Array.isArray(row.log_json) ? row.log_json : [],
  };
};
