import { getPool } from "../db/getPool.js";
import { hashMagicLinkToken } from "./requestMagicLink.js";

const createMagicLinkError = (message, status = 400) =>
  Object.assign(new Error(message), {
    status,
  });

export const consumeMagicLink = async ({
  pool = getPool(),
  token,
} = {}) => {
  if (!token) {
    throw createMagicLinkError("Magic link token is required.");
  }

  const tokenHash = hashMagicLinkToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        SELECT
          id,
          account_id AS "accountId",
          email,
          redirect_to AS "redirectTo",
          expires_at AS "expiresAt",
          consumed_at AS "consumedAt"
        FROM magic_link_tokens
        WHERE token_hash = $1
        LIMIT 1
      `,
      [tokenHash]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      throw createMagicLinkError("Magic link is invalid.", 404);
    }
    if (tokenRow.consumedAt) {
      throw createMagicLinkError("Magic link has already been consumed.");
    }
    if (new Date(tokenRow.expiresAt).getTime() <= Date.now()) {
      throw createMagicLinkError("Magic link has expired.");
    }

    const existingEmail = await client.query(
      `
        SELECT
          id,
          account_id AS "accountId"
        FROM account_emails
        WHERE lower(email)=lower($1)
        LIMIT 1
      `,
      [tokenRow.email]
    );

    let emailId = existingEmail.rows[0]?.id ?? null;
    if (existingEmail.rows[0] && existingEmail.rows[0].accountId !== tokenRow.accountId) {
      throw createMagicLinkError("That email is already linked to another account.", 409);
    }

    if (emailId) {
      await client.query(
        `
          UPDATE account_emails
          SET verified_at = NOW(), is_primary = TRUE
          WHERE id = $1
          RETURNING id
        `,
        [emailId]
      );
    } else {
      const insertedEmail = await client.query(
        `
          INSERT INTO account_emails (
            id,
            account_id,
            email,
            verified_at,
            is_primary
          )
          VALUES ($1, $2, $3, NOW(), TRUE)
          RETURNING id
        `,
        [crypto.randomUUID(), tokenRow.accountId, tokenRow.email]
      );
      emailId = insertedEmail.rows[0]?.id ?? null;
    }

    await client.query(
      `
        UPDATE account_emails
        SET is_primary = FALSE
        WHERE account_id = $1 AND id <> $2
      `,
      [tokenRow.accountId, emailId]
    );

    const provider = "magic_link";
    const providerUserId = tokenRow.email.toLowerCase();
    const existingIdentity = await client.query(
      `
        SELECT
          id,
          account_id AS "accountId"
        FROM auth_identities
        WHERE provider = $1 AND provider_user_id = $2
        LIMIT 1
      `,
      [provider, providerUserId]
    );

    if (existingIdentity.rows[0] && existingIdentity.rows[0].accountId !== tokenRow.accountId) {
      throw createMagicLinkError("That email is already linked to another account.", 409);
    }

    if (!existingIdentity.rows[0]) {
      await client.query(
        `
          INSERT INTO auth_identities (
            id,
            account_id,
            provider,
            provider_user_id
          )
          VALUES ($1, $2, $3, $4)
        `,
        [crypto.randomUUID(), tokenRow.accountId, provider, providerUserId]
      );
    }

    const accountResult = await client.query(
      `
        UPDATE accounts
        SET status = 'claimed',
            claimed_at = COALESCE(claimed_at, NOW()),
            last_seen_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          status,
          current_username AS "currentUsername",
          avatar_emoji AS "avatarEmoji",
          avatar_color AS "avatarColor",
          created_at AS "createdAt",
          claimed_at AS "claimedAt",
          last_seen_at AS "lastSeenAt"
      `,
      [tokenRow.accountId]
    );

    await client.query(
      `
        UPDATE magic_link_tokens
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [tokenRow.id]
    );

    await client.query("COMMIT");

    return {
      account: accountResult.rows[0],
      email: tokenRow.email,
      redirectTo: tokenRow.redirectTo ?? "/account",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
