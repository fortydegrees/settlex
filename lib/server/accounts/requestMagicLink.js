import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { getPool } from "../db/getPool.js";
import { createEmailTransport } from "../email/createEmailTransport.js";

const MAGIC_LINK_TTL_MS = 1000 * 60 * 15;

const createValidationError = (message) =>
  Object.assign(new Error(message), {
    status: 400,
  });

const normalizeEmail = (email) => {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw createValidationError("Enter a valid email address.");
  }
  return normalized;
};

export const hashMagicLinkToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const requestMagicLink = async ({
  pool = getPool(),
  accountId,
  email,
  redirectTo = "/account",
  publicAppUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
  emailTransport = createEmailTransport(),
} = {}) => {
  if (!accountId) {
    throw createValidationError("accountId is required");
  }

  const normalizedEmail = normalizeEmail(email);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashMagicLinkToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO magic_link_tokens (
          id,
          account_id,
          email,
          token_hash,
          redirect_to,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          expires_at AS "expiresAt",
          redirect_to AS "redirectTo"
      `,
      [randomUUID(), accountId, normalizedEmail, tokenHash, redirectTo, expiresAt]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const origin = String(publicAppUrl).replace(/\/+$/, "");
  const magicLinkUrl = `${origin}/api/account/claim/consume?token=${encodeURIComponent(rawToken)}`;
  const delivery = await emailTransport.sendMagicLink({
    email: normalizedEmail,
    magicLinkUrl,
  });

  return {
    email: normalizedEmail,
    rawToken,
    magicLinkUrl,
    previewUrl: delivery?.previewUrl ?? null,
    expiresAt,
  };
};
