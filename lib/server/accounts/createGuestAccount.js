import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { isGeneratedUsernameSource } from "../../shared/guestUsername.js";
import { getPool } from "../db/getPool.js";
import { generateGuestUsername as defaultGenerateGuestUsername } from "./generateGuestUsername.js";
import { normalizeAvatarValue, normalizeUsername } from "./normalizeUsername.js";

const GUEST_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 365;
const MAX_GENERATED_USERNAME_ATTEMPTS = 8;

const createUsernameTakenError = () =>
  Object.assign(new Error("That username is already taken"), {
    code: "USERNAME_TAKEN",
    status: 409,
  });

const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export { GUEST_SESSION_TTL_MS, hashSessionToken };

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

export const createGuestAccount = async ({
  pool = getPool(),
  accountId,
  status = "guest",
  username,
  usernameSource,
  generateUsername = defaultGenerateGuestUsername,
  maxGeneratedUsernameAttempts = MAX_GENERATED_USERNAME_ATTEMPTS,
  avatarEmoji,
  avatarColor,
} = {}) => {
  if (!accountId) {
    throw Object.assign(new Error("A Better Auth user is required"), {
      code: "ACCOUNT_REQUIRED",
      status: 401,
    });
  }

  const normalizedStatus = status === "claimed" ? "claimed" : "guest";
  const normalizedAvatarEmoji = normalizeAvatarValue(avatarEmoji, "Avatar emoji");
  const normalizedAvatarColor = normalizeAvatarValue(avatarColor, "Avatar color");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
        "SELECT id FROM accounts WHERE lower(current_username)=lower($1) LIMIT 1",
        [normalizedUsername]
      );

      if (duplicateUsername.rows.length === 0) {
        break;
      }

      if (!generatedUsername || attempt === attemptLimit - 1) {
        throw createUsernameTakenError();
      }
    }

    const createdAccount = await client.query(
      `
        INSERT INTO accounts (
          id,
          status,
          current_username,
          avatar_emoji,
          avatar_color
        )
        VALUES ($1, $2, $3, $4, $5)
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
      [
        accountId,
        normalizedStatus,
        normalizedUsername,
        normalizedAvatarEmoji,
        normalizedAvatarColor,
      ]
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

    await client.query("COMMIT");

    return {
      account: createdAccount.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
