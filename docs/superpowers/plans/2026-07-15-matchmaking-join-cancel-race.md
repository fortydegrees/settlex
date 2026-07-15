# Matchmaking Join-Cancel Race Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent an alert join and the original seeker's Cancel action from producing a one-seat orphan match, and provide a small escape route if an incomplete credentialed duel is ever loaded.

**Architecture:** Serialize app-owned join and leave mutations for each match with a PostgreSQL transaction-scoped advisory lock. A matchmaking-specific leave re-checks the locked live table and returns `MATCH_FOUND` instead of removing a seat from a full duel; the client treats that as navigation to the match. The game route separately detects an incomplete credentialed duel and offers server-authoritative cleanup/retry actions without trying to end the match locally.

**Tech Stack:** Next.js route handlers, React, boardgame.io lobby API, PostgreSQL advisory locks, Vitest, pnpm.

## Global Constraints

- Keep game rules and seat ownership server-authoritative.
- Do not add dependencies or change build tooling.
- Do not modify boardgame.io package sources.
- Preserve ordinary leave behavior for Puffer and non-matchmaking flows.
- Never clear a filled human table in response to a late matchmaking Cancel.

---

### Task 1: Serialize match mutations and protect filled tables

**Files:**
- Create: `lib/server/matches/matchMutationLock.js`
- Modify: `app/api/matches/join/handler.js`
- Modify: `app/api/matches/leave/handler.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Create: `lib/server/__tests__/matchMutationLock.postgres.test.js`

**Interfaces:**
- Produces: `withMatchMutationLock({ pool, matchID, run })`.
- Produces: leave-route error code `MATCH_FOUND` for a full table when `intent` is `matchmaking_cancel`.

- [ ] **Step 1: Write failing route tests**

Add assertions that join and leave execute inside the injected match lock, and that a locked matchmaking cancellation of a full duel returns HTTP 409 with `{ code: "MATCH_FOUND" }` without calling `leaveMatchForAccount`.

- [ ] **Step 2: Run the route test and verify red**

Run: `pnpm exec vitest run app/__tests__/api/matchRoutes.test.js --reporter=dot`

Expected: FAIL because the routes do not accept or call `withMatchMutationLock`, and cancellation has no full-table guard.

- [ ] **Step 3: Write a failing real-Postgres serialization test**

Start two `withMatchMutationLock` calls for the same match. Hold the first callback open and assert the second callback has not started; release the first and assert the second then runs. Also assert a different match ID is not blocked by the first.

- [ ] **Step 4: Run the lock test and verify red**

Run: `MATCH_ALERT_POSTGRES_URL=postgres://settlehex:settlehex@localhost:55432/settlehex pnpm exec vitest run lib/server/__tests__/matchMutationLock.postgres.test.js --reporter=dot`

Expected: FAIL because `matchMutationLock.js` does not exist.

- [ ] **Step 5: Implement the minimal lock and route guard**

Use `pg_advisory_xact_lock(hashtextextended($1, 0))` inside `BEGIN` / `COMMIT`, rolling back and releasing the client on errors. Wrap each route's live read plus mutation in the lock. For matchmaking cancellation only, re-fetch the live table while locked and throw `{ status: 409, code: "MATCH_FOUND" }` when both seats are occupied and the leaving account still owns the requested seat.

- [ ] **Step 6: Run the focused tests and verify green**

Run both commands from Steps 2 and 4.

Expected: PASS.

### Task 2: Treat late Cancel as match found

**Files:**
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/matchmaking/matchmakingRescue.js`
- Modify: `app/catana/matchmaking/__tests__/matchmakingRescue.test.js`
- Modify: `app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js`

**Interfaces:**
- Consumes: route error code `MATCH_FOUND`.
- Produces: reconciliation reason `match_found`.

- [ ] **Step 1: Write failing cancellation tests**

Assert `reconcileSearchDeparture` maps a `MATCH_FOUND` leave rejection to `{ released: false, reason: "match_found" }`. Assert the lobby cancellation path sends `intent: "matchmaking_cancel"`, preserves credentials, and routes the existing seeker to `/g/:matchID` for that reason.

- [ ] **Step 2: Run the focused tests and verify red**

Run: `pnpm exec vitest run app/catana/matchmaking/__tests__/matchmakingRescue.test.js app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js --reporter=dot`

Expected: FAIL because the intent and match-found reconciliation do not exist.

- [ ] **Step 3: Implement the minimal client transition**

Preserve API error `code` in `appRequest`, include `intent: "matchmaking_cancel"` in queue departures, map the server rejection to `match_found`, and route to the already-filled match without clearing the active credential record or starting Puffer.

- [ ] **Step 4: Run the focused tests and verify green**

Run the command from Step 2.

Expected: PASS.

### Task 3: Add the interrupted-duel recovery surface

**Files:**
- Create: `app/catana/lobby/interruptedDuel.js`
- Create: `app/catana/lobby/__tests__/interruptedDuel.test.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Modify: `app/catana/__tests__/MatchPageClient.friendChallenge.test.js` or the closest current MatchPageClient source test.

**Interfaces:**
- Produces: `isInterruptedCredentialedDuel({ match, playerID, credentials })`.
- Consumes: matchmaking cancellation `MATCH_FOUND` response.

- [ ] **Step 1: Write failing state and source tests**

Assert a credentialed two-seat duel with an open seat is interrupted, while a full duel and a visitor without credentials are not. Assert MatchPageClient renders `Duel interrupted`, `Return to lobby`, and `Look again` before the boardgame client for the interrupted state.

- [ ] **Step 2: Run the tests and verify red**

Run: `pnpm exec vitest run app/catana/lobby/__tests__/interruptedDuel.test.js app/catana/__tests__/MatchPageClient.friendChallenge.test.js --reporter=dot`

Expected: FAIL because the helper and recovery surface do not exist.

- [ ] **Step 3: Implement the recovery UI**

Do not mount `CatanClient` while the credentialed table is incomplete. On either recovery action, call the matchmaking-cancel leave route with the current credentials. If it leaves, clear the matching local credential and active-match record before navigating; if it returns `MATCH_FOUND`, refresh the match and continue into the game.

- [ ] **Step 4: Run the focused tests and verify green**

Run the command from Step 2.

Expected: PASS.

### Task 4: Verify and document

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Run focused feature verification**

Run the Task 1-3 test commands together, including the real-Postgres lock test.

Expected: PASS.

- [ ] **Step 2: Run repository verification**

Run: `MATCH_ALERT_POSTGRES_URL=postgres://settlehex:settlehex@localhost:55432/settlehex pnpm verify`

Expected: all engine, server, app, and lint checks pass.

- [ ] **Step 3: Record evidence**

Document the reproduced orphan cause, advisory-lock boundary, `MATCH_FOUND` behavior, interrupted-duel fallback, and exact verification commands in `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md`.

- [ ] **Step 4: Review the final diff**

Confirm no VAPID private key, browser endpoint, account identifier, unrelated worktree change, or generated artifact is included.
