import { auth as defaultAuth } from "../auth/betterAuth.js";
import { getPool } from "../db/getPool.js";

const toHeaders = ({ headers, cookieHeader } = {}) => {
  if (headers instanceof Headers) return headers;
  if (headers) return new Headers(headers);
  if (cookieHeader) return new Headers({ cookie: cookieHeader });
  return new Headers();
};

const rowToAccount = (row) =>
  row
    ? {
        id: row.id,
        status: row.status,
        currentUsername: row.currentUsername,
        avatarEmoji: row.avatarEmoji,
        avatarColor: row.avatarColor,
      }
    : null;

export const getCurrentPlayer = async ({
  auth = defaultAuth,
  headers,
  cookieHeader,
  pool = getPool(),
} = {}) => {
  const session = await auth.api.getSession({
    headers: toHeaders({ headers, cookieHeader }),
  });

  if (!session?.user?.id) {
    return null;
  }

  const { rows } = await pool.query(
    `
      SELECT
        id,
        status,
        current_username AS "currentUsername",
        avatar_emoji AS "avatarEmoji",
        avatar_color AS "avatarColor"
      FROM accounts
      WHERE id = $1
      LIMIT 1
    `,
    [session.user.id]
  );

  return {
    user: session.user,
    session: session.session,
    account: rowToAccount(rows[0]),
  };
};
