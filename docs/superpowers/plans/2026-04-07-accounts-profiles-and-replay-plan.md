# Accounts, Profiles, And Replay Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add guest-first real accounts, public profiles, public archived replays, and Postgres-backed finished-game history while keeping live bgio matches in memory for MVP.

**Architecture:** Keep `boardgame.io` as the live game engine and live seat-authority layer, but move product identity and durability into Settlex-owned Postgres tables. The web app owns guest sessions, claim-account magic links, and public profile/replay reads; the game server owns live execution and archives finished matches transactionally into Postgres before wiping the finished bgio copy after a short grace period.

**Tech Stack:** Next.js 13 app router, boardgame.io `0.50.2`, Node.js ESM, Postgres, `pg`, SMTP via `nodemailer`, Vitest, pnpm, Docker Compose, Caddy, OCI ARM VM

---

## Scope And Assumptions

- This plan assumes explicit approval to add the minimal new runtime dependencies:
  - `pg`
  - `nodemailer`
- This plan does **not** add restart-safe persistence for live matches.
- This plan does **not** add staging.
- This plan treats magic-link email as MVP claim auth and leaves password/social auth for later.
- This plan treats public replay as allowed to show full finished-game state because the match is over.

## File Structure

### Shared server-side data / account modules

- Create: `lib/server/db/getPool.js`
  - Shared Postgres pool for Next route handlers and the bgio server.
- Create: `lib/server/db/runMigrations.js`
  - Reads SQL files, tracks applied migrations, and applies pending ones.
- Create: `lib/server/db/sql/0001_accounts_archive.sql`
  - Accounts, emails, auth identities, guest sessions, username history, archived match tables, migrations table.
- Create: `lib/server/db/sql/0002_magic_links.sql`
  - Magic-link token tables and indexes.
- Create: `lib/server/accounts/normalizeUsername.js`
  - Canonical username normalization + validation.
- Create: `lib/server/accounts/createGuestAccount.js`
  - Transactionally create account + username history + guest session.
- Create: `lib/server/accounts/getSessionAccount.js`
  - Resolve current account from cookie.
- Create: `lib/server/accounts/updateGuestIdentity.js`
  - Update a guest account’s public username/avatar with uniqueness enforcement.
- Create: `lib/server/accounts/requestMagicLink.js`
  - Create one-time claim token and hand it to the email transport.
- Create: `lib/server/accounts/consumeMagicLink.js`
  - Verify magic link, mark email verified, and upgrade `guest` -> `claimed`.
- Create: `lib/server/email/createEmailTransport.js`
  - Console transport in local dev, SMTP transport in prod.
- Create: `lib/server/session/cookieNames.js`
  - Session cookie naming and attributes.
- Create: `lib/server/session/writeSessionCookie.js`
  - Serialize the opaque guest session into a secure cookie.
- Create: `lib/server/matches/createMatchForAccount.js`
  - Product-aware match creation wrapper around bgio lobby create/join.
- Create: `lib/server/matches/joinMatchForAccount.js`
  - Product-aware join wrapper that writes participant snapshots into match metadata.
- Create: `lib/server/matches/leaveMatchForAccount.js`
  - Product-aware leave wrapper.
- Create: `lib/server/profiles/getPublicProfile.js`
  - Query current account identity + summary counts + recent matches.
- Create: `lib/server/replays/getArchivedReplay.js`
  - Query archived replay payload + participant snapshots.
- Create: `lib/server/replays/buildReplayFrames.js`
  - Derive replay frames from archived `initial_state_json` + `log_json`.

### Next.js app routes and pages

- Create: `app/api/account/me/route.js`
  - Return the current account session state to the browser.
- Create: `app/api/account/guest/route.js`
  - Create guest account on first play or update current guest identity.
- Create: `app/api/account/claim/request/route.js`
  - Request a magic link for the current session account.
- Create: `app/api/account/claim/consume/route.js`
  - Consume magic link and finalize claim.
- Create: `app/api/matches/create/route.js`
  - Settlex-owned create-match endpoint.
- Create: `app/api/matches/join/route.js`
  - Settlex-owned join-match endpoint.
- Create: `app/api/matches/leave/route.js`
  - Settlex-owned leave-match endpoint.
- Create: `app/api/matches/[matchID]/route.js`
  - Settlex-owned match metadata read endpoint for lobby/match UI.
- Create: `app/u/[username]/page.js`
  - Public profile route.
- Create: `app/replays/[replayId]/page.js`
  - Server loader for archived replay payload.
- Create: `app/replays/[replayId]/ReplayPageClient.js`
  - Read-only replay player using derived frames.
- Create: `app/replays/components/ReplayControls.js`
  - Scrubber / next-prev controls.
- Create: `app/account/page.js`
  - Minimal current-account page with claim form + status.

### Existing UI entrypoints to modify

- Modify: `app/catana/lobby/LobbyPageClient.js`
  - Replace direct bgio lobby mutation calls with Settlex app APIs.
  - Load current account identity from `/api/account/me`.
  - Keep local UI feel the same.
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
  - Replace direct join/bot-fill/read flows with Settlex app APIs.
  - Point Socket.IO and game-server HTTP helpers at an env-driven game transport origin instead of hardcoded ports.
- Modify: `app/catana/utils/activeMatchStorage.js`
  - Keep seat-credential storage for live reconnect, but add current account metadata if helpful for UX.
- Modify: `app/layout.js`
  - Add same-origin account/replay/profile navigation wiring if needed.
- Modify: `app/page.js`
  - Link into the same hosted flow if homepage entry changes are needed.
- Modify: `app/catana/GameScreen.js`
  - Accept `isReplay` / replay-safe props to disable live interactions on archived replay pages.
- Modify: `app/catana/components/PlayerActionContainer.js`
  - Guard interactive controls in replay mode.

### Game-server archival and cleanup

- Create: `server/archive/ArchiveManager.js`
  - Watches live state + matchData updates, archives finished matches exactly once, and schedules cleanup.
- Create: `server/archive/archiveFinishedMatch.js`
  - Transactionally insert `archived_matches`, `archived_match_players`, and `archived_match_replays`.
- Create: `server/archive/cleanupArchivedMatch.js`
  - Remove successfully archived finished matches from bgio live storage after grace period.
- Modify: `server/server.js`
  - Create and wire `ArchiveManager`.
- Modify: `server/timers/timerPubSub.js`
  - Forward live state and matchData into `ArchiveManager`.

### Infra / deployment / developer workflow

- Modify: `package.json`
  - Add `db:migrate`, `db:migrate:test`, and any required local-prod workflow scripts.
- Create: `scripts/db/migrate.mjs`
  - Run pending SQL migrations via `runMigrations.js`.
- Create: `Dockerfile.web`
  - Next.js production image for the web service.
- Create: `Dockerfile.game`
  - bgio server production image.
- Create: `infra/docker-compose.local.yml`
  - Local Postgres container only.
- Create: `infra/docker-compose.prod.yml`
  - `proxy`, `web`, `game`, `postgres` services.
- Create: `infra/Caddyfile`
  - TLS, same-host routing, and websocket proxying to the game service.
- Create: `.env.example`
  - Document required env vars.
- Create: `docs/deploy/oci-mvp.md`
  - Exact local-dev and push-live workflow for this stack.

### Tests

- Create: `lib/server/__tests__/dbMigrations.test.js`
- Create: `lib/server/__tests__/guestAccounts.test.js`
- Create: `lib/server/__tests__/magicLinks.test.js`
- Create: `lib/server/__tests__/matchBootstrap.test.js`
- Create: `lib/server/__tests__/publicProfile.test.js`
- Create: `lib/server/__tests__/replayFrames.test.js`
- Create: `app/__tests__/api/accountGuestRoute.test.js`
- Create: `app/__tests__/api/accountClaimRoute.test.js`
- Create: `app/__tests__/api/matchRoutes.test.js`
- Create: `app/__tests__/profilePage.test.js`
- Create: `app/__tests__/replayPage.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.identity.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.playVsBot.test.js`
- Modify: `app/catana/__tests__/MatchPageClient.botFill.test.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`
- Modify: `server/__tests__/timerPubSub.test.js`
- Create: `server/__tests__/ArchiveManager.test.js`
- Create: `server/__tests__/deploymentFiles.source.test.js`

## Developer Workflow

### Local development after this feature

Expected local routine:

1. Start only Postgres in OrbStack:
```bash
docker compose -f infra/docker-compose.local.yml up -d postgres
```
2. Run migrations:
```bash
pnpm db:migrate
```
3. Start the live game server:
```bash
pnpm serve
```
4. Start the web app:
```bash
pnpm dev
```
5. Open the app normally. The same web app and bgio server code now talk to local Postgres because `DATABASE_URL` points at the local container, not prod.
6. First-play identity creates a guest account in local Postgres only, and archived finished matches also stay local.
7. The browser still talks to the local game server directly for live play because `NEXT_PUBLIC_GAME_SERVER_ORIGIN` points at the local game process.
8. Magic-link requests in local dev should log the link URL to the terminal instead of requiring a real email provider.

### Pushing live after this feature

Expected production routine on the OCI VM:

1. Push code to the repo as usual.
2. SSH into the VM and pull the new commit.
3. Rebuild and restart the web + game containers:
```bash
docker compose -f infra/docker-compose.prod.yml up -d --build web game
```
4. Run DB migrations against the prod Postgres container:
```bash
docker compose -f infra/docker-compose.prod.yml exec web pnpm db:migrate
```
5. The same app and game code now talk to prod Postgres because the prod env file points `DATABASE_URL` at the VM-local Postgres service.
6. Finished archived matches and accounts survive because they live in Postgres.
7. In prod, Caddy fronts both the web app and game transport on one public host, so `NEXT_PUBLIC_GAME_SERVER_ORIGIN` can be the same site origin.
8. Live in-progress matches may die on restart; that is accepted MVP behavior.

## Assumptions To Keep During Implementation

- Product identity must never depend on localStorage alone again.
- Raw bgio lobby mutation routes are not public browser APIs after this rollout.
- bgio seat credentials stay match-scoped and browser-local for reconnect convenience.
- Archive writes must be unique on `bgio_match_id` and fully transactional.
- Bots must archive as bot participants, not as fake human accounts.
- Public replay must be read-only and interaction-safe.
- Finished bgio matches must be cleaned from live memory after archival and a short grace period.

### Task 1: Add Postgres foundation, migrations, and env-backed scripts

**Files:**
- Modify: `package.json`
- Create: `lib/server/db/getPool.js`
- Create: `lib/server/db/runMigrations.js`
- Create: `lib/server/db/sql/0001_accounts_archive.sql`
- Create: `lib/server/db/sql/0002_magic_links.sql`
- Create: `scripts/db/migrate.mjs`
- Create: `lib/server/__tests__/dbMigrations.test.js`
- Create: `.env.example`

- [ ] **Step 1: Write the failing migration-runner test**

Create `lib/server/__tests__/dbMigrations.test.js` with a contract like:

```js
import { describe, expect, it } from "vitest";
import { listMigrationFiles } from "../db/runMigrations.js";

describe("db migrations", () => {
  it("loads SQL files in filename order", async () => {
    const files = await listMigrationFiles();
    expect(files.map((file) => file.name)).toEqual([
      "0001_accounts_archive.sql",
      "0002_magic_links.sql"
    ]);
  });
});
```

- [ ] **Step 2: Run the migration test to verify RED**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js
```

Expected: FAIL because the shared db runner does not exist yet.

- [ ] **Step 3: Add the minimal runtime dependencies**

Run:
```bash
pnpm add pg nodemailer
```

Then update `package.json` scripts to include:

```json
{
  "scripts": {
    "db:migrate": "node scripts/db/migrate.mjs",
    "db:migrate:test": "SETTLEX_ENV=test node scripts/db/migrate.mjs"
  }
}
```

- [ ] **Step 4: Implement the migration foundation**

Implement:
- `lib/server/db/getPool.js`
  - singleton `pg.Pool`
  - reads `DATABASE_URL`
- `lib/server/db/runMigrations.js`
  - creates a `schema_migrations` table
  - loads SQL files from `lib/server/db/sql`
  - applies pending files inside transactions
- `scripts/db/migrate.mjs`
  - calls `runMigrations()`
- `.env.example`
  - document `DATABASE_URL`, `SESSION_SECRET`, `GAME_SERVER_INTERNAL_URL`, `NEXT_PUBLIC_GAME_SERVER_ORIGIN`, `PUBLIC_APP_URL`, and SMTP vars

- [ ] **Step 5: Write the first SQL migration**

Create `0001_accounts_archive.sql` with tables for:
- `accounts`
- `account_emails`
- `auth_identities`
- `guest_sessions`
- `username_history`
- `archived_matches`
- `archived_match_players`
- `archived_match_replays`

Include:
- unique index on `accounts.current_username`
- unique index on `archived_matches.bgio_match_id`
- fields needed for `auth_identities.provider = 'magic_link'` now and more providers later
- nullable `account_id` plus `participant_type` / `bot_key` on archived players

- [ ] **Step 6: Write the second SQL migration**

Create `0002_magic_links.sql` with:
- `magic_link_tokens`
- unique token hash index
- expiry fields
- consumed timestamp

- [ ] **Step 7: Run the migration test to verify GREEN**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js
```

Expected: PASS.

- [ ] **Step 8: Run the migrations locally**

Run:
```bash
docker compose -f infra/docker-compose.local.yml up -d postgres
pnpm db:migrate
```

Expected: migration runner prints that `0001_accounts_archive.sql` and `0002_magic_links.sql` applied successfully.

- [ ] **Step 9: Commit the Postgres foundation**

```bash
git add package.json pnpm-lock.yaml .env.example lib/server/db/getPool.js lib/server/db/runMigrations.js lib/server/db/sql/0001_accounts_archive.sql lib/server/db/sql/0002_magic_links.sql scripts/db/migrate.mjs lib/server/__tests__/dbMigrations.test.js
git commit -m "feat: add postgres migration foundation"
```

### Task 2: Build guest accounts, usernames, and server-backed guest sessions

**Files:**
- Create: `lib/server/accounts/normalizeUsername.js`
- Create: `lib/server/accounts/createGuestAccount.js`
- Create: `lib/server/accounts/getSessionAccount.js`
- Create: `lib/server/accounts/updateGuestIdentity.js`
- Create: `lib/server/session/cookieNames.js`
- Create: `lib/server/session/writeSessionCookie.js`
- Create: `lib/server/__tests__/guestAccounts.test.js`
- Create: `app/api/account/me/route.js`
- Create: `app/api/account/guest/route.js`
- Create: `app/__tests__/api/accountGuestRoute.test.js`

- [ ] **Step 10: Write the failing account-domain tests**

Create `lib/server/__tests__/guestAccounts.test.js` with contracts like:

```js
it("creates a guest account, username history row, and guest session together", async () => {
  const result = await createGuestAccount({
    username: "Ada",
    avatarEmoji: "🤠",
    avatarColor: "sky"
  });

  expect(result.account.status).toBe("guest");
  expect(result.account.currentUsername).toBe("Ada");
  expect(result.session.token).toBeTypeOf("string");
});

it("rejects duplicate usernames", async () => {
  await createGuestAccount({ username: "Ada", avatarEmoji: "😀", avatarColor: "sky" });
  await expect(
    createGuestAccount({ username: "Ada", avatarEmoji: "😎", avatarColor: "amber" })
  ).rejects.toThrow(/username/i);
});
```

- [ ] **Step 11: Run the guest-account test to verify RED**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/guestAccounts.test.js
```

Expected: FAIL because the account/session modules do not exist yet.

- [ ] **Step 12: Write the failing API route test**

Create `app/__tests__/api/accountGuestRoute.test.js` with a route contract like:

```js
it("creates a guest account and sets a session cookie", async () => {
  const { POST } = await import("@/app/api/account/guest/route.js");
  const request = new Request("http://localhost/api/account/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Ada",
      avatarEmoji: "🤠",
      avatarColor: "sky"
    })
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("settlex_session=");
});
```

- [ ] **Step 13: Run the route test to verify RED**

Run:
```bash
pnpm exec vitest run app/__tests__/api/accountGuestRoute.test.js
```

Expected: FAIL because the route does not exist yet.

- [ ] **Step 14: Implement the account/session modules**

Implement:
- `normalizeUsername.js`
  - trim, collapse whitespace, validate allowed length/characters
- `createGuestAccount.js`
  - transaction:
    - insert account
    - insert username history
    - insert hashed guest session token
- `getSessionAccount.js`
  - resolve cookie -> session -> account
- `updateGuestIdentity.js`
  - allow guest identity refresh on the same account if needed
- `cookieNames.js` + `writeSessionCookie.js`
  - secure cookie config

- [ ] **Step 15: Implement the account routes**

Implement:
- `app/api/account/me/route.js`
  - returns current account or `null`
- `app/api/account/guest/route.js`
  - creates a guest account if no current account exists
  - updates guest identity if the current session is still a guest
  - sets the guest session cookie

- [ ] **Step 16: Run the focused account tests to verify GREEN**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/guestAccounts.test.js app/__tests__/api/accountGuestRoute.test.js
```

Expected: PASS.

- [ ] **Step 17: Commit guest accounts and session cookies**

```bash
git add lib/server/accounts/normalizeUsername.js lib/server/accounts/createGuestAccount.js lib/server/accounts/getSessionAccount.js lib/server/accounts/updateGuestIdentity.js lib/server/session/cookieNames.js lib/server/session/writeSessionCookie.js lib/server/__tests__/guestAccounts.test.js app/api/account/me/route.js app/api/account/guest/route.js app/__tests__/api/accountGuestRoute.test.js
git commit -m "feat: add guest accounts and session cookies"
```

### Task 3: Replace direct browser bgio lobby mutations with Settlex-owned match APIs

**Files:**
- Create: `lib/server/matches/createMatchForAccount.js`
- Create: `lib/server/matches/joinMatchForAccount.js`
- Create: `lib/server/matches/leaveMatchForAccount.js`
- Create: `lib/server/__tests__/matchBootstrap.test.js`
- Create: `app/api/matches/create/route.js`
- Create: `app/api/matches/join/route.js`
- Create: `app/api/matches/leave/route.js`
- Create: `app/api/matches/[matchID]/route.js`
- Create: `app/__tests__/api/matchRoutes.test.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Modify: `app/catana/utils/activeMatchStorage.js`
- Modify: `app/catana/__tests__/LobbyPageClient.identity.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.playVsBot.test.js`
- Modify: `app/catana/__tests__/MatchPageClient.botFill.test.js`

- [ ] **Step 18: Write the failing match-bootstrap test**

Create `lib/server/__tests__/matchBootstrap.test.js` with contracts like:

```js
it("creates a bgio match and joins seat 0 using the current account snapshot", async () => {
  const result = await createMatchForAccount({
    account: { id: "acct_1", currentUsername: "Ada", avatarEmoji: "🤠", avatarColor: "sky" },
    numPlayers: 2
  });

  expect(result.playerID).toBe("0");
  expect(result.playerCredentials).toBeTypeOf("string");
  expect(result.matchData.players["0"].data).toMatchObject({
    participantType: "human",
    accountId: "acct_1",
    usernameSnapshot: "Ada"
  });
});
```

- [ ] **Step 19: Run the bootstrap test to verify RED**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js
```

Expected: FAIL because the product-aware wrappers do not exist.

- [ ] **Step 20: Write the failing client route tests**

Create `app/__tests__/api/matchRoutes.test.js` for:
- `/api/matches/create`
- `/api/matches/join`
- `/api/matches/leave`
- `/api/matches/[matchID]`

The route tests should assert:
- they require a current Settlex session,
- they call the wrapper layer instead of letting the browser hit bgio mutations directly,
- they return the same `playerCredentials` shape the current UI needs.

- [ ] **Step 21: Run the route test to verify RED**

Run:
```bash
pnpm exec vitest run app/__tests__/api/matchRoutes.test.js
```

Expected: FAIL because the routes do not exist yet.

- [ ] **Step 22: Implement product-aware match wrappers and APIs**

Implement:
- wrapper functions that call the internal game server lobby endpoints via `GAME_SERVER_INTERNAL_URL`
- pass participant snapshots in `data`
- read match metadata through the app-owned route
- keep existing seat credential localStorage behavior for live reconnects

The payload written to bgio seat metadata should look like:

```js
{
  participantType: "human",
  accountId: account.id,
  usernameSnapshot: account.currentUsername,
  avatarSnapshot: {
    emoji: account.avatarEmoji,
    color: account.avatarColor
  }
}
```

- [ ] **Step 23: Switch the Catana lobby and match clients**

Modify:
- `LobbyPageClient.js`
  - fetch `/api/account/me` on load
  - submit guest creation through `/api/account/guest`
  - use `/api/matches/*` instead of raw `:8080/games/...` mutation routes
- `MatchPageClient.js`
  - read match metadata from `/api/matches/[matchID]`
  - join through `/api/matches/join`
  - leave through `/api/matches/leave`
  - target `NEXT_PUBLIC_GAME_SERVER_ORIGIN` for live gameplay and timer calls, with localhost in dev and same-origin in prod

- [ ] **Step 24: Run focused web tests to verify GREEN**

Run:
```bash
pnpm exec vitest run \
  lib/server/__tests__/matchBootstrap.test.js \
  app/__tests__/api/matchRoutes.test.js \
  app/catana/__tests__/LobbyPageClient.identity.test.js \
  app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js \
  app/catana/__tests__/LobbyPageClient.playVsBot.test.js \
  app/catana/__tests__/MatchPageClient.botFill.test.js
```

Expected: PASS.

- [ ] **Step 25: Commit the match bootstrap migration**

```bash
git add lib/server/matches/createMatchForAccount.js lib/server/matches/joinMatchForAccount.js lib/server/matches/leaveMatchForAccount.js lib/server/__tests__/matchBootstrap.test.js app/api/matches/create/route.js app/api/matches/join/route.js app/api/matches/leave/route.js app/api/matches/[matchID]/route.js app/__tests__/api/matchRoutes.test.js app/catana/lobby/LobbyPageClient.js app/catana/lobby/[matchID]/MatchPageClient.js app/catana/utils/activeMatchStorage.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/MatchPageClient.botFill.test.js
git commit -m "feat: route match bootstrap through app api"
```

### Task 4: Archive finished matches transactionally and clean finished bgio matches from memory

**Files:**
- Create: `server/archive/ArchiveManager.js`
- Create: `server/archive/archiveFinishedMatch.js`
- Create: `server/archive/cleanupArchivedMatch.js`
- Create: `server/__tests__/ArchiveManager.test.js`
- Modify: `server/server.js`
- Modify: `server/timers/timerPubSub.js`
- Modify: `server/__tests__/timerPubSub.test.js`

- [ ] **Step 26: Write the failing archive-manager tests**

Create `server/__tests__/ArchiveManager.test.js` with contracts like:

```js
it("archives a finished match exactly once by bgio_match_id", async () => {
  const archiveFinishedMatch = vi.fn().mockResolvedValue({ archived: true });
  const cleanupArchivedMatch = vi.fn();
  const manager = new ArchiveManager({ archiveFinishedMatch, cleanupArchivedMatch, graceMs: 10 });

  await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });
  await manager.onState("m1", { ctx: { gameover: { winner: "0" } } });

  expect(archiveFinishedMatch).toHaveBeenCalledTimes(1);
});

it("cleans up the finished bgio match after archive succeeds", async () => {
  // ...
});
```

- [ ] **Step 27: Run the archive-manager test to verify RED**

Run:
```bash
pnpm exec vitest run server/__tests__/ArchiveManager.test.js
```

Expected: FAIL because the archive manager does not exist.

- [ ] **Step 28: Write the failing transactional archive test**

Add a test that `archiveFinishedMatch.js`:
- inserts one `archived_matches` row keyed by `bgio_match_id`
- inserts participant rows with `participant_type`
- stores `initialState`, `final state`, and `log`
- no-ops safely on duplicate `bgio_match_id`

- [ ] **Step 29: Implement archival and cleanup**

Implement:
- `archiveFinishedMatch.js`
  - fetch full bgio record from the live server DB
  - insert archive rows in one Postgres transaction
  - use unique `bgio_match_id` for idempotency
- `cleanupArchivedMatch.js`
  - call bgio DB wipe only after archive success and grace timeout
- `ArchiveManager.js`
  - watch state updates for `ctx.gameover`
  - guard against duplicate archive attempts
  - schedule cleanup
- `server/server.js`
  - instantiate and pass the manager into the pubsub layer
- `server/timers/timerPubSub.js`
  - forward live state and matchData into the archive manager

- [ ] **Step 30: Run focused server tests to verify GREEN**

Run:
```bash
pnpm exec vitest run server/__tests__/ArchiveManager.test.js server/__tests__/timerPubSub.test.js
```

Expected: PASS.

- [ ] **Step 31: Commit the archive pipeline**

```bash
git add server/archive/ArchiveManager.js server/archive/archiveFinishedMatch.js server/archive/cleanupArchivedMatch.js server/__tests__/ArchiveManager.test.js server/server.js server/timers/timerPubSub.js server/__tests__/timerPubSub.test.js
git commit -m "feat: archive finished matches to postgres"
```

### Task 5: Build public profile pages from archived match data

**Files:**
- Create: `lib/server/profiles/getPublicProfile.js`
- Create: `lib/server/__tests__/publicProfile.test.js`
- Create: `app/u/[username]/page.js`
- Create: `app/__tests__/profilePage.test.js`

- [ ] **Step 32: Write the failing profile-query test**

Create `lib/server/__tests__/publicProfile.test.js` with a contract like:

```js
it("returns current identity, summary counts, and recent matches", async () => {
  const profile = await getPublicProfile("Ada");

  expect(profile.account.currentUsername).toBe("Ada");
  expect(profile.summary).toMatchObject({
    totalGames: 3,
    wins: 2,
    losses: 1
  });
  expect(profile.recentMatches[0]).toHaveProperty("replayId");
});
```

- [ ] **Step 33: Run the profile-query test to verify RED**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/publicProfile.test.js
```

Expected: FAIL because the query module does not exist.

- [ ] **Step 34: Write the failing page test**

Create `app/__tests__/profilePage.test.js` that loads `app/u/[username]/page.js` and asserts:
- the page reads profile data through `getPublicProfile`
- username, avatar, joined date, and recent matches are rendered
- replay links point at `/replays/:id`

- [ ] **Step 35: Implement the query + page**

Implement:
- `getPublicProfile.js`
  - lookup account by current username
  - aggregate total games / wins / losses from archived tables
  - return recent archived matches
- `app/u/[username]/page.js`
  - render server-side public profile UI

- [ ] **Step 36: Run the focused profile tests to verify GREEN**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/publicProfile.test.js app/__tests__/profilePage.test.js
```

Expected: PASS.

- [ ] **Step 37: Commit public profiles**

```bash
git add lib/server/profiles/getPublicProfile.js lib/server/__tests__/publicProfile.test.js app/u/[username]/page.js app/__tests__/profilePage.test.js
git commit -m "feat: add public profile pages"
```

### Task 6: Build public read-only replay pages on archived data

**Files:**
- Create: `lib/server/replays/getArchivedReplay.js`
- Create: `lib/server/replays/buildReplayFrames.js`
- Create: `lib/server/__tests__/replayFrames.test.js`
- Create: `app/replays/[replayId]/page.js`
- Create: `app/replays/[replayId]/ReplayPageClient.js`
- Create: `app/replays/components/ReplayControls.js`
- Create: `app/__tests__/replayPage.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`

- [ ] **Step 38: Write the failing replay-frame builder test**

Create `lib/server/__tests__/replayFrames.test.js` with a contract like:

```js
it("builds sequential replay frames from archived initial state and log", () => {
  const frames = buildReplayFrames({
    initialState,
    log
  });

  expect(frames).toHaveLength(log.length + 1);
  expect(frames[0].G).toEqual(initialState.G);
  expect(frames.at(-1).ctx.gameover).toBeTruthy();
});
```

- [ ] **Step 39: Run the replay-frame test to verify RED**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/replayFrames.test.js
```

Expected: FAIL because the frame builder does not exist.

- [ ] **Step 40: Write the failing replay page test**

Create `app/__tests__/replayPage.test.js` asserting:
- the page loads archived replay data by replay id
- `ReplayPageClient` receives replay metadata and frame data
- controls render a scrubber / prev-next UI

- [ ] **Step 41: Implement replay frame derivation and read-only UI**

Implement:
- `getArchivedReplay.js`
  - load archived replay + participants
- `buildReplayFrames.js`
  - derive replay snapshots from archived `initial_state_json` + `log_json`
- `ReplayPageClient.js`
  - hold frame index in client state
  - render selected frame through `GameScreen`
- `ReplayControls.js`
  - prev / next / range input
- `GameScreen.js` and `PlayerActionContainer.js`
  - accept `isReplay`
  - disable all gameplay actions and live-only affordances in replay mode

- [ ] **Step 42: Run replay-focused tests to verify GREEN**

Run:
```bash
pnpm exec vitest run \
  lib/server/__tests__/replayFrames.test.js \
  app/__tests__/replayPage.test.js \
  app/catana/__tests__/GameScreen.gameOver.test.js
```

Expected: PASS.

- [ ] **Step 43: Commit archived replay pages**

```bash
git add lib/server/replays/getArchivedReplay.js lib/server/replays/buildReplayFrames.js lib/server/__tests__/replayFrames.test.js app/replays/[replayId]/page.js app/replays/[replayId]/ReplayPageClient.js app/replays/components/ReplayControls.js app/__tests__/replayPage.test.js app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/GameScreen.gameOver.test.js
git commit -m "feat: add archived replay pages"
```

### Task 7: Add claim-account magic-link flow and minimal account UI

**Files:**
- Create: `lib/server/accounts/requestMagicLink.js`
- Create: `lib/server/accounts/consumeMagicLink.js`
- Create: `lib/server/email/createEmailTransport.js`
- Create: `lib/server/__tests__/magicLinks.test.js`
- Create: `app/api/account/claim/request/route.js`
- Create: `app/api/account/claim/consume/route.js`
- Create: `app/account/page.js`
- Create: `app/__tests__/api/accountClaimRoute.test.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`

- [ ] **Step 44: Write the failing magic-link tests**

Create `lib/server/__tests__/magicLinks.test.js` with contracts like:

```js
it("creates a one-time token and upgrades the same account on consume", async () => {
  const request = await requestMagicLink({ accountId: "acct_1", email: "ada@example.com" });
  await consumeMagicLink({ token: request.rawToken });

  const account = await getAccount("acct_1");
  expect(account.status).toBe("claimed");
});

it("rejects expired or consumed tokens", async () => {
  // ...
});
```

- [ ] **Step 45: Run the magic-link test to verify RED**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/magicLinks.test.js
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 46: Write the failing claim-route test**

Create `app/__tests__/api/accountClaimRoute.test.js` asserting:
- `/api/account/claim/request` requires an authenticated current account
- local dev transport returns/logs a link without SMTP
- `/api/account/claim/consume` verifies the token and preserves the same `accountId`

- [ ] **Step 47: Implement the claim flow**

Implement:
- `createEmailTransport.js`
  - local/dev: log magic-link URL to console
  - prod: SMTP transport from env
- `requestMagicLink.js`
  - create hashed token with expiry
  - store token row
  - build claim URL using `PUBLIC_APP_URL`
- `consumeMagicLink.js`
  - verify token hash + expiry + unused state
  - mark email verified
  - upgrade account to `claimed`
  - mark token consumed
- account claim routes
- `app/account/page.js`
  - show current identity
  - allow entering email and requesting claim link
- add an `Account` link in the Catana lobby/match UI

- [ ] **Step 48: Run focused claim-flow tests to verify GREEN**

Run:
```bash
pnpm exec vitest run \
  lib/server/__tests__/magicLinks.test.js \
  app/__tests__/api/accountClaimRoute.test.js
```

Expected: PASS.

- [ ] **Step 49: Commit magic-link claim flow**

```bash
git add lib/server/accounts/requestMagicLink.js lib/server/accounts/consumeMagicLink.js lib/server/email/createEmailTransport.js lib/server/__tests__/magicLinks.test.js app/api/account/claim/request/route.js app/api/account/claim/consume/route.js app/account/page.js app/__tests__/api/accountClaimRoute.test.js app/catana/lobby/LobbyPageClient.js app/catana/lobby/[matchID]/MatchPageClient.js
git commit -m "feat: add magic link account claiming"
```

### Task 8: Add OCI/Compose deployment files and document local-dev and push-live workflow

**Files:**
- Create: `Dockerfile.web`
- Create: `Dockerfile.game`
- Create: `infra/docker-compose.local.yml`
- Create: `infra/docker-compose.prod.yml`
- Create: `infra/Caddyfile`
- Create: `docs/deploy/oci-mvp.md`
- Modify: `package.json`

- [ ] **Step 50: Write the failing deployment-doc/source test**

Create a lightweight source-contract test such as `app/__tests__/deploymentDocs.test.js` or `server/__tests__/deploymentFiles.source.test.js` that asserts:
- local compose file includes Postgres only
- prod compose file includes `proxy`, `web`, `game`, `postgres`
- Caddy config proxies websocket traffic to the game service

- [ ] **Step 51: Run the deployment source test to verify RED**

Run:
```bash
pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js
```

Expected: FAIL because the infra files do not exist.

- [ ] **Step 52: Implement the local + prod container files**

Implement:
- `Dockerfile.web`
- `Dockerfile.game`
- `infra/docker-compose.local.yml`
  - Postgres only
- `infra/docker-compose.prod.yml`
  - Caddy
  - web
  - game
  - postgres
- `infra/Caddyfile`
  - route normal web traffic to `web`
  - route websocket/game traffic to `game`
- `docs/deploy/oci-mvp.md`
  - exact local-dev commands
  - exact production deploy commands
  - required env vars and file locations

- [ ] **Step 53: Run the deployment source test to verify GREEN**

Run:
```bash
pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js
```

Expected: PASS.

- [ ] **Step 54: Smoke the local developer workflow**

Run:
```bash
docker compose -f infra/docker-compose.local.yml up -d postgres
pnpm db:migrate
pnpm serve
pnpm dev
```

Expected:
- migrations succeed
- web app starts
- bgio server starts
- local browser can create a guest account and create/join a match without touching prod data

- [ ] **Step 55: Commit deployment and workflow docs**

```bash
git add Dockerfile.web Dockerfile.game infra/docker-compose.local.yml infra/docker-compose.prod.yml infra/Caddyfile docs/deploy/oci-mvp.md package.json server/__tests__/deploymentFiles.source.test.js
git commit -m "chore: add oci compose deployment workflow"
```

### Task 9: Update agent docs and run final verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 56: Update agent docs**

Add:
- the new account/session boundary note
- the archive + cleanup rule
- the local-dev vs prod workflow note
- the same-host websocket routing note

- [ ] **Step 57: Run the focused final verification suite**

Run:
```bash
pnpm exec vitest run \
  lib/server/__tests__/dbMigrations.test.js \
  lib/server/__tests__/guestAccounts.test.js \
  lib/server/__tests__/magicLinks.test.js \
  lib/server/__tests__/matchBootstrap.test.js \
  lib/server/__tests__/publicProfile.test.js \
  lib/server/__tests__/replayFrames.test.js \
  app/__tests__/api/accountGuestRoute.test.js \
  app/__tests__/api/accountClaimRoute.test.js \
  app/__tests__/api/matchRoutes.test.js \
  app/__tests__/profilePage.test.js \
  app/__tests__/replayPage.test.js \
  app/catana/__tests__/LobbyPageClient.identity.test.js \
  app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js \
  app/catana/__tests__/LobbyPageClient.playVsBot.test.js \
  app/catana/__tests__/MatchPageClient.botFill.test.js \
  app/catana/__tests__/GameScreen.gameOver.test.js \
  server/__tests__/ArchiveManager.test.js \
  server/__tests__/timerPubSub.test.js \
  server/__tests__/deploymentFiles.source.test.js
```

Expected: PASS.

- [ ] **Step 58: Run lint and broader project verification**

Run:
```bash
pnpm lint
pnpm verify
```

Expected:
- targeted new work passes
- if unrelated existing warnings/failures remain, record them explicitly before merging

- [ ] **Step 59: Commit doc updates and final integration pass**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record accounts and replay implementation notes"
```

## Plan Review Checklist

Before execution, confirm:
- app-owned APIs fully replace public browser dependence on raw bgio lobby mutations
- archive path is transactional + idempotent
- finished bgio matches are cleaned from memory after archival
- bots archive cleanly
- local dev uses local Postgres only
- local dev uses an explicit local game-server origin while prod collapses to one public host via Caddy
- prod deploy instructions do not require exposing Postgres publicly
