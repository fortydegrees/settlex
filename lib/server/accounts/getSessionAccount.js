import { getPool } from "../db/getPool.js";
import { GUEST_SESSION_COOKIE_NAME } from "../session/cookieNames.js";
import { hashSessionToken } from "./createGuestAccount.js";

const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex < 0) return cookies;
      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[name] = value;
      return cookies;
    }, {});
};

const parseSessionCookie = (cookieHeader) => {
  const cookieValue = parseCookies(cookieHeader)[GUEST_SESSION_COOKIE_NAME];

  if (!cookieValue || !cookieValue.includes(".")) {
    return null;
  }

  const [selector, token] = cookieValue.split(".", 2);
  if (!selector || !token) return null;

  return {
    cookieValue,
    selector,
    token,
  };
};

export const getSessionAccount = async ({
  pool = getPool(),
  cookieHeader,
} = {}) => {
  const sessionCookie = parseSessionCookie(cookieHeader);
  if (!sessionCookie) {
    return null;
  }

  const { rows } = await pool.connect().then(async (client) => {
    try {
      return await client.query(
        `
          SELECT
            guest_sessions.selector,
            guest_sessions.account_id AS "accountId",
            guest_sessions.token_hash AS "tokenHash",
            guest_sessions.expires_at AS "expiresAt",
            accounts.id,
            accounts.status,
            accounts.current_username AS "currentUsername",
            accounts.avatar_emoji AS "avatarEmoji",
            accounts.avatar_color AS "avatarColor"
          FROM guest_sessions
          JOIN accounts ON accounts.id = guest_sessions.account_id
          WHERE guest_sessions.selector = $1
          LIMIT 1
        `,
        [sessionCookie.selector]
      );
    } finally {
      client.release();
    }
  });

  const sessionRow = rows[0];
  if (!sessionRow) {
    return null;
  }

  if (new Date(sessionRow.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  if (sessionRow.tokenHash !== hashSessionToken(sessionCookie.token)) {
    return null;
  }

  return {
    account: {
      id: sessionRow.id,
      status: sessionRow.status,
      currentUsername: sessionRow.currentUsername,
      avatarEmoji: sessionRow.avatarEmoji,
      avatarColor: sessionRow.avatarColor,
    },
    session: {
      selector: sessionRow.selector,
      accountId: sessionRow.accountId,
      expiresAt: sessionRow.expiresAt,
      cookieValue: sessionCookie.cookieValue,
    },
  };
};
