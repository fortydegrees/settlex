import { getPool } from "../db/getPool.js";

export const transferAccountProfile = async ({
  pool = getPool(),
  fromAccountId,
  toAccountId,
} = {}) => {
  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    return null;
  }

  const { rows } = await pool.query(
    `
      UPDATE accounts
      SET
        id = $2,
        status = 'claimed',
        claimed_at = COALESCE(claimed_at, NOW()),
        last_seen_at = NOW()
      WHERE id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM accounts existing
          WHERE existing.id = $2
        )
      RETURNING
        id,
        status,
        current_username AS "currentUsername",
        avatar_emoji AS "avatarEmoji",
        avatar_color AS "avatarColor"
    `,
    [fromAccountId, toAccountId]
  );

  return rows[0] ?? null;
};
