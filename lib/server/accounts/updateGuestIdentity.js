import { randomUUID } from "node:crypto";
import { getPool } from "../db/getPool.js";
import { normalizeAvatarValue, normalizeUsername } from "./normalizeUsername.js";

const createUsernameTakenError = () =>
  Object.assign(new Error("That username is already taken"), {
    code: "USERNAME_TAKEN",
    status: 409,
  });

const createAccountStateError = (message, status = 404, code = "ACCOUNT_NOT_FOUND") =>
  Object.assign(new Error(message), {
    code,
    status,
  });

export const updateGuestIdentity = async ({
  pool = getPool(),
  accountId,
  username,
  avatarEmoji,
  avatarColor,
} = {}) => {
  if (!accountId) {
    throw createAccountStateError("Account is required", 400, "ACCOUNT_REQUIRED");
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedAvatarEmoji = normalizeAvatarValue(avatarEmoji, "Avatar emoji");
  const normalizedAvatarColor = normalizeAvatarValue(avatarColor, "Avatar color");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentAccount = await client.query(
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
      [accountId]
    );

    const account = currentAccount.rows[0];
    if (!account) {
      throw createAccountStateError("Account was not found");
    }

    if (account.status !== "guest") {
      throw createAccountStateError("Only guest accounts can update identity here", 403, "ACCOUNT_NOT_GUEST");
    }

    const duplicateUsername = await client.query(
      "SELECT id FROM accounts WHERE lower(current_username)=lower($1) AND id <> $2 LIMIT 1",
      [normalizedUsername, accountId]
    );

    if (duplicateUsername.rows.length > 0) {
      throw createUsernameTakenError();
    }

    if (account.currentUsername !== normalizedUsername) {
      await client.query(
        `
          UPDATE username_history
          SET ended_at = NOW()
          WHERE account_id = $1
            AND ended_at IS NULL
        `,
        [accountId]
      );

      await client.query(
        `
          INSERT INTO username_history (
            id,
            account_id,
            username
          )
          VALUES ($1, $2, $3)
        `,
        [randomUUID(), accountId, normalizedUsername]
      );
    }

    const updatedAccount = await client.query(
      `
        UPDATE accounts
        SET
          current_username = $1,
          avatar_emoji = $2,
          avatar_color = $3,
          last_seen_at = NOW(),
          username_changed_at = CASE
            WHEN current_username <> $1 THEN NOW()
            ELSE username_changed_at
          END
        WHERE id = $4
        RETURNING
          id,
          status,
          current_username AS "currentUsername",
          avatar_emoji AS "avatarEmoji",
          avatar_color AS "avatarColor",
          created_at AS "createdAt",
          claimed_at AS "claimedAt",
          last_seen_at AS "lastSeenAt",
          username_changed_at AS "usernameChangedAt"
      `,
      [normalizedUsername, normalizedAvatarEmoji, normalizedAvatarColor, accountId]
    );

    await client.query("COMMIT");

    return {
      account: updatedAccount.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
