import { randomUUID } from "node:crypto";
import { getPool } from "../../lib/server/db/getPool.js";

const toJsonbParam = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value);
};

const toParticipantRows = (metadataPlayers, winnerSeatId) => {
  const players = Array.isArray(metadataPlayers)
    ? metadataPlayers
    : Object.values(metadataPlayers ?? {});

  return players
    .filter(Boolean)
    .map((player) => {
      const participantType =
        player?.data?.participantType ??
        (player?.data?.isBot ? "bot" : "human");
      const seatId = String(player?.id ?? "");
      const avatarSnapshot = player?.data?.avatarSnapshot ?? {};

      return {
        seatId,
        participantType,
        accountId:
          participantType === "human" ? player?.data?.accountId ?? null : null,
        botKey: participantType === "bot" ? player?.data?.botKey ?? player?.data?.bot ?? null : null,
        usernameSnapshot:
          player?.data?.usernameSnapshot ??
          player?.name ??
          `Player ${seatId}`,
        avatarEmojiSnapshot:
          avatarSnapshot.emoji ?? player?.data?.emoji ?? null,
        avatarColorSnapshot:
          avatarSnapshot.color ?? player?.data?.color ?? null,
        result:
          winnerSeatId == null
            ? null
            : seatId === String(winnerSeatId)
            ? "win"
            : "loss",
      };
    });
};

export const archiveFinishedMatch = async ({
  pool = getPool(),
  serverDb,
  matchID,
  chatMessages = [],
} = {}) => {
  if (!serverDb?.fetch) {
    throw new Error("A live boardgame.io DB is required to archive finished matches");
  }

  if (!matchID) {
    throw new Error("matchID is required");
  }

  const liveRecord = await serverDb.fetch(matchID, {
    metadata: true,
    initialState: true,
    state: true,
    log: true,
  });

  if (!liveRecord?.metadata || !liveRecord?.state) {
    throw new Error(`Match ${matchID} is missing live metadata/state`);
  }

  const metadataPlayers = liveRecord.metadata.players ?? {};
  const winnerSeatId = liveRecord.state?.ctx?.gameover?.winner ?? null;
  const participantRows = toParticipantRows(metadataPlayers, winnerSeatId);
  const winnerParticipant =
    winnerSeatId == null
      ? null
      : participantRows.find((participant) => participant.seatId === String(winnerSeatId)) ?? null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingArchive = await client.query(
      "SELECT id FROM archived_matches WHERE bgio_match_id = $1 LIMIT 1",
      [matchID]
    );

    if (existingArchive.rows.length > 0) {
      await client.query("COMMIT");
      return {
        archived: false,
        archivedMatchId: existingArchive.rows[0].id,
      };
    }

    const archivedMatchId = randomUUID();
    const replayId = randomUUID();
    const startedAt = liveRecord.metadata.createdAt
      ? new Date(liveRecord.metadata.createdAt).toISOString()
      : null;
    const finishedAt = liveRecord.metadata.updatedAt
      ? new Date(liveRecord.metadata.updatedAt).toISOString()
      : new Date().toISOString();
    const summaryJson = {
      matchID,
      finished: true,
    };

    await client.query(
      `
        INSERT INTO archived_matches (
          id,
          bgio_match_id,
          replay_id,
          game_name,
          ruleset_id,
          board_config_id,
          started_at,
          finished_at,
          winner_account_id,
          winner_seat_id,
          player_count,
          summary_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        archivedMatchId,
        matchID,
        replayId,
        liveRecord.metadata.gameName ?? "catan",
        liveRecord.metadata.setupData?.rulesetId ?? null,
        liveRecord.metadata.setupData?.boardConfigId ?? null,
        startedAt,
        finishedAt,
        winnerParticipant?.accountId ?? null,
        winnerSeatId == null ? null : String(winnerSeatId),
        participantRows.length,
        toJsonbParam(summaryJson),
      ]
    );

    for (const participant of participantRows) {
      await client.query(
        `
          INSERT INTO archived_match_players (
            archived_match_id,
            seat_id,
            participant_type,
            account_id,
            bot_key,
            username_snapshot,
            avatar_emoji_snapshot,
            avatar_color_snapshot,
            result
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          archivedMatchId,
          participant.seatId,
          participant.participantType,
          participant.accountId,
          participant.botKey,
          participant.usernameSnapshot,
          participant.avatarEmojiSnapshot,
          participant.avatarColorSnapshot,
          participant.result,
        ]
      );
    }

    await client.query(
      `
        INSERT INTO archived_match_replays (
          archived_match_id,
          initial_state_json,
          log_json,
          final_state_json,
          summary_json
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        archivedMatchId,
        toJsonbParam(liveRecord.initialState ?? null),
        toJsonbParam(liveRecord.log ?? []),
        toJsonbParam(liveRecord.state),
        toJsonbParam(summaryJson),
      ]
    );

    for (const chatMessage of chatMessages) {
      await client.query(
        `
          INSERT INTO archived_match_chat_messages (
            archived_match_id,
            message_seq,
            actor_id,
            message_text,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          archivedMatchId,
          chatMessage.seq,
          chatMessage.actorId,
          chatMessage.messageText,
          chatMessage.createdAt,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      archived: true,
      archivedMatchId,
      replayId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
