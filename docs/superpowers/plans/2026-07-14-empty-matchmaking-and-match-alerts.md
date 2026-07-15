# Empty Matchmaking And Match Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an honest staged rescue for empty public-duel searches plus persistent, opt-in Web Push alerts for newly waiting human opponents.

**Architecture:** Store alert consent, pause state, browser subscriptions, and one claimed event per waiting table in Postgres. The existing Next app routes remain the authenticated boundary: they verify an open public duel against the boardgame.io lobby API, claim an idempotent announcement, and fan out through `web-push`. A root client provider owns Push API subscription state and notification-click confirmation, while the existing homepage hook remains the sole owner of live queue creation, polling, cancellation, and the 12/30-second rescue UI.

**Tech Stack:** Next.js 13 app router, React 18, JavaScript, PostgreSQL 16, boardgame.io 0.50, Vitest 1.6, Tailwind CSS, Base UI Dialog, Howler/HTML Audio, Service Worker Push and Notifications APIs, and the `web-push` Node package.

## Global Constraints

- The live public-duel queue remains the fastest and primary path.
- Enabling alerts must not leave, cancel, or recreate the current search.
- Rescue timing is exactly 12 seconds for beta context/alerts and 30 seconds for the low-emphasis Puffer action.
- Match alerts persist until manually disabled or paused by a fully joined human game; there is no 30-minute expiry or recipient-wide cooldown.
- Wait two seconds after a genuinely new public duel is created, then let the server re-fetch and verify it before announcing.
- Never announce when the seeker joined an existing table, created a bot game, created a friend challenge, cancelled, or was already matched.
- Each match ID may claim at most one announcement. Seeker abuse limits are one claim per minute and ten claims per hour.
- Notification permission and Push API subscription creation happen only after an explicit player click.
- Every delivered Web Push produces a system notification because subscriptions use `userVisibleOnly: true`.
- Notification clicks reuse an existing SettleHex client when possible and always show a second join confirmation.
- Human games pause previously enabled alerts account-wide; Puffer games do not.
- Tab attention is static: `🔔 Match found · Settlehex` and `🔔 Your turn · Settlehex`, using the same bell favicon with no flashing.
- Add only `web-push`; do not add Firebase, a hosted notification provider, a worker queue, cron, SSE, or a presence heartbeat.
- Use JavaScript for app/server modules and ordered SQL for schema changes.
- Follow `.agents/skills/catana-design/SKILL.md`, `docs/agent/UI_CONTEXT.md`, and `docs/agent/skills/catana-brand/SKILL.md` before editing the queue modal, account menu, confirmation dialog, or postgame UI.
- Preserve pre-existing dirty-worktree changes. Never use `git add -A`, `git checkout --`, or a destructive reset.
- For commit steps, stage new files directly and use `git add -p` for already-dirty files. If a hunk overlaps unrelated user work and cannot be separated, leave it unstaged and report the boundary.
- Do not deploy. Production release requires explicit approval and the `settlex-release` skill after local verification.

---

### Task 1: Add match-alert persistence and the database store

**Files:**
- Create: `lib/server/db/sql/0005_match_alerts.sql`
- Create: `lib/server/matchAlerts/matchAlertStore.js`
- Create: `lib/server/__tests__/matchAlertStore.test.js`
- Modify: `lib/server/__tests__/dbMigrations.test.js`

**Interfaces:**
- Produces: `getMatchAlertPreference({ pool?, accountId }) -> MatchAlertPreference`
- Produces: `setMatchAlertEnabled({ pool?, accountId, enabled }) -> MatchAlertPreference`
- Produces: `pauseMatchAlertsForAccounts({ pool?, accountIds, matchID }) -> string[]`
- Produces: `upsertMatchAlertSubscription({ pool?, accountId, subscription }) -> StoredSubscription`
- Produces: `deleteMatchAlertSubscription({ pool?, accountId, endpoint }) -> boolean`
- Produces: `listEligibleMatchAlertSubscriptions({ pool?, excludeAccountId }) -> StoredSubscription[]`
- Produces: `claimMatchAlertEvent({ pool?, matchID, seekerAccountId, now? }) -> { claimed, reason }`
- Produces: `recordMatchAlertDelivery({ pool?, matchID, attempted, delivered, expired, failed })`
- Produces: `deleteMatchAlertSubscriptionsByEndpoint({ pool?, endpoints }) -> number`
- `MatchAlertPreference` is `{ enabled, state, pausedReason, pausedMatchId, pausedAt }`, where state is `off`, `active`, or `paused`.

- [ ] **Step 1: Write failing migration and store tests**

Add the migration assertion to `lib/server/__tests__/dbMigrations.test.js` and create `lib/server/__tests__/matchAlertStore.test.js` with focused fake-pool tests:

```js
it("ships the match-alert migration", () => {
  const sql = readRepoFile("lib/server/db/sql/0005_match_alerts.sql").toLowerCase();
  expect(sql).toContain("create table if not exists match_alert_preferences");
  expect(sql).toContain("create table if not exists match_alert_subscriptions");
  expect(sql).toContain("create table if not exists match_alert_events");
  expect(sql).toContain("paused_match_id");
  expect(sql).toContain("unique (endpoint)");
});

it("maps a missing preference to off", async () => {
  const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
  await expect(getMatchAlertPreference({ pool, accountId: "acct_1" })).resolves.toEqual({
    enabled: false,
    state: "off",
    pausedReason: null,
    pausedMatchId: null,
    pausedAt: null,
  });
});

it("upserts a browser subscription by endpoint", async () => {
  const pool = {
    query: vi.fn().mockResolvedValue({
      rows: [{ accountId: "acct_1", endpoint: "https://push.example/sub", p256dh: "p", auth: "a" }],
    }),
  };
  await upsertMatchAlertSubscription({
    pool,
    accountId: "acct_1",
    subscription: {
      endpoint: "https://push.example/sub",
      keys: { p256dh: "p", auth: "a" },
    },
  });
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringMatching(/on conflict \(endpoint\)[\s\S]*do update/i),
    ["acct_1", "https://push.example/sub", "p", "a"]
  );
});

it("serializes per-seeker claims and rejects duplicate or abusive claims", async () => {
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
```

- [ ] **Step 2: Run the focused tests and verify the red state**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/matchAlertStore.test.js --reporter=dot
```

Expected: FAIL because the migration and store module do not exist.

- [ ] **Step 3: Add the ordered migration**

Create `lib/server/db/sql/0005_match_alerts.sql`:

```sql
CREATE TABLE IF NOT EXISTS match_alert_preferences (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  paused_reason TEXT CHECK (paused_reason IS NULL OR paused_reason = 'human_game'),
  paused_match_id TEXT,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (paused_reason IS NULL AND paused_match_id IS NULL AND paused_at IS NULL)
    OR
    (enabled = TRUE AND paused_reason IS NOT NULL AND paused_match_id IS NOT NULL AND paused_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS match_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS match_alert_subscriptions_account_id_idx
  ON match_alert_subscriptions (account_id);

CREATE TABLE IF NOT EXISTS match_alert_events (
  match_id TEXT PRIMARY KEY,
  seeker_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  announced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_count INTEGER NOT NULL DEFAULT 0 CHECK (attempted_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  expired_count INTEGER NOT NULL DEFAULT 0 CHECK (expired_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0)
);

CREATE INDEX IF NOT EXISTS match_alert_events_seeker_announced_idx
  ON match_alert_events (seeker_account_id, announced_at DESC);
```

- [ ] **Step 4: Implement the Postgres store**

Create `lib/server/matchAlerts/matchAlertStore.js`. Keep all SQL parameterized and expose only the interfaces listed above. The row mapper and state transitions must be exactly:

```js
import { getPool } from "../db/getPool.js";

const OFF = Object.freeze({
  enabled: false,
  state: "off",
  pausedReason: null,
  pausedMatchId: null,
  pausedAt: null,
});

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

export async function setMatchAlertEnabled({ pool = getPool(), accountId, enabled } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO match_alert_preferences
       (account_id, enabled, paused_reason, paused_match_id, paused_at)
     VALUES ($1, $2, NULL, NULL, NULL)
     ON CONFLICT (account_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       paused_reason = NULL,
       paused_match_id = NULL,
       paused_at = NULL,
       updated_at = NOW()
     RETURNING enabled,
               paused_reason AS "pausedReason",
               paused_match_id AS "pausedMatchId",
               paused_at AS "pausedAt"`,
    [accountId, Boolean(enabled)]
  );
  return toPreference(rows[0]);
}

export async function pauseMatchAlertsForAccounts({ pool = getPool(), accountIds, matchID } = {}) {
  const ids = [...new Set((accountIds ?? []).filter(Boolean))];
  if (!matchID || ids.length === 0) return [];
  const { rows } = await pool.query(
    `UPDATE match_alert_preferences
        SET paused_reason = 'human_game',
            paused_match_id = $2,
            paused_at = NOW(),
            updated_at = NOW()
      WHERE account_id = ANY($1::text[])
        AND enabled = TRUE
        AND paused_reason IS NULL
      RETURNING account_id AS "accountId"`,
    [ids, matchID]
  );
  return rows.map((row) => row.accountId);
}
```

Implement the remaining subscription/event functions with these exact SQL rules:

- subscription upsert uses `ON CONFLICT (endpoint) DO UPDATE` and moves the endpoint to the current account;
- delete always includes both `account_id = $1` and `endpoint = $2`;
- eligible recipients join preferences to subscriptions, require `enabled = TRUE` and `paused_reason IS NULL`, and exclude the seeker;
- event claim opens a transaction, locks the seeker account row with `FOR UPDATE`, returns `duplicate` before rate-limit counting, counts the last minute/hour, then inserts with `ON CONFLICT DO NOTHING`;
- delivery summary uses an `UPDATE` by match ID;
- expired endpoint deletion accepts an array and uses `endpoint = ANY($1::text[])`.

- [ ] **Step 5: Run store/migration tests and verify green**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/matchAlertStore.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 6: Commit the persistence slice**

```bash
git add lib/server/db/sql/0005_match_alerts.sql lib/server/matchAlerts/matchAlertStore.js lib/server/__tests__/matchAlertStore.test.js
git add -p lib/server/__tests__/dbMigrations.test.js
git commit -m "feat: add match alert persistence"
```

---

### Task 2: Pause alerts when a human match fills and guard resume

**Files:**
- Create: `lib/server/matchAlerts/humanMatchAlertPause.js`
- Create: `lib/server/__tests__/humanMatchAlertPause.test.js`
- Modify: `lib/server/matches/joinMatchForAccount.js`
- Modify: `app/api/matches/join/handler.js`
- Modify: `app/api/challenges/[matchID]/accept/handler.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Modify: `app/__tests__/api/challengeRoutes.test.js`

**Interfaces:**
- Consumes: `pauseMatchAlertsForAccounts({ accountIds, matchID })` from Task 1.
- Produces: `getHumanAccountsAfterJoin({ liveMatch, joiningAccountId, joiningPlayerId, participantType }) -> string[]`
- Produces: `pauseAlertsAfterHumanJoin({ liveMatch, joiningAccountId, joiningPlayerId, participantType, pauseMatchAlerts, matchID }) -> string[]`
- Produces: `canResumePausedMatch({ matchID, getLiveMatchImpl? }) -> boolean`

- [ ] **Step 1: Write failing pure helper tests**

Create `lib/server/__tests__/humanMatchAlertPause.test.js`:

```js
it("returns both humans only when the joining seat fills the match", () => {
  const liveMatch = {
    matchID: "match_1",
    players: {
      0: { id: 0, name: "Ada", data: { participantType: "human", accountId: "acct_ada" } },
      1: { id: 1, name: "" },
    },
  };
  expect(
    getHumanAccountsAfterJoin({
      liveMatch,
      joiningAccountId: "acct_bren",
      joiningPlayerId: "1",
      participantType: "human",
    })
  ).toEqual(["acct_ada", "acct_bren"]);
  expect(
    getHumanAccountsAfterJoin({
      liveMatch,
      joiningAccountId: "acct_bren",
      joiningPlayerId: "1",
      participantType: "bot",
    })
  ).toEqual([]);
});

it("resumes only after the recorded match is over or gone", async () => {
  const active = vi.fn().mockResolvedValue({ matchID: "m1", gameover: false });
  const finished = vi.fn().mockResolvedValue({ matchID: "m1", gameover: { winner: "0" } });
  const gone = vi.fn().mockRejectedValue(Object.assign(new Error("missing"), { status: 404 }));
  await expect(canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: active })).resolves.toBe(false);
  await expect(canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: finished })).resolves.toBe(true);
  await expect(canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: gone })).resolves.toBe(true);
});
```

Extend match/challenge route tests so a successful human join calls an injected
`pauseAlertsAfterHumanJoin`, while a bot join does not pause. Also prove that a
pause-store failure after the boardgame.io join is logged but does not replace
the already-successful credential response with a misleading join failure.

- [ ] **Step 2: Run the focused tests and verify the red state**

```bash
pnpm exec vitest run lib/server/__tests__/humanMatchAlertPause.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js --reporter=dot
```

Expected: FAIL because the pause helper and route injections do not exist.

- [ ] **Step 3: Preserve HTTP status on lobby-wrapper errors**

In `lib/server/matches/joinMatchForAccount.js`, replace the plain throw in
`assertOk` with:

```js
const error = new Error(message);
error.status = response.status;
throw error;
```

This lets resume distinguish an archived/gone match (`404`/`410`) from a
temporary game-server failure.

- [ ] **Step 4: Implement the human-match pause boundary**

Create `lib/server/matchAlerts/humanMatchAlertPause.js`:

```js
import { getLiveMatch } from "../matches/getLiveMatch.js";
import { pauseMatchAlertsForAccounts } from "./matchAlertStore.js";

const playersOf = (match) =>
  (Array.isArray(match?.players) ? match.players : Object.values(match?.players ?? {}))
    .filter(Boolean);

const occupied = (player) => Boolean(player?.name || player?.data?.usernameSnapshot);

export function getHumanAccountsAfterJoin({
  liveMatch,
  joiningAccountId,
  joiningPlayerId,
  participantType = "human",
} = {}) {
  if (participantType !== "human" || !joiningAccountId) return [];
  const players = playersOf(liveMatch);
  const target = players.find((player) => String(player?.id) === String(joiningPlayerId));
  if (!target || occupied(target)) return [];

  const otherPlayers = players.filter((player) => String(player?.id) !== String(joiningPlayerId));
  if (otherPlayers.length === 0 || otherPlayers.some((player) => !occupied(player))) return [];
  if (otherPlayers.some((player) => player?.data?.participantType !== "human")) return [];

  const accountIds = otherPlayers.map((player) => player?.data?.accountId).filter(Boolean);
  if (accountIds.length !== otherPlayers.length) return [];
  return [...new Set([...accountIds, joiningAccountId])];
}

export async function pauseAlertsAfterHumanJoin({
  liveMatch,
  joiningAccountId,
  joiningPlayerId,
  participantType = "human",
  matchID = liveMatch?.matchID,
  pauseMatchAlerts = pauseMatchAlertsForAccounts,
} = {}) {
  const accountIds = getHumanAccountsAfterJoin({
    liveMatch,
    joiningAccountId,
    joiningPlayerId,
    participantType,
  });
  if (accountIds.length === 0) return [];
  return pauseMatchAlerts({ accountIds, matchID });
}

export async function canResumePausedMatch({ matchID, getLiveMatchImpl = getLiveMatch } = {}) {
  if (!matchID) return true;
  try {
    const match = await getLiveMatchImpl({ matchID });
    return Boolean(match?.gameover);
  } catch (error) {
    if (error?.status === 404 || error?.status === 410) return true;
    throw error;
  }
}
```

- [ ] **Step 5: Wire public and friend joins after successful seat assignment**

Inject `pauseAlertsAfterHumanJoin` into both route factories. Immediately after
`joinMatchForAccountImpl` succeeds, call:

```js
await pauseAlertsAfterHumanJoinImpl({
  liveMatch,
  joiningAccountId: sessionAccount.account.id,
  joiningPlayerId: payload?.playerID,
  participantType: payload?.participantType === "bot" ? "bot" : "human",
  matchID: payload?.matchID,
});
```

For the friend-accept route, use `challengeState.inviteeSeatId`, always pass
`participantType: "human"`, and preserve the existing credential cookie and
response body. Because the seat has already been joined at this point, wrap the
pause write in `try/catch`, inject the existing logger pattern, and log a
structured warning without failing the join response. A later delivery query
still requires an enabled preference and working database, while returning a
500 here would incorrectly invite the client to retry an irreversible join.

- [ ] **Step 6: Run helper and route tests**

```bash
pnpm exec vitest run lib/server/__tests__/humanMatchAlertPause.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js --reporter=dot
```

Expected: PASS, including bot-no-pause coverage.

- [ ] **Step 7: Commit the lifecycle slice**

```bash
git add lib/server/matchAlerts/humanMatchAlertPause.js lib/server/__tests__/humanMatchAlertPause.test.js
git add -p lib/server/matches/joinMatchForAccount.js app/api/matches/join/handler.js app/api/challenges/[matchID]/accept/handler.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js
git commit -m "feat: pause match alerts during human games"
```

---

### Task 3: Expose authenticated preference and subscription APIs

**Files:**
- Create: `lib/server/matchAlerts/webPushConfig.js`
- Create: `app/api/match-alerts/handler.js`
- Create: `app/api/match-alerts/route.js`
- Create: `app/api/match-alerts/subscriptions/handler.js`
- Create: `app/api/match-alerts/subscriptions/route.js`
- Create: `app/__tests__/api/matchAlertRoutes.test.js`
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`

**Interfaces:**
- Consumes: Task 1 store and Task 2 `canResumePausedMatch`.
- Produces: `GET /api/match-alerts -> { configured, vapidPublicKey, preference }`
- Produces: `PATCH /api/match-alerts` with `{ action: "enable" | "disable" | "resume" }`.
- Produces: `POST /api/match-alerts/subscriptions` with a PushSubscription JSON body.
- Produces: `DELETE /api/match-alerts/subscriptions` with `{ endpoint }`.

- [ ] **Step 1: Write failing route tests**

Create `app/__tests__/api/matchAlertRoutes.test.js` with these core cases:

```js
it("requires an account and returns configuration plus preference", async () => {
  const getSessionAccount = vi.fn();
  const getMatchAlertPreference = vi.fn().mockResolvedValue({
    enabled: true,
    state: "active",
    pausedReason: null,
    pausedMatchId: null,
    pausedAt: null,
  });
  const GET = createMatchAlertsGetRoute({
    getSessionAccount,
    getMatchAlertPreference,
    getWebPushConfig: () => ({ configured: true, publicKey: "public-vapid" }),
  });
  expect((await GET(new Request("http://localhost/api/match-alerts"))).status).toBe(401);
  getSessionAccount.mockResolvedValue({ account: { id: "acct_1" } });
  expect(await (await GET(new Request("http://localhost/api/match-alerts"))).json()).toEqual({
    configured: true,
    vapidPublicKey: "public-vapid",
    preference: expect.objectContaining({ state: "active" }),
  });
});

it("rejects resume while the paused human match is active", async () => {
  const PATCH = createMatchAlertsPatchRoute({
    getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_1" } }),
    getMatchAlertPreference: vi.fn().mockResolvedValue({
      enabled: true,
      state: "paused",
      pausedReason: "human_game",
      pausedMatchId: "match_1",
      pausedAt: "2026-07-14T10:00:00Z",
    }),
    canResumePausedMatch: vi.fn().mockResolvedValue(false),
    setMatchAlertEnabled: vi.fn(),
  });
  const response = await PATCH(new Request("http://localhost/api/match-alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resume" }),
  }));
  expect(response.status).toBe(409);
});

it("validates and upserts a subscription for the current account", async () => {
  const upsert = vi.fn().mockResolvedValue({ endpoint: "https://push.example/sub" });
  const POST = createMatchAlertSubscriptionPostRoute({
    getSessionAccount: vi.fn().mockResolvedValue({ account: { id: "acct_1" } }),
    upsertMatchAlertSubscription: upsert,
  });
  const response = await POST(new Request("http://localhost/api/match-alerts/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "https://push.example/sub",
      keys: { p256dh: "public-key", auth: "auth-secret" },
    }),
  }));
  expect(response.status).toBe(200);
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ accountId: "acct_1" }));
});
```

Also cover invalid actions, missing/HTTP subscription endpoints, missing keys,
deleting only the current account's endpoint, and `configured: false` when VAPID
variables are absent.

- [ ] **Step 2: Run API tests and verify red**

```bash
pnpm exec vitest run app/__tests__/api/matchAlertRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js --reporter=dot
```

Expected: FAIL because the route handlers do not exist.

- [ ] **Step 3: Add lazy VAPID configuration**

Create `lib/server/matchAlerts/webPushConfig.js`:

```js
export function getWebPushConfig({ env = process.env } = {}) {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = env.VAPID_SUBJECT?.trim() ?? "";
  return {
    configured: Boolean(publicKey && privateKey && subject),
    publicKey,
    privateKey,
    subject,
  };
}
```

Do not read or validate these variables at module import time; production builds
without runtime secrets must still compile.

- [ ] **Step 4: Implement GET/PATCH preference routes**

In `app/api/match-alerts/handler.js`, follow the existing injected-handler
pattern. Authentication uses `getSessionAccount({ cookieHeader })`. PATCH rules:

```js
if (action === "disable") {
  return NextResponse.json({
    preference: await setMatchAlertEnabledImpl({ accountId, enabled: false }),
  });
}

if (action === "enable" || action === "resume") {
  const current = await getMatchAlertPreferenceImpl({ accountId });
  if (current.state === "paused") {
    const canResume = await canResumePausedMatchImpl({ matchID: current.pausedMatchId });
    if (!canResume) {
      return NextResponse.json(
        { error: "Match alerts stay paused until your human game ends." },
        { status: 409 }
      );
    }
  }
  return NextResponse.json({
    preference: await setMatchAlertEnabledImpl({ accountId, enabled: true }),
  });
}

return NextResponse.json({ error: "Invalid match-alert action." }, { status: 400 });
```

`app/api/match-alerts/route.js` must contain only:

```js
export const dynamic = "force-dynamic";
export { GET, PATCH } from "./handler.js";
```

Both `enable` and `resume` use the active-match guard. A forged `enable` request
must not clear a pause while the recorded human game is still active.

- [ ] **Step 5: Implement subscription POST/DELETE routes**

Validate `endpoint` with `new URL(endpoint).protocol === "https:"`, require
non-empty `keys.p256dh` and `keys.auth`, cap each input at 4096 characters, and
pass the authenticated account ID to the Task 1 store. Return `{ ok: true }` on
delete even when the endpoint was already absent.

`app/api/match-alerts/subscriptions/route.js`:

```js
export const dynamic = "force-dynamic";
export { POST, DELETE } from "./handler.js";
```

Add both new route modules to `routePaths` in
`app/__tests__/api/routeModuleExports.source.test.js`.

- [ ] **Step 6: Run API tests and verify green**

```bash
pnpm exec vitest run app/__tests__/api/matchAlertRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit the account API slice**

```bash
git add lib/server/matchAlerts/webPushConfig.js app/api/match-alerts app/__tests__/api/matchAlertRoutes.test.js
git add -p app/__tests__/api/routeModuleExports.source.test.js
git commit -m "feat: add match alert account APIs"
```

---

### Task 4: Verify waiting tables and deliver Web Push

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `lib/server/matchAlerts/sendMatchAlert.js`
- Create: `lib/server/matchAlerts/announceWaitingDuel.js`
- Create: `lib/server/__tests__/matchAlertAnnouncement.test.js`
- Create: `app/api/match-alerts/announce/handler.js`
- Create: `app/api/match-alerts/announce/route.js`
- Modify: `app/__tests__/api/matchAlertRoutes.test.js`
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`

**Interfaces:**
- Consumes: Task 1 store, Task 3 VAPID config, and `getLiveMatch`.
- Produces: `buildMatchAlertPayload({ matchID, seekerName }) -> PushPayload`.
- Produces: `sendMatchAlert({ matchID, seekerName, subscriptions, webPush?, config? }) -> DeliverySummary`.
- Produces: `validateWaitingDuel({ liveMatch, matchID, seekerAccountId }) -> { valid, reason, seekerName }`.
- Produces: `announceWaitingDuel({ matchID, seekerAccountId, ...dependencies }) -> { announced, reason, delivery? }`.
- Produces: authenticated `POST /api/match-alerts/announce` with `{ matchID }`.

- [ ] **Step 1: Add the delivery dependency**

Run:

```bash
pnpm add web-push
```

Expected: `web-push` appears in `dependencies` and the pnpm lockfile changes;
no second notification SDK is added.

- [ ] **Step 2: Write failing verification, idempotency, and delivery tests**

Create `lib/server/__tests__/matchAlertAnnouncement.test.js`. Cover these exact
cases with injected fakes:

```js
it("accepts only the original lone human at an open public duel", () => {
  expect(validateWaitingDuel({
    liveMatch: {
      matchID: "match_1",
      gameName: "catana",
      setupData: { modeId: "duel", isPrivate: false },
      players: {
        0: { id: 0, name: "Zak", data: { participantType: "human", accountId: "acct_zak" } },
        1: { id: 1, name: "" },
      },
    },
    matchID: "match_1",
    seekerAccountId: "acct_zak",
  })).toEqual({ valid: true, reason: "waiting", seekerName: "Zak" });
});

it.each([
  ["filled", { 0: { name: "Zak", data: { participantType: "human", accountId: "acct_zak" } }, 1: { name: "Ada", data: { participantType: "human", accountId: "acct_ada" } } }],
  ["cancelled", { 0: { name: "" }, 1: { name: "" } }],
  ["bot", { 0: { name: "Puffer", data: { participantType: "bot" } }, 1: { name: "" } }],
])("rejects a %s table", (_reason, players) => {
  expect(validateWaitingDuel({
    liveMatch: { matchID: "match_1", setupData: { modeId: "duel", isPrivate: false }, players },
    matchID: "match_1",
    seekerAccountId: "acct_zak",
  }).valid).toBe(false);
});

it("claims before fanout and makes duplicate requests harmless", async () => {
  const claim = vi.fn().mockResolvedValue({ claimed: false, reason: "duplicate" });
  const list = vi.fn();
  const send = vi.fn();
  await expect(announceWaitingDuel({
    matchID: "match_1",
    seekerAccountId: "acct_zak",
    getLiveMatchImpl: vi.fn().mockResolvedValue(validWaitingMatch),
    claimMatchAlertEventImpl: claim,
    listEligibleMatchAlertSubscriptionsImpl: list,
    sendMatchAlertImpl: send,
  })).resolves.toEqual({ announced: false, reason: "duplicate" });
  expect(list).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

it("removes expired endpoints and records the delivery summary", async () => {
  const sendNotification = vi
    .fn()
    .mockResolvedValueOnce({ statusCode: 201 })
    .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }));
  const removeExpired = vi.fn();
  const record = vi.fn();
  await expect(sendMatchAlert({
    matchID: "match_1",
    seekerName: "Zak",
    subscriptions: [subscriptionA, subscriptionB],
    webPush: { sendNotification },
    config: { configured: true, subject: "mailto:hello@settlehex.com", publicKey: "pub", privateKey: "priv" },
    deleteExpiredImpl: removeExpired,
    recordDeliveryImpl: record,
  })).resolves.toEqual({ attempted: 2, delivered: 1, expired: 1, failed: 0 });
  expect(removeExpired).toHaveBeenCalledWith(expect.objectContaining({ endpoints: [subscriptionB.endpoint] }));
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ matchID: "match_1", delivered: 1, expired: 1 }));
});
```

Also test wrong mode, private/friend tables, wrong account, wrong match ID,
non-human occupants, missing VAPID configuration, a generic seeker-name
fallback, 404/410 expiration, non-expiration failures, and the one-minute and
ten-per-hour reasons returned by the store claim.

Extend `app/__tests__/api/matchAlertRoutes.test.js` to assert that the announce
route authenticates, validates a non-empty bounded match ID, passes the session
account ID rather than a client account ID, returns 200 for duplicate and
legitimate filled/cancelled no-ops, returns one generic 404 response for a
forged/non-owner/private match without revealing its state, and maps unexpected
delivery errors to 500.

- [ ] **Step 3: Run the tests and verify the red state**

```bash
pnpm exec vitest run lib/server/__tests__/matchAlertAnnouncement.test.js app/__tests__/api/matchAlertRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js --reporter=dot
```

Expected: FAIL because the announcement modules and route do not exist.

- [ ] **Step 4: Build the fixed push payload and fanout**

In `lib/server/matchAlerts/sendMatchAlert.js`, import `web-push` in this
server-only module and allow an injected sender in tests. `buildMatchAlertPayload`
returns:

```js
{
  type: "match-alert",
  matchID,
  seekerName: seekerName || null,
  title: seekerName ? `⚔️ ${seekerName} is looking for a duel` : "⚔️ Someone is looking for a duel",
  body: "Tap to see if the table is still open.",
  url: `/?matchAlert=${encodeURIComponent(matchID)}`,
  tag: `match-alert-${matchID}`,
}
```

Convert stored rows back to the PushSubscription shape
`{ endpoint, keys: { p256dh, auth } }`. Call `webPush.sendNotification` with the
JSON string and:

```js
{
  TTL: 300,
  vapidDetails: {
    subject: config.subject,
    publicKey: config.publicKey,
    privateKey: config.privateKey,
  },
}
```

Use `Promise.allSettled`. Count 404/410 errors as expired and delete those
endpoints; count all other rejected sends as failed. Always record the summary.
If VAPID is unconfigured, return and record a failure for every attempted
subscription without invoking the package. Delivery failures must never undo
the claimed event or break the seeker's queue.

- [ ] **Step 5: Add authoritative waiting-duel verification**

In `lib/server/matchAlerts/announceWaitingDuel.js`, normalize object/array
player collections. A table is eligible only when all of these are true:

- fetched `matchID` exactly equals the request;
- game is not over;
- `setupData.modeId === "duel"`;
- neither `setupData.isPrivate` nor friend/challenge metadata is true;
- there are exactly two seats;
- exactly one seat is occupied;
- the occupant has `participantType === "human"` and its account ID equals the
  authenticated requester;
- the other seat is still open.

The orchestration order is fixed: fetch, validate, claim, list active recipients
excluding the seeker, send. Collapse non-owner/private/forged failures to the
same `not_eligible` result; the route maps that result to a generic 404. Return
`{ announced: false, reason }` for legitimate stale, duplicate, and rate-limited
requests. After a successful claim, return
`{ announced: true, reason: "announced", delivery }` even if some pushes fail.

- [ ] **Step 6: Add the authenticated announcement route**

Use the established handler-factory pattern in
`app/api/match-alerts/announce/handler.js`. Accept only JSON `{ matchID }`, trim
it, cap it at 256 characters, and ignore any submitted seeker identity. Call
`announceWaitingDuelImpl({ matchID, seekerAccountId: session.account.id })`.

Create `app/api/match-alerts/announce/route.js`:

```js
export const dynamic = "force-dynamic";
export { POST } from "./handler.js";
```

Add the route to the route-module source test.

- [ ] **Step 7: Run the announcement and route tests**

```bash
pnpm exec vitest run lib/server/__tests__/matchAlertAnnouncement.test.js app/__tests__/api/matchAlertRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 8: Commit the verified-delivery slice**

```bash
git add lib/server/matchAlerts/sendMatchAlert.js lib/server/matchAlerts/announceWaitingDuel.js lib/server/__tests__/matchAlertAnnouncement.test.js app/api/match-alerts/announce
git add -p package.json pnpm-lock.yaml app/__tests__/api/matchAlertRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js
git commit -m "feat: announce verified waiting duels"
```

---

### Task 5: Add browser subscription state and the root service worker

**Files:**
- Create: `app/catana/matchAlerts/matchAlertBrowser.js`
- Create: `app/catana/matchAlerts/matchAlertState.js`
- Create: `app/catana/matchAlerts/MatchAlertProvider.js`
- Create: `app/catana/matchAlerts/useMatchAlerts.js`
- Create: `app/catana/matchAlerts/__tests__/matchAlertBrowser.test.js`
- Create: `app/catana/matchAlerts/__tests__/matchAlertState.test.js`
- Create: `app/__tests__/matchAlertServiceWorker.source.test.js`
- Create: `public/match-alerts-sw.js`
- Create: `public/match-alert-bell.svg`
- Create: `app/manifest.js`
- Modify: `app/layout.js`
- Create: `app/__tests__/appShell.source.test.js`

**Interfaces:**
- Produces: feature detection, Base64 VAPID conversion, service-worker
  registration, local PushSubscription lookup/create/delete helpers.
- Produces: `MatchAlertProvider` state `{ loading, configured, capability,
  permission, preference, hasSubscription }`.
- Produces provider actions `refresh`, `enable`, `disable`, `resume`,
  `detachCurrentBrowser`, and `requestAnnouncement`.
- Produces: `useMatchAlerts()` for homepage and game UI consumers.

- [ ] **Step 1: Write failing capability and service-worker tests**

Test pure helpers without a DOM. Exact states are:

```js
expect(getMatchAlertCapability({ windowLike: {} })).toEqual({ supported: false, reason: "unsupported" });
expect(getMatchAlertCapability({
  windowLike: { Notification: { permission: "denied" }, PushManager: class {} },
  navigatorLike: { serviceWorker: {} },
})).toEqual({ supported: true, permission: "denied", reason: "blocked" });
```

Cover granted/default/denied permission, iOS Safari outside a Home Screen app,
configured false, and correct URL-safe VAPID decoding. Mock
`navigator.serviceWorker.register` and `registration.pushManager.subscribe` to
assert registration at `/match-alerts-sw.js` with scope `/`, plus
`subscribe({ userVisibleOnly: true, applicationServerKey })`.

In `app/__tests__/matchAlertServiceWorker.source.test.js`, assert that the
worker listens for `push` and `notificationclick`, always calls
`showNotification`, uses `/match-alert-bell.svg`, and contains
both focus/postMessage and `clients.openWindow` paths. Add a source assertion
that `app/layout.js` wraps app content in `MatchAlertProvider`.

- [ ] **Step 2: Run the focused tests and verify red**

```bash
pnpm exec vitest run app/catana/matchAlerts/__tests__/matchAlertBrowser.test.js app/catana/matchAlerts/__tests__/matchAlertState.test.js app/__tests__/matchAlertServiceWorker.source.test.js app/__tests__/appShell.source.test.js --reporter=dot
```

Expected: FAIL because the browser modules, provider, manifest, and worker do
not exist.

- [ ] **Step 3: Implement browser primitives**

`matchAlertBrowser.js` must avoid touching `window`, `navigator`, or
`Notification` at module scope. Export:

```js
export function getMatchAlertCapability({ windowLike = globalThis.window, navigatorLike = globalThis.navigator } = {})
export function urlBase64ToUint8Array(value)
export async function getMatchAlertRegistration({ navigatorLike = globalThis.navigator } = {})
export async function getCurrentPushSubscription({ navigatorLike = globalThis.navigator } = {})
export async function createPushSubscription({ publicKey, navigatorLike = globalThis.navigator } = {})
export async function removeCurrentPushSubscription({ navigatorLike = globalThis.navigator } = {})
```

Detect iPhone/iPad Safari and `display-mode: standalone`; return an
`install_required` reason when Web Push is otherwise unavailable outside the
Home Screen app. Register the root worker and await `navigator.serviceWorker.ready`.

`matchAlertState.js` maps server preference plus browser capability to stable
labels and CTA states. Before the first enable attempt, iOS Safari outside an
installed Home Screen app still shows the normal Enable action; that click
reveals install guidance without invoking notification permission. States are:

- `active`: “Match alerts on” with Disable;
- `paused`: “Match alerts paused during your game” with no in-game resume;
- `off/default`: “Get match alerts” with Enable;
- denied: “Notifications blocked in browser settings”;
- unsupported/unconfigured: explanatory copy and no broken CTA;
- install-required after an enable attempt: Home Screen installation guidance.

- [ ] **Step 4: Implement the provider and explicit enable transaction**

Make `MatchAlertProvider.js` a client component and place it inside the existing
app shell without changing server metadata. Initial `refresh()` fetches
`GET /api/match-alerts`, reads local permission/subscription, and reconciles
display state. Treat a 401 as a normal signed-out state, and expose a refresh
call for the homepage after account creation/restoration.

The `enable()` call must originate from the UI click and run in this order:

1. verify server configuration and browser support;
2. call `Notification.requestPermission()` if permission is `default`;
3. stop with an actionable state if permission is not `granted`;
4. register the worker and create/reuse the PushSubscription;
5. POST its JSON to `/api/match-alerts/subscriptions`;
6. PATCH `/api/match-alerts` with `{ action: "enable" }`;
7. refresh provider state.

`disable()` PATCHes the preference off and leaves the browser subscription
stored for cheap re-enable. `detachCurrentBrowser()` DELETEs the authenticated
endpoint before calling `subscription.unsubscribe()`. It distinguishes a
server-detach failure (unsafe to sign out) from a local unsubscribe failure
after the association is already gone (safe to sign out and report/log).
`requestAnnouncement(matchID)` POSTs to the Task 4 route and returns a no-throw
`{ announced, reason }` result to the queue hook.

Do not request permission during mount, refresh, search start, or any timer.

- [ ] **Step 5: Add the root service worker and installable manifest**

Create `public/match-alert-bell.svg` as one simple high-contrast bell in the
existing Catana visual language, legible at favicon size and with no animation.

`public/match-alerts-sw.js` parses JSON defensively and, for every valid push,
calls `registration.showNotification(payload.title, { body, tag, icon:
"/match-alert-bell.svg", badge: "/match-alert-bell.svg", data: { type, matchID, url } })`.
Do not suppress the OS notification when a page is visible.

On `notificationclick`, close the notification, query
`clients.matchAll({ type: "window", includeUncontrolled: true })`, focus the
first SettleHex client and `postMessage({ type: "match-alert-click", matchID,
url })`; call `clients.openWindow(url)` only when no client exists.

Create `app/manifest.js` returning `name`, `short_name`, `id: "/"`,
`start_url: "/"`, `display: "standalone"`, Catana background/theme colors, and
an `{ src: "/match-alert-bell.svg", sizes: "any", type: "image/svg+xml" }` icon
entry. This is required for iOS/iPadOS Home Screen Web Push; do not depend on or
overwrite the pre-existing dirty-worktree `app/icon.svg`.

- [ ] **Step 6: Run browser/provider/source tests**

```bash
pnpm exec vitest run app/catana/matchAlerts/__tests__/matchAlertBrowser.test.js app/catana/matchAlerts/__tests__/matchAlertState.test.js app/__tests__/matchAlertServiceWorker.source.test.js app/__tests__/appShell.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit the browser foundation**

```bash
git add app/catana/matchAlerts app/manifest.js public/match-alerts-sw.js public/match-alert-bell.svg
git add -p app/layout.js app/__tests__/appShell.source.test.js
git commit -m "feat: add opt-in browser match alerts"
```

---

### Task 6: Turn notification clicks into a confirmed, race-safe join

**Files:**
- Create: `app/catana/matchAlerts/matchAlertJoin.js`
- Create: `app/catana/matchAlerts/MatchAlertDialog.js`
- Create: `app/catana/matchAlerts/__tests__/matchAlertJoin.test.js`
- Create: `app/catana/matchAlerts/__tests__/MatchAlertDialog.source.test.js`
- Modify: `app/catana/matchAlerts/MatchAlertProvider.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/home/HomeTableClient.js`

**Interfaces:**
- Produces: `resolveAlertMatch({ matchID, fetchImpl? }) -> { status, match,
  seekerName }` where status is `open`, `stale`, or `error`.
- Produces: a global `MatchAlertDialog` with `checking`, `confirm`, `joining`,
  `stale`, and `error` states.
- Extends provider with current-game context and service-worker/deep-link click
  handling.

- [ ] **Step 1: Write failing open/stale/race tests**

Test `resolveAlertMatch` against `/api/matches/:id`. It returns `open` only for
the same public human duel with exactly one open seat. A 404/410, filled table,
cancelled table, private table, bot table, wrong mode, or game-over table is
`stale`; network/server failure is `error`.

Add source/component tests for these required dialog paths:

- “Zak is looking for a duel” plus a secondary “Join duel” confirmation;
- “Leave your Puffer game and join Zak?” when provider game context is bot;
- disabled Join while POST is pending;
- a second verification immediately before `POST /api/matches/join`;
- “That table has already filled” with `Keep looking` after a 409/stale join;
- no automatic join from the query string or service-worker message.

- [ ] **Step 2: Run the focused tests and verify red**

```bash
pnpm exec vitest run app/catana/matchAlerts/__tests__/matchAlertJoin.test.js app/catana/matchAlerts/__tests__/MatchAlertDialog.source.test.js --reporter=dot
```

Expected: FAIL because the resolver and dialog do not exist.

- [ ] **Step 3: Implement authoritative client-side re-checking**

`resolveAlertMatch` fetches the live match API with `cache: "no-store"` and
normalizes the existing match response shape. Reuse the same eligibility rules
as the UI can observe, but treat the server join route as final authority. Never
trust seeker name or seat data from the push payload.

- [ ] **Step 4: Wire click sources into one prompt**

On provider mount:

- read `matchAlert` from `window.location.search` once, then remove only that
  query key with `window.history.replaceState` so the root provider does not
  force the app shell into a `useSearchParams` Suspense boundary;
- listen for service-worker `message` events of type `match-alert-click`;
- pass either source to `openMatchAlert(matchID)`, which checks the match and
  opens `MatchAlertDialog` but never joins it.

Render one dialog from the provider. `GameScreen` registers `{ matchID,
opponentType: "human" | "bot" }` while mounted and clears it on unmount. This
lets the confirmation warn before abandoning Puffer; it does not expose game
credentials through the provider.

- [ ] **Step 5: Implement the confirmed join**

On “Join duel”:

1. resolve the table again;
2. if a bot game is active, use the existing leave route/credential path before
   joining the alerted table;
3. POST `/api/matches/join` with the open seat and `participantType: "human"`;
4. store the returned credential using the existing active-match storage key;
5. call `writeLastActiveMatch` with the joined match/seat;
6. close the dialog and `router.push` to the existing match route.

If the join races, stay in the dialog and show stale copy. “Keep looking” closes
the prompt and navigates to `/?playOnline=1`; the homepage consumes that query
through its ordinary `play()` action. “Not now” only closes the dialog.

- [ ] **Step 6: Run the prompt tests**

```bash
pnpm exec vitest run app/catana/matchAlerts/__tests__/matchAlertJoin.test.js app/catana/matchAlerts/__tests__/MatchAlertDialog.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit the confirmation flow**

```bash
git add app/catana/matchAlerts/matchAlertJoin.js app/catana/matchAlerts/MatchAlertDialog.js app/catana/matchAlerts/__tests__
git add -p app/catana/matchAlerts/MatchAlertProvider.js app/catana/GameScreen.js app/catana/home/HomeTableClient.js
git commit -m "feat: confirm joins from match alerts"
```

---

### Task 7: Rescue a slow live search without draining the queue

**Files:**
- Create: `app/catana/matchmaking/matchmakingRescue.js`
- Create: `app/catana/matchmaking/__tests__/matchmakingRescue.test.js`
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/home/HomeTableClient.js`
- Create: `app/catana/__tests__/HomeTableClient.matchmakingRescue.source.test.js`
- Create: `app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js`

**Interfaces:**
- Produces: `getMatchmakingRescueStage(elapsedSeconds) -> "waiting" |
  "alerts" | "puffer"`.
- Extends the lobby hook with `searchElapsedSeconds`, `createdNewPublicDuel`,
  `playPufferFromSearch`, and delayed announcement cancellation.

- [ ] **Step 1: Write failing timing and queue-ownership tests**

```js
it.each([
  [0, "waiting"], [11, "waiting"], [12, "alerts"], [29, "alerts"], [30, "puffer"],
])("maps %s seconds to %s", (seconds, stage) => {
  expect(getMatchmakingRescueStage(seconds)).toBe(stage);
});
```

Extend hook tests to assert:

- joining an already open duel never schedules an announcement;
- creating a new public duel schedules exactly one announcement after 2000ms;
- cancel, unmount, match-found, and switching to Puffer clear the timer;
- an announcement no-op/error leaves polling active;
- enabling alerts does not call `cancelSearch`;
- `playPufferFromSearch` awaits leave/cancel before creating the bot match;
- the elapsed timer resets between searches.

Extend homepage source tests for 12-second beta/liquidity copy, primary Keep
waiting, inline Match alerts status/CTA, 30-second quiet Puffer CTA, and no
Puffer CTA before 30 seconds.

- [ ] **Step 2: Run focused tests and verify red**

```bash
pnpm exec vitest run app/catana/matchmaking/__tests__/matchmakingRescue.test.js app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js app/catana/__tests__/HomeTableClient.matchmakingRescue.source.test.js --reporter=dot
```

Expected: FAIL because rescue state and delayed announcement behavior are
missing.

- [ ] **Step 3: Add elapsed and delayed-announcement state to the queue hook**

Keep `useLobbyHomeActions` as the only owner of match creation and polling. When
`play()` joins a result from `/api/matches/open`, mark
`createdNewPublicDuel: false`. When it creates a genuinely new duel, set it true
and start a 2000ms timeout calling `requestAnnouncement(matchID)`.

Store the timeout ID and announced match ID in refs. Clear them in
`cancelSearch`, successful match transition, Puffer transition, hook cleanup,
and before each new search. The server still performs final eligibility checks.

Use a one-second interval based on search start time for display only. It must
not affect queue or game state.

- [ ] **Step 4: Add the staged modal UI and account-menu control**

At 0–11 seconds, preserve the current compact timer and Cancel action. At 12
seconds, add honest copy:

> SettleHex is still in beta, so it can take a little while to find another
> player. You can keep your place here, or turn on Match alerts and come back
> when someone is looking.

Keep waiting remains the primary visual action and may collapse the expanded
copy without restarting the timer or creating a table. The alert control uses
provider state: Enable, On, Paused during game, Blocked, Unsupported, or
Unavailable. On iOS outside a Home Screen install, the first Enable click
changes the local treatment to install guidance. Enabling it does not close the
modal or stop polling.

At 30 seconds, reveal a low-emphasis text/secondary action: “Play Puffer”. Its
handler first leaves the public waiting table, then creates the
existing bot game. Alerts remain enabled during Puffer.

Add the same Match alerts state/control to `SystemAccountMenu` so players can
disable or re-enable it later. Permission prompts remain attached only to the
Enable click.

- [ ] **Step 5: Consume explicit Play Online query requests**

In the homepage, read `playOnline=1`, remove that key with `router.replace`, and
invoke the same `play()` action once account/session state is ready. This is the
stale-alert recovery path; it must not bypass normal open-table discovery.

- [ ] **Step 6: Run the queue-rescue tests**

```bash
pnpm exec vitest run app/catana/matchmaking/__tests__/matchmakingRescue.test.js app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js app/catana/__tests__/HomeTableClient.matchmakingRescue.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit the empty-queue rescue**

```bash
git add app/catana/matchmaking
git add app/catana/__tests__/HomeTableClient.matchmakingRescue.source.test.js app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js
git add -p app/catana/lobby/useLobbyHomeActions.js app/catana/home/HomeTableClient.js
git commit -m "feat: rescue slow public matchmaking"
```

---

### Task 8: Add static tab attention and best-effort sound

**Files:**
- Create: `app/catana/utils/tabAttention.js`
- Create: `app/catana/utils/__tests__/tabAttention.test.js`
- Consume: `public/match-alert-bell.svg` from Task 5
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/home/HomeTableClient.js`
- Create: `app/catana/__tests__/GameScreen.tabAttention.source.test.js`

**Interfaces:**
- Produces singleton `tabAttention.request(reason)` / `release(reason)` /
  `syncVisibility()` with reasons `match-found` and `your-turn`.
- Preserves and restores the exact pre-attention title/favicon.

- [ ] **Step 1: Write failing priority and restoration tests**

With fake document/head objects, assert:

- no title/favicon change while visible;
- hidden `your-turn` produces `🔔 Your turn · Settlehex`;
- hidden `match-found` produces `🔔 Match found · Settlehex` and outranks turn;
- releasing the higher-priority reason reveals the remaining one;
- visibility restoration returns the exact original title and favicon href;
- no interval or animation timer is created;
- duplicate request/release calls are idempotent.

Add source coverage that GameScreen activates only when the local human is the
current player and the game is actionable, releases on turn change, game-over,
and unmount, and relies on controller visibility sync for temporary metadata
restoration.

- [ ] **Step 2: Run focused tests and verify red**

```bash
pnpm exec vitest run app/catana/utils/__tests__/tabAttention.test.js app/catana/__tests__/GameScreen.tabAttention.source.test.js --reporter=dot
```

Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement one static attention controller**

Capture `document.title` and the current icon link before first mutation. Keep a
Set of active reasons and the fixed priority `match-found` before `your-turn`.
While hidden, set the selected static title and swap/create the icon link to
`/match-alert-bell.svg`. On visible state or no active reasons, restore the
captured values exactly and remove a link that the controller created. Listen
to one `visibilitychange` event; never use `setInterval` or title flashing.

Reuse the Task 5 high-contrast Catana bell; do not create a second attention
asset or overwrite the existing dirty-worktree `app/icon.svg`.

- [ ] **Step 4: Wire match-found and turn attention**

When queue polling discovers the opponent, request `match-found` before
navigating. Treat it as one-shot attention that survives the homepage route
transition and clears when the document becomes visible. Attempt one best-effort
playback of the existing
`/sounds/turn-start.mp3`; catch autoplay rejection and respect the existing
audio-muted preference.

In `GameScreen`, keep `your-turn` requested while the local player owns the
active actionable turn and the game is not over; the controller applies it only
while the document is hidden and restores metadata while visible. Release it on
turn change, game-over, and unmount. The existing
`turn:start` cue already allows hidden-tab audio; do not add a second turn sound
or alter audio policy.

- [ ] **Step 5: Run attention tests**

```bash
pnpm exec vitest run app/catana/utils/__tests__/tabAttention.test.js app/catana/__tests__/GameScreen.tabAttention.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 6: Commit the attention slice**

```bash
git add app/catana/utils/tabAttention.js app/catana/utils/__tests__/tabAttention.test.js app/catana/__tests__/GameScreen.tabAttention.source.test.js
git add -p app/catana/lobby/useLobbyHomeActions.js app/catana/GameScreen.js app/catana/home/HomeTableClient.js
git commit -m "feat: add subtle tab attention cues"
```

---

### Task 9: Resume alerts deliberately after human games and detach on sign-out

**Files:**
- Modify: `app/catana/components/GameOverModal.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/__tests__/GameOverModal.test.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`
- Modify: `app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js`

- [ ] **Step 1: Write failing postgame and sign-out tests**

Add coverage for:

- the checkbox appears only when preference is paused for the current match;
- its label is “Turn match alerts back on” and initial checked state is true;
- Return to lobby awaits `resume()` when checked;
- unchecked Return to lobby leaves the account paused;
- Close, View Postgame, and Replay/Rematch never resume alerts implicitly;
- a 409/temporary resume error keeps the postgame surface open with Retry and
  Continue without alerts actions;
- sign-out awaits `detachCurrentBrowser()` before `/api/account/logout`;
- server-detach failure presents an error and does not silently log out with
  the endpoint still attached to the account;
- local unsubscribe failure after a successful server detach does not block
  sign-out;
- accounts with no local subscription follow the existing sign-out path.

- [ ] **Step 2: Run the focused tests and verify red**

```bash
pnpm exec vitest run app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js --reporter=dot
```

Expected: FAIL because the postgame checkbox and detach order are absent.

- [ ] **Step 3: Add the conditional postgame control**

`GameScreen` derives:

```js
const canOfferAlertResume =
  matchAlerts.preference?.state === "paused" &&
  matchAlerts.preference?.pausedMatchId === matchID;
```

Pass `showMatchAlertResume`, `resumeMatchAlerts`, and the checked state into
`GameOverModal`. Initialize checked to true whenever the eligible modal opens.
On Return to lobby, await resume when checked. If it fails, remain on the modal,
show the returned error, and offer Retry plus Continue without alerts; the
explicit Continue action returns to the lobby with the preference still paused.
If unchecked, do not call the API. Do not attach resume to close,
replay/rematch, or postgame review.

- [ ] **Step 4: Make account detachment part of sign-out**

Inject/use `detachCurrentBrowser` in `useLobbyHomeActions.signOut`. When a local
subscription exists, remove its authenticated server association before calling
`/api/account/logout`. If that DELETE fails, set the existing account action
error and stop. If local `unsubscribe()` alone fails after DELETE succeeded,
log/report it but continue because the departing account is no longer mapped to
the endpoint. If there is no local subscription, preserve the current sign-out
behavior. Clear provider state only after logout succeeds.

- [ ] **Step 5: Run lifecycle tests**

```bash
pnpm exec vitest run app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 6: Commit the postgame/account lifecycle slice**

```bash
git add -p app/catana/components/GameOverModal.js app/catana/GameScreen.js app/catana/lobby/useLobbyHomeActions.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js
git commit -m "feat: manage match alert lifecycle"
```

---

### Task 10: Add deployment configuration, docs, and release evidence

**Files:**
- Modify: `.env.example`
- Modify: `infra/scripts/deploy-prod.sh`
- Modify: `infra/scripts/deploy-prod-from-git.sh`
- Modify: `server/__tests__/deploymentFiles.source.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Write failing deployment-contract assertions**

Extend `server/__tests__/deploymentFiles.source.test.js` to require all three
runtime variables in the example and both production preflight key lists:

```text
VAPID_SUBJECT
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

The example subject is `mailto:hello@settlehex.com`; key values remain blank.

- [ ] **Step 2: Run the deployment source test and verify red**

```bash
pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js --reporter=dot
```

Expected: FAIL because VAPID variables are not declared.

- [ ] **Step 3: Add runtime configuration contracts**

Append the three variables to `.env.example` with a short comment explaining
that they power opt-in Match alerts. Add them to the required-key arrays in both
production deploy scripts so a release fails before rebuild when secrets are
missing. Do not put private key material in Git, Docker Compose, logs, tests, or
client bundles; only `VAPID_PUBLIC_KEY` is returned through the authenticated
configuration API.

For local/manual verification, generate a disposable pair with
`pnpm exec web-push generate-vapid-keys --json` and place it only in the local
uncommitted environment. At the approved release gate, generate or retrieve the
production pair and install it directly in the server's `.env.prod`; never paste
the private key into documentation, Git, a PR, or chat output.

- [ ] **Step 4: Run configuration and focused feature tests**

```bash
pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js --reporter=dot
pnpm exec vitest run lib/server/__tests__/matchAlertStore.test.js lib/server/__tests__/humanMatchAlertPause.test.js lib/server/__tests__/matchAlertAnnouncement.test.js app/__tests__/api/matchAlertRoutes.test.js app/catana/matchAlerts/__tests__ app/catana/matchmaking/__tests__ app/catana/utils/__tests__/tabAttention.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Run repository verification in increasing scope**

```bash
pnpm -C game-core build
pnpm -C game-core test
pnpm lint
pnpm verify
```

Expected: all commands exit 0. If an unrelated dirty-worktree failure appears,
record the exact command/file and separate it from feature failures; do not edit
unrelated work to force green.

- [ ] **Step 6: Perform manual browser acceptance**

Start UI and server with the existing commands, then use two signed-in browser
profiles plus one bot flow. Record results in `docs/agent/PROGRESS.md`:

1. Profile A creates a new public duel; Profile B has active alerts. Verify no
   push before two seconds and one push after server verification.
2. Cancel A inside two seconds. Verify B receives no alert.
3. Have A join B's existing waiting duel. Verify no new seeker push is sent.
4. Leave A waiting: at 12 seconds see beta/liquidity copy and Enable/On status;
   at 30 seconds see the quiet Puffer action; Keep waiting remains primary.
5. Enable from the explicit CTA. Verify permission is requested once and the
   live queue is not cancelled.
6. Click the OS notification. Verify an existing SettleHex tab focuses, shows a
   secondary confirmation, and does not join before confirmation.
7. Fill/cancel the table before confirming. Verify stale copy and Keep looking
   re-enters the ordinary queue.
8. Confirm an open table. Verify both accounts become paused for the human game,
   no alerts are delivered during it, and the postgame checkbox defaults on.
9. Return to lobby checked and verify alerts resume; repeat unchecked and verify
   they remain paused. Verify Close/Replay does not resume.
10. Start Puffer with alerts active. Verify alerts stay active and an alert
    confirmation warns before leaving Puffer.
11. Hide the tab at match-found and on the local turn. Verify the static bell
    title/favicon, best-effort sound, and exact restoration with no flashing.
12. Sign out and verify the current endpoint is detached before the session is
    cleared.

On iPhone/iPad Safari, add the app to the Home Screen, enable notifications from
the installed app after a click, background it, and verify delivery/tap. Outside
the installed Home Screen app, verify the UI explains the install requirement
without requesting permission.

- [ ] **Step 7: Update agent documentation**

Add a dated, concise entry to `docs/agent/PROGRESS.md` covering the shipped
behavior and exact automated/manual evidence. Add architecture notes to
`docs/agent/NOTES.md`: schema tables, route boundaries, two-second authoritative
verification, no recipient cooldown, one event per match, human-game pause,
service-worker path, VAPID variables, and the no-worker-queue tradeoff.

- [ ] **Step 8: Commit the release-readiness slice**

```bash
git add -p .env.example infra/scripts/deploy-prod.sh infra/scripts/deploy-prod-from-git.sh server/__tests__/deploymentFiles.source.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: prepare match alerts for release"
```

- [ ] **Step 9: Stop at the production approval gate**

Report the verification evidence and remaining risks. Do not deploy. Ask for
explicit production approval; after approval, use the `settlex-release` skill
and the thorough GitHub Actions lane. This feature adds a production dependency,
new authenticated endpoints, and a database migration, which crosses the repo's
fast-beta-lane boundary even though the migration itself is additive.
