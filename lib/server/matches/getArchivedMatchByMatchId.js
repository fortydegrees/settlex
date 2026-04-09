import { getPool } from "../db/getPool.js";

const toInt = (value) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
};

const mapParticipants = (rows = []) =>
  rows.map((participant) => ({
    seatId: participant.seat_id,
    participantType: participant.participant_type,
    accountId: participant.account_id,
    botKey: participant.bot_key,
    usernameSnapshot: participant.username_snapshot,
    avatarEmojiSnapshot: participant.avatar_emoji_snapshot,
    avatarColorSnapshot: participant.avatar_color_snapshot,
    result: participant.result,
  }));

const mapChatMessages = (rows = [], archivedMatchId) =>
  rows.map((row) => ({
    id: `${archivedMatchId}-chat-${row.message_seq}`,
    seq: toInt(row.message_seq),
    actorId: String(row.actor_id),
    message: row.message_text,
    createdAt: toIsoString(row.created_at),
  }));

export const getArchivedMatchByMatchId = async (
  matchID,
  { pool = getPool() } = {}
) => {
  if (!matchID) {
    return null;
  }

  const replayResult = await pool.query(
    `
      SELECT
        am.id AS archived_match_id,
        am.bgio_match_id,
        am.replay_id,
        am.game_name,
        am.started_at,
        am.finished_at,
        am.player_count,
        am.winner_account_id,
        am.winner_seat_id,
        ar.initial_state_json,
        ar.log_json,
        ar.final_state_json
      FROM archived_matches am
      JOIN archived_match_replays ar ON ar.archived_match_id = am.id
      WHERE am.bgio_match_id = $1
      LIMIT 1
    `,
    [matchID]
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
  const chatMessagesResult = await pool.query(
    `
      SELECT
        message_seq,
        actor_id,
        message_text,
        created_at
      FROM archived_match_chat_messages
      WHERE archived_match_id = $1
      ORDER BY message_seq ASC
    `,
    [row.archived_match_id]
  );

  return {
    match: {
      archivedMatchId: row.archived_match_id,
      bgioMatchId: row.bgio_match_id,
      replayId: row.replay_id,
      gameName: row.game_name,
      startedAt: toIsoString(row.started_at),
      finishedAt: toIsoString(row.finished_at),
      playerCount: toInt(row.player_count),
      winnerAccountId: row.winner_account_id,
      winnerSeatId: row.winner_seat_id,
    },
    participants: mapParticipants(participantsResult.rows),
    initialState: row.initial_state_json,
    finalState: row.final_state_json,
    log: Array.isArray(row.log_json) ? row.log_json : [],
    chatMessages: mapChatMessages(
      chatMessagesResult.rows,
      row.archived_match_id
    ),
  };
};
