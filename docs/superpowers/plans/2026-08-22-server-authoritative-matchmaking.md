# Server-Authoritative Matchmaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace client-side public-duel discovery and seat selection with one server-authoritative matchmaking command and a request-ID cancellation command.

**Architecture:** `POST /api/matches/matchmake` owns the complete join-or-create decision under the existing PostgreSQL advisory-lock boundary. `DELETE /api/matches/matchmake` accepts the same request identity, records a short-lived cancellation tombstone, locates the authoritative seat, removes it only while the duel is still waiting, and reports `match_found` without removing a filled duel. The tombstone makes DELETE-before-POST safe. The homepage client keeps the request identity for the lifetime of the search and never calls `/matches/open`, `/matches/join`, or seat-based `/matches/leave` for active public matchmaking.

**Tech Stack:** Next.js App Router handlers, React client hook, boardgame.io HTTP API, PostgreSQL advisory locks, Vitest, Playwright browser verification.

## Global Constraints

- Preserve the existing rule that a late matchmaking Cancel must enter a filled human duel instead of removing either player.
- Keep account, match ID, player ID, and credentials paired; local storage is a recovery hint, not authority.
- Keep bot matches, friend challenges, explicit room joins, and offline match-alert confirmation flows on their existing dedicated paths.
- Add no runtime dependency. A small additive migration is permitted for the
  cancellation tombstone required by the delayed-request race found during
  browser verification.
- Work within the existing dirty `main` checkout without reverting the game-start/audio changes already in progress.

---

### Task 1: Dedicated atomic matchmake endpoint

**Files:**
- Create: `app/api/matches/matchmake/route.js`
- Create: `app/api/matches/matchmake/handler.js`
- Modify: `app/api/matches/create/handler.js`
- Modify: `lib/server/matches/matchmakePublicMatchForAccount.js`
- Test: `app/__tests__/api/matchRoutes.test.js`
- Test: `lib/server/__tests__/publicMatchmaking.test.js`

**Interfaces:**
- Consumes: authenticated account plus `{ modeId, requestId, requestedCredentials }`.
- Produces: `{ matchID, playerID, playerCredentials, createdNewPublicDuel }` and the existing match credential cookie.

**Verification shape:** Behavioral TDD at the real handler and server coordinator boundaries.

- [x] **Step 1: Write failing handler tests** proving `POST /api/matches/matchmake` authenticates, validates the request tokens, invokes the atomic coordinator, and writes the returned credential cookie.
- [x] **Step 2: Run the focused handler test** and confirm it fails because the matchmake route does not exist.
- [x] **Step 3: Add the minimal route and handler**, moving public-matchmaking dispatch out of `/api/matches/create`; keep `/create` for explicit bot/friend/direct creation only.
- [x] **Step 4: Add a failing idempotency test** in which the same account retries the same request ID after its seat already exists.
- [x] **Step 5: Make the coordinator return that existing request-owned seat** instead of creating or joining another duel, using the client-supplied credential that the game server already accepted.
- [x] **Step 6: Run focused route and coordinator tests** and confirm simultaneous seekers still converge on one duel.

### Task 2: Server-authoritative cancellation by request identity

**Files:**
- Create: `lib/server/matches/cancelPublicMatchmakingForAccount.js`
- Create: `lib/server/matches/publicMatchmakingCancellationStore.js`
- Create: `lib/server/db/sql/0008_public_matchmaking_cancellations.sql`
- Modify: `app/api/matches/matchmake/handler.js`
- Test: `lib/server/__tests__/publicMatchmakingCancellation.test.js`
- Test: `app/__tests__/api/matchRoutes.test.js`

**Interfaces:**
- Consumes: authenticated account plus `{ modeId, requestId, requestedCredentials }`.
- Produces one of:
  - `{ status: "cancelled", seats: [{ matchID, playerID }] }`
  - `{ status: "cancelled", seats: [] }` when cancellation wins before a seat exists
  - `{ status: "match_found", matchID, playerID, playerCredentials }`

**Verification shape:** Behavioral TDD for waiting-seat removal, full-duel preservation, unknown requests, and credential-cookie effects.

- [x] **Step 1: Write failing server tests** proving a request ID—not a client-selected match/seat—locates and removes a waiting public seat under the public-matchmaking lock.
- [x] **Step 2: Run the focused cancellation test** and confirm it fails because the cancellation coordinator is missing.
- [x] **Step 3: Implement the cancellation coordinator** using authoritative request-seat lookup, live match reads, the filled-human-duel rule, credentialed leave, and a tombstone for DELETE-before-POST ordering.
- [x] **Step 4: Add failing tests for a filled duel and unknown request** proving a filled duel returns `match_found` without leaving, while an unknown request is recorded as an idempotent cancellation.
- [x] **Step 5: Implement those outcomes and expose them from `DELETE /api/matches/matchmake`**, clearing credential cookies only for seats the server confirms were removed and preserving/writing the cookie for `match_found`.
- [x] **Step 6: Run focused server and route tests** and confirm every cancellation outcome passes.

### Task 3: Single-command homepage client

**Files:**
- Create: `app/catana/matchmaking/publicMatchmakingClient.js`
- Create: `app/catana/matchmaking/__tests__/publicMatchmakingClient.test.js`
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/matchmaking/matchmakingRescue.js`
- Modify: `app/catana/matchmaking/__tests__/matchmakingRescue.test.js`
- Modify: `app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js` only to remove obsolete source-contract assertions; do not add new source-grep assertions.

**Interfaces:**
- `buildStartPublicMatchmakingRequest({ modeId, requestId, requestedCredentials })` produces the POST request descriptor for `/api/matches/matchmake`.
- `buildCancelPublicMatchmakingRequest({ modeId, requestId, requestedCredentials })` produces the DELETE request descriptor for the same endpoint.
- The lobby retains one mutation identity from search start until match found or server-confirmed cancellation.

**Verification shape:** TDD for the emitted API contract and pure cancellation outcome decisions; focused browser verification for hook/network behavior.

- [x] **Step 1: Write failing client-contract tests** asserting one literal start request and one literal cancel request, both against `/api/matches/matchmake` with the same identity fields.
- [x] **Step 2: Run the focused client test** and confirm it fails because the builders do not exist.
- [x] **Step 3: Implement the request builders and route the lobby through them**, deleting the `/matches/open` preflight and the public-search direct-join branch.
- [x] **Step 4: Write failing cancellation-outcome tests** for `cancelled`, `not_found`, `match_found`, and ambiguous failure.
- [x] **Step 5: Update the lobby cancellation flow** to send server cancellation immediately by request ID, clear state only on a confirmed release, and navigate with preserved credentials on `match_found`.
- [x] **Step 6: Run focused matchmaking client/rescue tests** and remove obsolete source-text expectations that encoded the old client-selected API flow.

### Task 4: Integration verification and lifecycle notes

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- No new runtime interface; records the authoritative endpoint and preserved late-Cancel invariant.

**Verification shape:** Browser integration plus repository verification.

- [x] **Step 1: Run two isolated browser contexts from an empty queue** and verify both issue only `POST /api/matches/matchmake`, reach the same match, and receive different player IDs.
- [x] **Step 2: Hold the start response, click Cancel, then release it** and verify the server removes a waiting seat by request ID and Play Online becomes available again while the POST is still pending.
- [x] **Step 3: Exercise late Cancel against a just-filled duel** and verify navigation enters the game rather than removing a player.
- [x] **Step 4: Update lifecycle notes** with the single-command client contract, idempotency, and the reason late Cancel preserves filled duels.
- [x] **Step 5: Run focused suites, `pnpm verify`, and `git diff --check`**; inspect the final diff for unrelated changes and leave deployment untouched.
