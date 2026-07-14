import { describe, expect, it, vi } from "vitest";

import {
  claimMatchAlertEvent,
  deleteMatchAlertSubscription,
  deleteMatchAlertSubscriptionsByEndpoint,
  getMatchAlertPreference,
  listEligibleMatchAlertSubscriptions,
  pauseMatchAlertsForAccounts,
  recordMatchAlertDelivery,
  setMatchAlertEnabled,
  upsertMatchAlertSubscription,
} from "../matchAlerts/matchAlertStore.js";

describe("match alert store", () => {
  it("maps a missing preference to off", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };

    await expect(
      getMatchAlertPreference({ pool, accountId: "acct_1" })
    ).resolves.toEqual({
      enabled: false,
      state: "off",
      pausedReason: null,
      pausedMatchId: null,
      pausedAt: null,
    });
  });

  it("enables a preference and clears any pause", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            enabled: true,
            pausedReason: null,
            pausedMatchId: null,
            pausedAt: null,
          },
        ],
      }),
    };

    await expect(
      setMatchAlertEnabled({ pool, accountId: "acct_1", enabled: true })
    ).resolves.toEqual({
      enabled: true,
      state: "active",
      pausedReason: null,
      pausedMatchId: null,
      pausedAt: null,
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/on conflict \(account_id\)[\s\S]*paused_reason = null/i),
      ["acct_1", true]
    );
  });

  it("re-owns enabled paused accounts for each newly filled human match", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ accountId: "acct_1" }, { accountId: "acct_2" }],
      }),
    };

    await expect(
      pauseMatchAlertsForAccounts({
        pool,
        accountIds: ["acct_1", "acct_2", "acct_1", null],
        matchID: "match_1",
      })
    ).resolves.toEqual(["acct_1", "acct_2"]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /paused_reason = 'human_game'[\s\S]*paused_match_id = \$2[\s\S]*enabled = true/i
      ),
      [["acct_1", "acct_2"], "match_1"]
    );
    expect(pool.query.mock.calls[0][0]).not.toMatch(/paused_reason is null/i);
  });

  it("does not query when there is no match or account to pause", async () => {
    const pool = { query: vi.fn() };

    await expect(
      pauseMatchAlertsForAccounts({ pool, accountIds: [], matchID: "match_1" })
    ).resolves.toEqual([]);
    await expect(
      pauseMatchAlertsForAccounts({ pool, accountIds: ["acct_1"] })
    ).resolves.toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("upserts a browser subscription by endpoint", async () => {
    const stored = {
      accountId: "acct_1",
      endpoint: "https://push.example/sub",
      p256dh: "p",
      auth: "a",
    };
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [stored] }),
    };

    await expect(
      upsertMatchAlertSubscription({
        pool,
        accountId: "acct_1",
        subscription: {
          endpoint: "https://push.example/sub",
          keys: { p256dh: "p", auth: "a" },
        },
      })
    ).resolves.toEqual(stored);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/on conflict \(endpoint\)[\s\S]*do update/i),
      ["acct_1", "https://push.example/sub", "p", "a", 5]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /from accounts[\s\S]*for update[\s\S]*delete from match_alert_subscriptions[\s\S]*offset \$5/i
      ),
      expect.any(Array)
    );
  });

  it("deletes only the current account's matching endpoint", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) };

    await expect(
      deleteMatchAlertSubscription({
        pool,
        accountId: "acct_1",
        endpoint: "https://push.example/sub",
      })
    ).resolves.toBe(true);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/account_id = \$1[\s\S]*endpoint = \$2/i),
      ["acct_1", "https://push.example/sub"]
    );
  });

  it("lists only active recipients and excludes the seeker", async () => {
    const stored = {
      accountId: "acct_2",
      endpoint: "https://push.example/sub",
      p256dh: "p",
      auth: "a",
    };
    const pool = { query: vi.fn().mockResolvedValue({ rows: [stored] }) };

    await expect(
      listEligibleMatchAlertSubscriptions({
        pool,
        excludeAccountId: "acct_1",
      })
    ).resolves.toEqual([stored]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /join match_alert_preferences[\s\S]*enabled = true[\s\S]*paused_reason is null[\s\S]*account_id <> \$1/i
      ),
      ["acct_1"]
    );
  });

  it("serializes per-seeker claims before claiming an event", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "acct_1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ lastMinute: 0, lastHour: 0 }] })
        .mockResolvedValueOnce({ rows: [{ matchID: "match_1" }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };

    await expect(
      claimMatchAlertEvent({
        pool,
        matchID: "match_1",
        seekerAccountId: "acct_1",
        now: new Date("2026-07-14T10:00:00Z"),
      })
    ).resolves.toEqual({ claimed: true, reason: "claimed" });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(/select id[\s\S]*from accounts[\s\S]*for update/i),
      ["acct_1"]
    );
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("returns duplicate before counting rate limits", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "acct_1" }] })
        .mockResolvedValueOnce({ rows: [{ matchID: "match_1" }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };

    await expect(
      claimMatchAlertEvent({
        pool,
        matchID: "match_1",
        seekerAccountId: "acct_1",
      })
    ).resolves.toEqual({ claimed: false, reason: "duplicate" });
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringMatching(/lastMinute/),
      expect.anything()
    );
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rejects a claim when no seeker account row can be locked", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ lastMinute: 0, lastHour: 0 }] })
        .mockResolvedValueOnce({ rows: [{ matchID: "match_1" }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };

    await expect(
      claimMatchAlertEvent({
        pool,
        matchID: "match_1",
        seekerAccountId: "missing_account",
      })
    ).rejects.toThrow("Seeker account not found.");
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringMatching(/insert into match_alert_events/i),
      expect.anything()
    );
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ lastMinute: 1, lastHour: 1 }, "rate_limited_minute"],
    [{ lastMinute: 0, lastHour: 10 }, "rate_limited_hour"],
  ])("rejects abusive claims at the configured limits", async (counts, reason) => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "acct_1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [counts] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };

    await expect(
      claimMatchAlertEvent({
        pool,
        matchID: "match_1",
        seekerAccountId: "acct_1",
      })
    ).resolves.toEqual({ claimed: false, reason });
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringMatching(/insert into match_alert_events/i),
      expect.anything()
    );
  });

  it("rolls back and releases the client when a claim fails", async () => {
    const failure = new Error("database unavailable");
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };

    await expect(
      claimMatchAlertEvent({
        pool,
        matchID: "match_1",
        seekerAccountId: "acct_1",
      })
    ).rejects.toThrow("database unavailable");
    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("records the delivery summary for the claimed match", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) };

    await recordMatchAlertDelivery({
      pool,
      matchID: "match_1",
      attempted: 4,
      delivered: 2,
      expired: 1,
      failed: 1,
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/update match_alert_events[\s\S]*where match_id = \$1/i),
      ["match_1", 4, 2, 1, 1]
    );
  });

  it("deletes expired subscriptions in one endpoint query", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 2 }) };
    const endpoints = ["https://push.example/a", "https://push.example/b"];

    await expect(
      deleteMatchAlertSubscriptionsByEndpoint({ pool, endpoints })
    ).resolves.toBe(2);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/endpoint = any\(\$1::text\[\]\)/i),
      [endpoints]
    );
  });
});
