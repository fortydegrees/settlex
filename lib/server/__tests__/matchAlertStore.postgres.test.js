import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  reserveMatchAlertsForAccounts,
  restoreMatchAlertsReservation,
  upsertMatchAlertSubscription,
} from "../matchAlerts/matchAlertStore.js";

const { Pool } = pg;
const connectionString = process.env.MATCH_ALERT_POSTGRES_URL?.trim();
const describeWithPostgres = connectionString ? describe : describe.skip;

describeWithPostgres("match alert store against Postgres", () => {
  let pool;
  const accountIds = [];

  beforeAll(() => {
    pool = new Pool({ connectionString });
  });

  afterAll(async () => {
    if (!pool) return;
    if (accountIds.length > 0) {
      await pool.query("DELETE FROM auth_users WHERE id = ANY($1::text[])", [
        accountIds,
      ]);
    }
    await pool.end();
  });

  const createAccount = async (suffix) => {
    const unique = `${suffix}_${Date.now()}_${crypto.randomUUID()}`;
    const accountId = `match_alert_cap_${unique}`;
    accountIds.push(accountId);
    await pool.query(
      `INSERT INTO auth_users (id, name, email)
       VALUES ($1, $2, $3)`,
      [accountId, unique, `${unique}@example.test`]
    );
    await pool.query(
      `INSERT INTO accounts
         (id, status, current_username, avatar_emoji, avatar_color)
       VALUES ($1, 'guest', $2, '🧪', 'sky')`,
      [accountId, unique]
    );
    return accountId;
  };

  const subscribe = (accountId, index) =>
    upsertMatchAlertSubscription({
      pool,
      accountId,
      subscription: {
        endpoint: `https://push.example/${accountId}/${index}`,
        keys: { p256dh: `p_${index}`, auth: `a_${index}` },
      },
    });

  const endpointsFor = async (accountId) => {
    const { rows } = await pool.query(
      `SELECT endpoint
         FROM match_alert_subscriptions
        WHERE account_id = $1
        ORDER BY endpoint`,
      [accountId]
    );
    return rows.map((row) => row.endpoint);
  };

  it("trims the sixth sequential endpoint back to five", async () => {
    const accountId = await createAccount("sequential");
    for (let index = 0; index < 6; index += 1) {
      await subscribe(accountId, index);
    }

    const endpoints = await endpointsFor(accountId);
    expect(endpoints).toHaveLength(5);
    expect(endpoints).toContain(`https://push.example/${accountId}/5`);
  });

  it("retains at most five endpoints across simultaneous inserts", async () => {
    const accountId = await createAccount("concurrent");
    await Promise.all(
      Array.from({ length: 12 }, (_, index) => subscribe(accountId, index))
    );

    await expect(endpointsFor(accountId)).resolves.toHaveLength(5);
  });

  it("does not let an earlier same-match reservation undo a later one", async () => {
    const accountId = await createAccount("reservation");
    await pool.query(
      `INSERT INTO match_alert_preferences (account_id, enabled)
       VALUES ($1, TRUE)`,
      [accountId]
    );

    const first = await reserveMatchAlertsForAccounts({
      pool,
      accountIds: [accountId],
      matchID: "overlap_match",
    });
    const second = await reserveMatchAlertsForAccounts({
      pool,
      accountIds: [accountId],
      matchID: "overlap_match",
    });
    expect(first.reservationId).toBeTruthy();
    expect(second.reservationId).toBeTruthy();
    expect(second.reservationId).not.toBe(first.reservationId);

    await restoreMatchAlertsReservation({ pool, reservation: first });
    const { rows } = await pool.query(
      `SELECT paused_reason AS "pausedReason",
              paused_match_id AS "pausedMatchId",
              pause_reservation_id::text AS "pauseReservationId"
         FROM match_alert_preferences
        WHERE account_id = $1`,
      [accountId]
    );
    expect(rows[0]).toEqual({
      pausedReason: "human_game",
      pausedMatchId: "overlap_match",
      pauseReservationId: second.reservationId,
    });
  });
});
