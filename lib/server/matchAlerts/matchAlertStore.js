import { randomUUID } from "node:crypto";

import { getPool } from "../db/getPool.js";

const OFF = Object.freeze({
  enabled: false,
  state: "off",
  pausedReason: null,
  pausedMatchId: null,
  pausedAt: null,
});

const MAX_SUBSCRIPTIONS_PER_ACCOUNT = 5;

const toPreference = (row) => {
  if (!row) return { ...OFF };
  const pausedReason = row.pausedReason ?? null;
  return {
    enabled: Boolean(row.enabled),
    state: !row.enabled ? "off" : pausedReason ? "paused" : "active",
    pausedReason,
    pausedMatchId: row.pausedMatchId ?? null,
    pausedAt: row.pausedAt ?? null,
  };
};

export async function getMatchAlertPreference({ pool = getPool(), accountId } = {}) {
  const { rows } = await pool.query(
    `SELECT enabled,
            paused_reason AS "pausedReason",
            paused_match_id AS "pausedMatchId",
            paused_at AS "pausedAt"
       FROM match_alert_preferences
      WHERE account_id = $1
      LIMIT 1`,
    [accountId]
  );
  return toPreference(rows[0]);
}

export async function setMatchAlertEnabled({
  pool = getPool(),
  accountId,
  enabled,
} = {}) {
  const { rows } = await pool.query(
    `INSERT INTO match_alert_preferences
       (account_id, enabled, paused_reason, paused_match_id, paused_at)
     VALUES ($1, $2, NULL, NULL, NULL)
     ON CONFLICT (account_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       paused_reason = NULL,
       paused_match_id = NULL,
       paused_at = NULL,
       pause_reservation_id = NULL,
       pause_reservation_count = 0,
       pause_reservation_previous_reason = NULL,
       pause_reservation_previous_match_id = NULL,
       pause_reservation_previous_at = NULL,
       updated_at = NOW()
     RETURNING enabled,
               paused_reason AS "pausedReason",
               paused_match_id AS "pausedMatchId",
               paused_at AS "pausedAt"`,
    [accountId, Boolean(enabled)]
  );
  return toPreference(rows[0]);
}

export async function pauseMatchAlertsForAccounts({
  pool = getPool(),
  accountIds,
  matchID,
} = {}) {
  const ids = [...new Set((accountIds ?? []).filter(Boolean))];
  if (!matchID || ids.length === 0) return [];
  const { rows } = await pool.query(
    `UPDATE match_alert_preferences
        SET paused_reason = 'human_game',
            paused_match_id = $2,
            paused_at = NOW(),
            pause_reservation_id = NULL,
            pause_reservation_count = 0,
            pause_reservation_previous_reason = NULL,
            pause_reservation_previous_match_id = NULL,
            pause_reservation_previous_at = NULL,
            updated_at = NOW()
      WHERE account_id = ANY($1::text[])
        AND enabled = TRUE
      RETURNING account_id AS "accountId"`,
    [ids, matchID]
  );
  return rows.map((row) => row.accountId);
}

export async function reserveMatchAlertsForAccounts({
  pool = getPool(),
  accountIds,
  matchID,
  createReservationId = randomUUID,
} = {}) {
  const ids = [...new Set((accountIds ?? []).filter(Boolean))];
  const emptyReservation = {
    matchID: matchID ?? null,
    accountReservations: [],
    pausedAccountIds: [],
  };
  if (!matchID || ids.length === 0) return emptyReservation;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const previous = await client.query(
      `SELECT account_id AS "accountId",
              enabled,
              paused_reason AS "pausedReason",
              paused_match_id AS "pausedMatchId",
              paused_at AS "pausedAt",
              pause_reservation_id::text AS "pauseReservationId",
              pause_reservation_count AS "pauseReservationCount",
              pause_reservation_previous_reason AS "pauseReservationPreviousReason",
              pause_reservation_previous_match_id AS "pauseReservationPreviousMatchId",
              pause_reservation_previous_at AS "pauseReservationPreviousAt"
         FROM match_alert_preferences
        WHERE account_id = ANY($1::text[])
        FOR UPDATE`,
      [ids]
    );
    const conflictingLease = previous.rows.find(
      (preference) =>
        preference.enabled &&
        preference.pauseReservationId &&
        preference.pausedMatchId !== matchID
    );
    if (conflictingLease) {
      const error = new Error("Another human game join is still being resolved.");
      error.status = 409;
      throw error;
    }

    const accountReservations = [];
    for (const preference of previous.rows) {
      if (!preference.enabled) continue;

      const sharesCurrentLease =
        preference.pauseReservationId && preference.pausedMatchId === matchID;
      const reservationId = sharesCurrentLease
        ? preference.pauseReservationId
        : createReservationId();
      const rootPrevious = preference.pauseReservationId
        ? {
            reason: preference.pauseReservationPreviousReason ?? null,
            matchId: preference.pauseReservationPreviousMatchId ?? null,
            pausedAt: preference.pauseReservationPreviousAt ?? null,
          }
        : {
            reason: preference.pausedReason ?? null,
            matchId: preference.pausedMatchId ?? null,
            pausedAt: preference.pausedAt ?? null,
          };

      const paused = sharesCurrentLease
        ? await client.query(
            `UPDATE match_alert_preferences
                SET pause_reservation_count = pause_reservation_count + 1,
                    updated_at = NOW()
              WHERE account_id = $1
                AND enabled = TRUE
                AND paused_match_id = $2
                AND pause_reservation_id = $3
              RETURNING account_id AS "accountId"`,
            [preference.accountId, matchID, reservationId]
          )
        : await client.query(
            `UPDATE match_alert_preferences
                SET paused_reason = 'human_game',
                    paused_match_id = $2,
                    paused_at = NOW(),
                    pause_reservation_id = $3,
                    pause_reservation_count = 1,
                    pause_reservation_previous_reason = $4,
                    pause_reservation_previous_match_id = $5,
                    pause_reservation_previous_at = $6,
                    updated_at = NOW()
              WHERE account_id = $1
                AND enabled = TRUE
              RETURNING account_id AS "accountId"`,
            [
              preference.accountId,
              matchID,
              reservationId,
              rootPrevious.reason,
              rootPrevious.matchId,
              rootPrevious.pausedAt,
            ]
          );
      if (paused.rows[0]?.accountId) {
        accountReservations.push({
          accountId: paused.rows[0].accountId,
          reservationId,
        });
      }
    }
    await client.query("COMMIT");

    return {
      matchID,
      accountReservations,
      pausedAccountIds: accountReservations.map((item) => item.accountId),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function restoreMatchAlertsReservation({
  pool = getPool(),
  reservation,
} = {}) {
  const matchID = reservation?.matchID;
  const accountReservations = reservation?.accountReservations ?? [];
  if (!matchID || accountReservations.length === 0) return [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const restored = [];
    for (const lease of accountReservations) {
      const result = await client.query(
        `UPDATE match_alert_preferences
            SET paused_reason = CASE
                  WHEN pause_reservation_count = 1
                    THEN pause_reservation_previous_reason
                  ELSE paused_reason
                END,
                paused_match_id = CASE
                  WHEN pause_reservation_count = 1
                    THEN pause_reservation_previous_match_id
                  ELSE paused_match_id
                END,
                paused_at = CASE
                  WHEN pause_reservation_count = 1
                    THEN pause_reservation_previous_at
                  ELSE paused_at
                END,
                pause_reservation_id = CASE
                  WHEN pause_reservation_count = 1 THEN NULL
                  ELSE pause_reservation_id
                END,
                pause_reservation_count = pause_reservation_count - 1,
                pause_reservation_previous_reason = CASE
                  WHEN pause_reservation_count = 1 THEN NULL
                  ELSE pause_reservation_previous_reason
                END,
                pause_reservation_previous_match_id = CASE
                  WHEN pause_reservation_count = 1 THEN NULL
                  ELSE pause_reservation_previous_match_id
                END,
                pause_reservation_previous_at = CASE
                  WHEN pause_reservation_count = 1 THEN NULL
                  ELSE pause_reservation_previous_at
                END,
                updated_at = NOW()
          WHERE account_id = $1
            AND enabled = TRUE
            AND paused_match_id = $2
            AND pause_reservation_id = $3
            AND pause_reservation_count > 0
          RETURNING account_id AS "accountId"`,
        [lease.accountId, matchID, lease.reservationId]
      );
      if (result.rows[0]?.accountId) restored.push(result.rows[0].accountId);
    }
    await client.query("COMMIT");
    return restored;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function finalizeMatchAlertsReservation({
  pool = getPool(),
  reservation,
} = {}) {
  const matchID = reservation?.matchID;
  const accountReservations = reservation?.accountReservations ?? [];
  if (!matchID || accountReservations.length === 0) return [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const finalized = [];
    for (const lease of accountReservations) {
      const result = await client.query(
        `UPDATE match_alert_preferences
            SET pause_reservation_id = NULL,
                pause_reservation_count = 0,
                pause_reservation_previous_reason = NULL,
                pause_reservation_previous_match_id = NULL,
                pause_reservation_previous_at = NULL,
                updated_at = NOW()
          WHERE account_id = $1
            AND enabled = TRUE
            AND paused_match_id = $2
            AND pause_reservation_id = $3
          RETURNING account_id AS "accountId"`,
        [lease.accountId, matchID, lease.reservationId]
      );
      if (result.rows[0]?.accountId) finalized.push(result.rows[0].accountId);
    }
    await client.query("COMMIT");
    return finalized;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertMatchAlertSubscription({
  pool = getPool(),
  accountId,
  subscription,
} = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const account = await client.query(
      `SELECT id
         FROM accounts
        WHERE id = $1
        FOR UPDATE`,
      [accountId]
    );
    if (!account.rows[0]) {
      throw new Error("Account not found.");
    }

    const { rows } = await client.query(
      `INSERT INTO match_alert_subscriptions
         (account_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET
         account_id = EXCLUDED.account_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         updated_at = NOW()
       RETURNING account_id AS "accountId",
                 endpoint,
                 p256dh,
                 auth`,
      [
        accountId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
      ]
    );

    await client.query(
      `DELETE FROM match_alert_subscriptions
        WHERE account_id = $1
          AND id IN (
            SELECT id
              FROM match_alert_subscriptions
             WHERE account_id = $1
             ORDER BY updated_at DESC, created_at DESC, id DESC
            OFFSET $2
          )`,
      [accountId, MAX_SUBSCRIPTIONS_PER_ACCOUNT]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMatchAlertSubscription({
  pool = getPool(),
  accountId,
  endpoint,
} = {}) {
  const { rowCount } = await pool.query(
    `DELETE FROM match_alert_subscriptions
      WHERE account_id = $1
        AND endpoint = $2`,
    [accountId, endpoint]
  );
  return rowCount > 0;
}

export async function listEligibleMatchAlertSubscriptions({
  pool = getPool(),
  excludeAccountId,
} = {}) {
  const { rows } = await pool.query(
    `SELECT subscriptions.account_id AS "accountId",
            subscriptions.endpoint,
            subscriptions.p256dh,
            subscriptions.auth
       FROM match_alert_subscriptions subscriptions
       JOIN match_alert_preferences preferences
         ON preferences.account_id = subscriptions.account_id
      WHERE preferences.enabled = TRUE
        AND preferences.paused_reason IS NULL
        AND subscriptions.account_id <> $1`,
    [excludeAccountId]
  );
  return rows;
}

export async function claimMatchAlertEvent({
  pool = getPool(),
  matchID,
  seekerAccountId,
  now = new Date(),
} = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const seekerResult = await client.query(
      `SELECT id
         FROM accounts
        WHERE id = $1
        FOR UPDATE`,
      [seekerAccountId]
    );
    if (!seekerResult.rows[0]) {
      throw new Error("Seeker account not found.");
    }

    const duplicateResult = await client.query(
      `SELECT match_id AS "matchID"
         FROM match_alert_events
        WHERE match_id = $1
        LIMIT 1`,
      [matchID]
    );
    if (duplicateResult.rows[0]) {
      await client.query("COMMIT");
      return { claimed: false, reason: "duplicate" };
    }

    const rateResult = await client.query(
      `SELECT COUNT(*) FILTER (
                WHERE announced_at >= $2::timestamptz - INTERVAL '1 minute'
              )::integer AS "lastMinute",
              COUNT(*) FILTER (
                WHERE announced_at >= $2::timestamptz - INTERVAL '1 hour'
              )::integer AS "lastHour"
         FROM match_alert_events
        WHERE seeker_account_id = $1
          AND announced_at >= $2::timestamptz - INTERVAL '1 hour'`,
      [seekerAccountId, now]
    );
    const counts = rateResult.rows[0] ?? {};
    if (Number(counts.lastMinute) >= 1) {
      await client.query("COMMIT");
      return { claimed: false, reason: "rate_limited_minute" };
    }
    if (Number(counts.lastHour) >= 10) {
      await client.query("COMMIT");
      return { claimed: false, reason: "rate_limited_hour" };
    }

    const claimResult = await client.query(
      `INSERT INTO match_alert_events
         (match_id, seeker_account_id, announced_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (match_id) DO NOTHING
       RETURNING match_id AS "matchID"`,
      [matchID, seekerAccountId, now]
    );
    await client.query("COMMIT");
    return claimResult.rows[0]
      ? { claimed: true, reason: "claimed" }
      : { claimed: false, reason: "duplicate" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordMatchAlertDelivery({
  pool = getPool(),
  matchID,
  attempted,
  delivered,
  expired,
  failed,
} = {}) {
  await pool.query(
    `UPDATE match_alert_events
        SET attempted_count = $2,
            delivered_count = $3,
            expired_count = $4,
            failed_count = $5
      WHERE match_id = $1`,
    [matchID, attempted, delivered, expired, failed]
  );
}

export async function deleteMatchAlertSubscriptionsByEndpoint({
  pool = getPool(),
  endpoints,
} = {}) {
  if (!endpoints?.length) return 0;
  const { rowCount } = await pool.query(
    `DELETE FROM match_alert_subscriptions
      WHERE endpoint = ANY($1::text[])`,
    [endpoints]
  );
  return rowCount;
}
