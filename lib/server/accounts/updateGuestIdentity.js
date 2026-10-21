import { randomUUID } from "node:crypto";
import { isGeneratedUsernameSource } from "../../shared/guestUsername.js";
import { getPool } from "../db/getPool.js";
import { generateGuestUsername as defaultGenerateGuestUsername } from "./generateGuestUsername.js";
import { normalizeAvatarValue, normalizeUsername } from "./normalizeUsername.js";

const MAX_GENERATED_USERNAME_ATTEMPTS = 8;

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

const getUsernameCandidate = ({
  username,
  usernameSource,
  generateUsername,
  attempt,
}) => {
  if (attempt === 0 && typeof username === "string" && username.trim()) {
    return username;
  }

  if (isGeneratedUsernameSource(usernameSource)) {
    return generateUsername();
  }

  return username;
};

export const updateGuestIdentity = async ({
  pool = getPool(),
  accountId,
  username,
  usernameSource,
  generateUsername = defaultGenerateGuestUsername,
  maxGeneratedUsernameAttempts = MAX_GENERATED_USERNAME_ATTEMPTS,
  avatarEmoji,
  avatarColor,
} = {}) => {
  if (!accountId) {
    throw createAccountStateError("Account is required", 400, "ACCOUNT_REQUIRED");
  }

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

    const generatedUsername = isGeneratedUsernameSource(usernameSource);
    const attemptLimit = generatedUsername ? maxGeneratedUsernameAttempts : 1;
    let normalizedUsername = null;

    for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
      normalizedUsername = normalizeUsername(
        getUsernameCandidate({
          username,
          usernameSource,
          generateUsername,
          attempt,
        })
      );

      const duplicateUsername = await client.query(
        "SELECT id FROM accounts WHERE lower(current_username)=lower($1) AND id <> $2 LIMIT 1",
        [normalizedUsername, accountId]
      );

      if (duplicateUsername.rows.length === 0) {
        break;
      }

      if (!generatedUsername || attempt === attemptLimit - 1) {
        throw createUsernameTakenError();
      }
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
