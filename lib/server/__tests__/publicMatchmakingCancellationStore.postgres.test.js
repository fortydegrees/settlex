import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isPublicMatchmakingRequestCancelled, recordPublicMatchmakingCancellation } from "../matches/publicMatchmakingCancellationStore.js";

const connectionString = process.env.MATCH_ALERT_POSTGRES_URL?.trim();
const withPostgres = connectionString ? describe : describe.skip;

withPostgres("public matchmaking cancellation persistence", () => {
  let pool;
  const accountId = `cancellation_${randomUUID()}`;
  const identity = { accountId, modeId: "duel", requestId: "release-regression-request" };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString });
    await pool.query("INSERT INTO auth_users (id, name, email) VALUES ($1, $1, $2)", [accountId, `${accountId}@example.test`]);
    await pool.query("INSERT INTO accounts (id, status, current_username, avatar_emoji, avatar_color) VALUES ($1, 'guest', $1, '🧪', 'sky')", [accountId]);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query("DELETE FROM auth_users WHERE id = $1", [accountId]);
    await pool.end();
  });

  it("persists a cancellation for only its account, mode and request", async () => {
    await recordPublicMatchmakingCancellation({ ...identity, pool });
    await expect(isPublicMatchmakingRequestCancelled({ ...identity, pool })).resolves.toBe(true);
    await expect(isPublicMatchmakingRequestCancelled({ ...identity, modeId: "other", pool })).resolves.toBe(false);
    await expect(isPublicMatchmakingRequestCancelled({ ...identity, requestId: "other", pool })).resolves.toBe(false);
  });

  it("can renew an expired cancellation for the same request", async () => {
    await recordPublicMatchmakingCancellation({ ...identity, pool });
    await pool.query("UPDATE public_matchmaking_cancellations SET cancelled_at = NOW() - INTERVAL '2 days' WHERE account_id = $1", [accountId]);
    await expect(isPublicMatchmakingRequestCancelled({ ...identity, pool })).resolves.toBe(false);
    await recordPublicMatchmakingCancellation({ ...identity, pool });
    await expect(isPublicMatchmakingRequestCancelled({ ...identity, pool })).resolves.toBe(true);
  });
});
