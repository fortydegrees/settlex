# Accounts, Profiles, And Replay Design

Date: 2026-04-07
Scope: Guest-first accounts, public profiles, finished-game archive, public replay pages, and local/prod persistence setup for Catana MVP on one OCI ARM VM
Status: Approved for implementation

## Goal

Add real persistent player identity and finished-game history without adding upfront login friction or locking Settlex into a disposable MVP architecture.

For this slice:
- first play should still feel like "pick a username + avatar and enter a game",
- that action should create a real server-backed account immediately,
- finished games should be stored forever,
- public profile pages should show basic identity and match history,
- finished games should have public read-only replay pages,
- local development and production should use clearly separated data stores.

## Non-goals

- No restart-safe persistence for live in-progress matches in this MVP.
- No staging environment in this MVP.
- No social login in this MVP.
- No account merge flow in this MVP.
- No bot profile pages.
- No deep analytics or advanced per-resource stats.
- No abuse-control, anti-squatting, or rate-limit design beyond recording the need for later.
- No detailed backup/restore implementation in this spec.
- No final email-delivery provider decision in this spec.
- No requirement to replace `boardgame.io` as the live game engine.

## Current State

Today, identity and live matchmaking are still mostly browser-local:

- [app/catana/lobby/LobbyPageClient.js](/Users/david/coding/settlex/app/catana/lobby/LobbyPageClient.js) stores player name, emoji, and color in localStorage and calls the raw `boardgame.io` lobby endpoints directly.
- [app/catana/lobby/[matchID]/MatchPageClient.js](/Users/david/coding/settlex/app/catana/lobby/[matchID]/MatchPageClient.js) reads per-seat bgio credentials from localStorage and passes them to the live client.
- [app/catana/utils/activeMatchStorage.js](/Users/david/coding/settlex/app/catana/utils/activeMatchStorage.js) stores only "last active match" convenience data in localStorage.
- [server/server.js](/Users/david/coding/settlex/server/server.js) does not inject a custom bgio storage adapter, so the current `boardgame.io@0.50.2` setup uses the default server DB path, which is in-memory unless configured otherwise.

That is acceptable for anonymous live seats, but not for:
- globally unique usernames,
- public profiles,
- future username changes,
- persistent history,
- replay pages,
- cross-device identity recovery.

## Product Rules

- Usernames are globally unique and reserved immediately when the account is created.
- First play creates a real `guest` account; there is no visible registration wall before entering a game.
- The browser should still "just remember me" on the same device, but that memory must come from a real server-backed guest session.
- Profiles are public by default at `/u/:username`.
- Finished-game replay pages are public by default.
- Finished games are kept forever.
- Usernames may change later; this MVP does not need the cooldown policy, but the data model must support it.
- Live in-progress games may be lost on server restart in this MVP.
- `boardgame.io` seat credentials and Settlex account sessions are different tokens and must stay different.

## Recommended Approach

Use app-owned Postgres tables for identity and archive data, while keeping `boardgame.io` as the live match engine with in-memory live state.

This is the recommended middle path:

- stronger than "just persist whatever bgio does",
- much smaller than replacing bgio with a custom live game platform,
- clean enough that future auth, stats, and deployment changes do not force a rewrite.

Core rule:
- `boardgame.io` owns live match execution and live seat authority,
- Settlex owns accounts, usernames, sessions, profiles, and archived finished-match history.

## Architecture

### Runtime shape

MVP services:

- `web`
  - Next.js UI,
  - account/session APIs,
  - profile pages,
  - replay pages,
  - match bootstrap APIs.
- `game`
  - live `boardgame.io` server,
  - live lobby/create/join bridge,
  - end-of-game archive writer.
- `postgres`
  - Settlex account/profile/archive database.

### Responsibility split

The browser should stop treating the raw bgio lobby API as the product backend.

Instead:
- the Settlex app API owns:
  - guest account creation,
  - claim-account flow,
  - public profile reads,
  - public replay reads,
  - "create match" / "join match" product flows.
- the bgio server still owns:
  - seat credentials,
  - move authentication,
  - live match state,
  - live log / initial state while the process is running.

### Public API boundary

Raw bgio lobby REST endpoints are not part of the public product API in this MVP.

That means browsers must not call these bgio routes directly:
- `/games/:name/create`
- `/games/:name/:id/join`
- `/games/:name/:id/leave`
- `/games/:name/:id/update`
- other equivalent raw bgio lobby mutation routes

Approved rule:
- product flows such as create, join, leave, and identity-aware match bootstrap must go through Settlex-owned app APIs first,
- the app/API layer may then call the bgio lobby/server internally,
- reverse-proxy and service routing should be configured so raw bgio lobby mutation routes are not exposed as public browser product endpoints.

The browser may still connect to the live game transport it needs for gameplay, but identity and seat bootstrap guarantees must not be bypassable by direct public calls to bgio lobby mutations.

### Why not a bgio Postgres adapter for MVP

For this MVP, a Postgres adapter for bgio live state is not necessary.

Reasons:
- live matches are allowed to die on restart,
- there is only one production VM,
- archive durability matters more than live-match durability,
- the current initial Catana state is small enough that 100 concurrent live games are not a RAM concern on the chosen Oracle VM.

The right place to spend complexity now is:
- account identity,
- archive correctness,
- public read models.

If later requirements change to "live matches must survive deploys/restarts" or "multiple live game-server instances," that is the point to revisit a bgio storage adapter or a custom live-state persistence layer.

## Account Model

Use a stable `accountId` everywhere. Usernames are mutable public handles, not primary identity.

### `accounts`

- `id`
- `status`
  - `guest`
  - `claimed`
- `current_username`
- `avatar_emoji`
- `avatar_color`
- `created_at`
- `claimed_at`
- `last_seen_at`
- `username_changed_at`

### `account_emails`

- `id`
- `account_id`
- `email`
- `verified_at`
- `is_primary`

### `auth_identities`

Keep this flexible even though MVP only needs magic link.

- `id`
- `account_id`
- `provider`
  - `magic_link` now
  - future values like `password`, `google`, `discord`
- `provider_user_id`
- `created_at`

### `guest_sessions`

- `id`
- `account_id`
- hashed session token or selector/verifier pair
- `expires_at`
- `created_at`
- `last_seen_at`

### `username_history`

- `id`
- `account_id`
- `username`
- `started_at`
- `ended_at`

## Guest Session Design

This MVP still needs a real server-backed session even though there is no visible login wall.

Approved rule:
- the first time a player commits to identity creation, Settlex creates a `guest` account row,
- Settlex sets a long-lived `httpOnly`, `secure`, `SameSite=Lax` guest-session cookie,
- the browser continues to feel frictionless on the same device,
- localStorage remains convenience-only for cosmetic or reconnect helpers, not the source of truth for account identity.

LocalStorage can still keep:
- avatar picker defaults,
- last active match convenience state,
- live bgio seat credentials for reconnecting while the live match exists.

But the server should identify "who is this user?" from the guest-session cookie, not from localStorage.

## Claiming An Account

MVP claim flow:

- a logged-in guest account chooses an email address,
- Settlex sends an email magic link,
- the magic link verifies ownership of that email,
- the same `accountId` transitions from `guest` to `claimed`,
- future sign-ins on other devices recover that same account.

Important behavior:
- claiming an account upgrades the existing guest account,
- it does not create a second account,
- if the email is already attached elsewhere, the claim attempt is rejected in MVP rather than merged.

Password login and social login should remain future-compatible through `auth_identities`, but are not required in this MVP.

## Username Policy

- `current_username` must be globally unique.
- Username changes later must update `accounts.current_username` and close/open rows in `username_history`.
- Finished matches must never rely on the current username string alone.

That means each archived match stores a username snapshot per player.

## Match And Replay Model

### Live match identity

Live match state can remain in bgio memory, but when a player joins a seat, the seat metadata must include enough product identity for later archival.

Approved seat metadata shape:
- `participantType`
  - `human`
  - `bot`
- `accountId`
  - present for human participants
  - absent for bots
- `botKey`
  - present for bots
  - absent for humans
- `usernameSnapshot`
- `avatarSnapshot`
- existing cosmetic seat data like emoji/color can continue to live there as needed

This data can be carried in bgio player metadata / `matchData[].data` while the live match exists.

### Archive tables

#### `archived_matches`

- `id`
- optional public replay slug
- `bgio_match_id`
- `game_name`
- `ruleset_id`
- `board_config_id`
- `started_at`
- `finished_at`
- `winner_account_id`
- `winner_seat_id`
- `player_count`

#### `archived_match_players`

- `archived_match_id`
- `seat_id`
- `participant_type`
- `account_id`
  - nullable for bots
- `bot_key`
  - nullable for humans
- `username_snapshot`
- `avatar_emoji_snapshot`
- `avatar_color_snapshot`
- `result`

#### `archived_match_replays`

- `archived_match_id`
- `initial_state_json`
- `final_state_json`
- `log_json`
- optional derived summary JSON

### Archive write timing

When a live match reaches game over:

1. The game server reads the finished live data from the bgio server DB:
   - `state`
   - `initialState`
   - `metadata`
   - `log`
2. The game server writes a durable archive row set into Postgres.
3. Public profile pages and replay pages read only from Postgres.

For MVP, this archive write is the durability boundary. Live in-memory match state is disposable until this write succeeds.

### Archive transaction + idempotency rule

Archive writes must be transactional and idempotent.

Approved rule:
- `archived_matches.bgio_match_id` must be unique,
- the archive write for one finished match must happen in one database transaction across:
  - `archived_matches`
  - `archived_match_players`
  - `archived_match_replays`
- if archive is retried for the same `bgio_match_id`, the operation must no-op or update safely instead of creating duplicates or partial archives.

This is required because end-of-game hooks, retries, or process restarts during archival should not create duplicate replay records.

### Post-archive live-memory cleanup

Finished matches must not remain in bgio memory forever after archival.

Approved rule:
- once a finished match has been archived successfully, it should be removed from bgio live storage after a short postgame grace period,
- that grace period exists only to avoid immediately disrupting users who are still on the live postgame screen,
- replay and profile history are already served from Postgres and must not depend on the bgio copy continuing to exist.

The exact cleanup mechanism can be implementation-driven:
- immediate wipe after a short timeout,
- or a finished-match reaper/TTL job.

The important constraint is that finished-match memory usage must scale with active postgame grace windows, not with total historical matches.

### Replay source of truth

Public replay pages must render from the archived replay tables, not from the live bgio match endpoint.

That keeps replay:
- durable,
- public,
- independent of whether the original live match still exists.

## Public Surfaces

### Profile page

Public route:
- `/u/:username`

MVP contents:
- current username
- avatar
- joined date
- total games played
- wins
- losses
- recent finished matches with replay links

Explicitly out of scope for MVP:
- rankings
- rich stats dashboards
- social graphs
- privacy controls

### Replay page

Public route:
- `/replays/:id`

MVP behavior:
- show player identities from archived snapshots,
- show winner/result summary,
- allow read-only replay playback from archived initial state + log,
- do not depend on the live bgio match still existing.

## Match Bootstrap Flow

Approved MVP flow:

1. Player arrives with either:
   - an existing Settlex session cookie, or
   - no identity yet.
2. If no identity exists, the first committed username/avatar submission creates a `guest` account and guest session.
3. The player clicks create/join/matchmake in the Settlex app.
4. The Settlex app API calls the bgio create/join flow on the server side using the account's current identity.
5. The browser still receives the bgio `playerCredentials` needed for the live match seat.
6. The browser stores those bgio seat credentials locally for live reconnect convenience.

Important rule:
- account session = who you are in Settlex,
- bgio credentials = proof you may act as this seat in this live match.

Do not collapse those into one token.

Additional MVP clarification:
- recovering the same account on another device through magic link does not guarantee reclaiming an already-live seat in an in-progress match,
- live-seat reclaim remains a separate bgio/live-match concern in this MVP,
- the guarantee here is account recovery and future finished-match ownership continuity, not cross-device takeover of a currently running live match.

## Environment Strategy

### Local

- local Postgres via OrbStack-compatible Docker setup
- `pnpm dev` for the web app
- `pnpm serve` for the bgio server
- separate local env files

Local development does not need to run the whole app stack inside containers just because production uses containers.

Recommended local shape:
- containerize Postgres
- keep web and game servers running directly from the repo for faster iteration

### Production

- one OCI `VM.Standard.A1.Flex` ARM64 VM
- Docker Compose
- `web` container
- `game` container
- `postgres` container
- reverse proxy container, preferably Caddy for simpler HTTPS

Public ingress:
- `80`
- `443`

Restricted:
- `22` to your IP if possible

Not public:
- Postgres
- internal web/game container ports

### No staging in MVP

Environment count for MVP:
- `local`
- `prod`

This is acceptable because:
- product scope is already constrained,
- live matches may die on restart,
- adding staging would increase ops without solving a current requirement.

## Secrets

Required secret categories:

- `DATABASE_URL`
- app session secret
- magic-link signing / verification secret
- email-delivery credentials
- public base URL

Rules:
- no secrets in git,
- separate local and prod env files,
- Postgres should not be publicly exposed,
- live seat credentials remain transient match-scoped data and do not replace app secrets.

## Testing

MVP testing should cover:

- guest account creation from first-play identity flow,
- unique username reservation,
- session-cookie restore of the same guest account,
- claim-account magic-link flow,
- server-side match bootstrap using account identity,
- archive write on game completion,
- public profile queries,
- public replay page loading from archived data,
- username-change safety via archived username snapshots.

Testing layers:
- unit tests for account/session helpers,
- integration tests against test Postgres for account + archive flows,
- server tests for archive extraction from the bgio live DB,
- UI tests for public profile/replay route contracts.

## Migration From The Current Browser-Only Identity

The release should preserve the low-friction feel of the current lobby.

Approved migration rule:
- if a returning browser has legacy localStorage name/avatar values but no Settlex session cookie,
- prefill the identity UI with those values,
- on first confirmed entry into the new system, create the guest account using that data.

This preserves continuity without pretending old localStorage state is already a trusted account.

## Deferred Items

Explicitly deferred from this MVP design:
- account merge flow,
- social login,
- password login,
- bot profile pages,
- deep stats,
- abuse controls and anti-squatting policy,
- backup/restore procedure design,
- deploy-time user messaging for killed live matches,
- staging environment,
- restart-safe live match persistence.

## Verification

- Confirm first-play identity still feels frictionless while creating a real server-backed guest account.
- Confirm usernames are globally unique and stored server-side.
- Confirm the same browser returns to the same account via guest-session cookie.
- Confirm a claimed account can be recovered on a second device through magic link.
- Confirm raw bgio lobby mutation routes are not relied on as public browser product APIs.
- Confirm a finished match writes one durable archive row set to Postgres.
- Confirm duplicate archive attempts for the same `bgio_match_id` do not create duplicate or partial archive rows.
- Confirm bot matches archive cleanly with bot participants represented without fake human accounts.
- Confirm public `/u/:username` profile pages show summary + recent matches.
- Confirm public replay pages work even if the original live match no longer exists.
- Confirm archived finished matches are removed from bgio live memory after the chosen grace period.
- Confirm live matches are still allowed to die on restart without corrupting archived finished matches.

## Acceptance Criteria

- First-time play creates a real guest account without adding an upfront registration wall.
- The server, not localStorage alone, is the source of truth for account identity.
- Usernames are globally unique and stored on real account rows.
- Raw bgio lobby mutation routes are not the public browser product API for match bootstrap.
- Public profile pages exist at `/u/:username`.
- Finished matches are archived into Postgres forever.
- Archive writes are transactional and idempotent by `bgio_match_id`.
- Bot participants can be archived without requiring profile-backed accounts.
- Public replay pages read from archived replay data, not live bgio state.
- Live bgio matches remain in memory for MVP and may be lost on restart.
- Archived finished matches are cleaned out of bgio live memory after a short grace period.
- Local development uses a separate local Postgres database from production.
- Production runs on one OCI ARM VM with one Postgres instance and no staging environment.

## Open Questions

- Exact replay route naming can still be adjusted during implementation if it conflicts with existing route structure.
- Exact ORM / query-layer choice is an implementation detail and should be chosen during planning, but the schema must be migration-backed and Postgres-first.
