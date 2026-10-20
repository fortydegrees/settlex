import { getPool } from "../db/getPool.js";

export const getArchivedNotation = async (replayId, { pool = getPool() } = {}) => {
  if (!replayId) return null;
  const result = await pool.query(`
    SELECT ar.notation_json, ar.notation_status, ar.notation_error_code
    FROM archived_matches am
    JOIN archived_match_replays ar ON ar.archived_match_id = am.id
    WHERE am.replay_id = $1
    LIMIT 1
  `, [replayId]);
  const row = result.rows[0];
  if (!row) return null;
  if (row.notation_status === "ready") return { status: "ready", record: row.notation_json };
  if (row.notation_status === "unavailable") return { status: "unavailable", errorCode: row.notation_error_code };
  return { status: "not-recorded" };
};
