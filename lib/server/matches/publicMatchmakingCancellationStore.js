import { getPool } from "../db/getPool.js";

const TOMBSTONE_LIFETIME = "1 day";

export const recordPublicMatchmakingCancellation = async ({
  accountId,
  modeId,
  requestId,
  pool = getPool(),
} = {}) => {
  await pool.query(
    `
      WITH expired AS (
        DELETE FROM public_matchmaking_cancellations
        WHERE account_id = $1
          AND mode_id = $2
          AND cancelled_at < NOW() - $4::interval
      )
      INSERT INTO public_matchmaking_cancellations (
        account_id,
        mode_id,
        request_id,
        cancelled_at
      )
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (account_id, mode_id, request_id)
      DO UPDATE SET cancelled_at = EXCLUDED.cancelled_at
    `,
    [accountId, modeId, requestId, TOMBSTONE_LIFETIME]
  );
};

export const isPublicMatchmakingRequestCancelled = async ({
  accountId,
  modeId,
  requestId,
  pool = getPool(),
} = {}) => {
  const result = await pool.query(
    `
      SELECT 1 AS cancelled
      FROM public_matchmaking_cancellations
      WHERE account_id = $1
        AND mode_id = $2
        AND request_id = $3
        AND cancelled_at >= NOW() - $4::interval
      LIMIT 1
    `,
    [accountId, modeId, requestId, TOMBSTONE_LIFETIME]
  );
  return result.rowCount > 0;
};
