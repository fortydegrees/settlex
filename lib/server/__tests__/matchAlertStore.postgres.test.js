import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  finalizeMatchAlertsReservation,
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
    expect(first.accountReservations).toHaveLength(1);
    expect(second.accountReservations).toEqual(first.accountReservations);
    const reservationId = first.accountReservations[0].reservationId;

    await restoreMatchAlertsReservation({ pool, reservation: first });
    let result = await pool.query(
      `SELECT paused_reason AS "pausedReason",
              paused_match_id AS "pausedMatchId",
              pause_reservation_id::text AS "pauseReservationId",
              pause_reservation_count AS "pauseReservationCount"
         FROM match_alert_preferences
        WHERE account_id = $1`,
      [accountId]
    );
    expect(result.rows[0]).toEqual({
      pausedReason: "human_game",
      pausedMatchId: "overlap_match",
      pauseReservationId: reservationId,
      pauseReservationCount: 1,
    });

    await restoreMatchAlertsReservation({ pool, reservation: second });
    result = await pool.query(
      `SELECT paused_reason AS "pausedReason",
              paused_match_id AS "pausedMatchId",
              pause_reservation_id::text AS "pauseReservationId",
              pause_reservation_count AS "pauseReservationCount"
         FROM match_alert_preferences
        WHERE account_id = $1`,
      [accountId]
    );
    expect(result.rows[0]).toEqual({
      pausedReason: null,
      pausedMatchId: null,
      pauseReservationId: null,
      pauseReservationCount: 0,
    });
  });

  it("releases a losing joiner without unpausing the shared winning participant", async () => {
    const inviterId = await createAccount("shared_inviter");
    const loserId = await createAccount("losing_joiner");
    const winnerId = await createAccount("winning_joiner");
    await pool.query(
      `INSERT INTO match_alert_preferences (account_id, enabled)
       SELECT account_id, TRUE
         FROM unnest($1::text[]) AS account_id`,
      [[inviterId, loserId, winnerId]]
    );

    const losingAttempt = await reserveMatchAlertsForAccounts({
      pool,
      accountIds: [inviterId, loserId],
      matchID: "contested_match",
    });
    const winningAttempt = await reserveMatchAlertsForAccounts({
      pool,
      accountIds: [inviterId, winnerId],
      matchID: "contested_match",
    });

    await restoreMatchAlertsReservation({ pool, reservation: losingAttempt });
    await finalizeMatchAlertsReservation({ pool, reservation: winningAttempt });

    const { rows } = await pool.query(
      `SELECT account_id AS "accountId",
              paused_reason AS "pausedReason",
              paused_match_id AS "pausedMatchId",
              pause_reservation_id::text AS "pauseReservationId",
              pause_reservation_count AS "pauseReservationCount"
         FROM match_alert_preferences
        WHERE account_id = ANY($1::text[])
        ORDER BY account_id`,
      [[inviterId, loserId, winnerId]]
    );
    const byAccount = Object.fromEntries(rows.map((row) => [row.accountId, row]));
    expect(byAccount[loserId]).toMatchObject({
      pausedReason: null,
      pausedMatchId: null,
      pauseReservationId: null,
      pauseReservationCount: 0,
    });
    for (const accountId of [inviterId, winnerId]) {
      expect(byAccount[accountId]).toMatchObject({
        pausedReason: "human_game",
        pausedMatchId: "contested_match",
        pauseReservationId: null,
        pauseReservationCount: 0,
      });
    }
  });

  it("rejects a different-match overlap without replacing the original lease", async () => {
    const accountId = await createAccount("cross_match_guard");
    await pool.query(
      `INSERT INTO match_alert_preferences (account_id, enabled)
       VALUES ($1, TRUE)`,
      [accountId]
    );
    const first = await reserveMatchAlertsForAccounts({
      pool,
      accountIds: [accountId],
      matchID: "first_match",
    });

    await expect(
      reserveMatchAlertsForAccounts({
        pool,
        accountIds: [accountId],
        matchID: "second_match",
      })
    ).rejects.toMatchObject({ status: 409 });

    await finalizeMatchAlertsReservation({ pool, reservation: first });
    const { rows } = await pool.query(
      `SELECT paused_reason AS "pausedReason",
              paused_match_id AS "pausedMatchId",
              pause_reservation_id::text AS "pauseReservationId",
              pause_reservation_count AS "pauseReservationCount"
         FROM match_alert_preferences
        WHERE account_id = $1`,
      [accountId]
    );
    expect(rows[0]).toEqual({
      pausedReason: "human_game",
      pausedMatchId: "first_match",
      pauseReservationId: null,
      pauseReservationCount: 0,
    });
  });
});
