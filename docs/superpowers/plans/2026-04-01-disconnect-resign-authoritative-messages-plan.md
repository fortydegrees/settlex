# Disconnect / Resign Authoritative Messages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-authoritative disconnect and resign handling for the current 1v1 Catana flow, including server log messages, disconnected-seat UI, a 60 second reconnect window, and disconnect-forfeit game resolution.

**Architecture:** Keep disconnect presence outside `G.core`. Add a server-side `DisconnectPresenceManager` that observes `matchData` connection changes and game state updates, then attach `disconnectPresence` and `disconnectServerTimeMs` to the same pushed board payload path used for other live board props. When a connection change arrives as `matchData` without a state update, rebroadcast the latest cached state for that match with a fresh presence snapshot attached so the UI updates immediately without polling.

**Tech Stack:** Next.js, React, boardgame.io, Vitest, Node server routes

---

## File Map

**Server**
- Create: `server/presence/DisconnectPresenceManager.js`
- Create: `server/__tests__/DisconnectPresenceManager.test.js`
- Modify: `server/timers/timerPubSub.js`
- Modify: `server/__tests__/timerPubSub.test.js`
- Modify: `server/server.js`
- Modify: `server/serverGame.js`

**Game / moves**
- Create: `app/catana/__tests__/Moves.resign.test.js`
- Modify: `app/catana/Game.js`
- Modify: `app/catana/Moves.js`

**Client presence + log**
- Create: `app/catana/utils/disconnectPresence.js`
- Create: `app/catana/__tests__/disconnectPresence.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/utils/gameText.js`
- Modify: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/__tests__/gameText.test.js`
- Modify: `app/catana/__tests__/GameLogPanel.test.js`

**Seat UI + endgame copy**
- Create: `app/catana/__tests__/PlayerAvatarStatsPresence.test.js`
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/PlayerAvatarStats.css`
- Modify: `app/catana/components/OpponentPlayerBox.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/__tests__/OpponentPlayerBox.test.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`

**Docs**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- MVP remains 1v1-only.
- Do not add a recurring `/presence/:matchID` polling loop. Push `disconnectPresence` through live board payloads instead.
- `timerPubSub` can cache the latest state per match and use that cache to rebroadcast unchanged state when a `matchData` disconnect/reconnect event arrives.
- Server presence events stay outside `G.gameLog`; the client merges them into the rendered log feed.
- Resign gets a minimal UI affordance in `GameScreen` for this slice. If a custom confirmation modal feels too large for the slice, use a small existing-style confirm interaction and keep the rest of the plan unchanged.

### Task 1: Lock the server disconnect presence contract with tests

**Files:**
- Create: `server/__tests__/DisconnectPresenceManager.test.js`
- Modify: `server/__tests__/timerPubSub.test.js`

- [ ] **Step 1: Write the failing manager tests**

Cover:
- starting a disconnect window when a player's `isConnected` flips to `false`
- clearing the window and appending a reconnect event when they return before deadline
- resolving a disconnect as forfeit after 60 seconds in a live 1v1 match
- ignoring disconnect transitions after the match is already resolved

Use assertions like:
- `snapshot.activeDisconnectPlayerId === "1"`
- `snapshot.statusByPlayerId["1"].status === "disconnected"`
- `snapshot.events.at(-1).type === "server:disconnect"`
- timeout dispatch is called with the server-only forfeit move

- [ ] **Step 2: Extend the pubsub test to prove matchData forwarding**

Add a failing test in `server/__tests__/timerPubSub.test.js` asserting that:
- `matchData` payloads still seed bot metadata
- the new disconnect manager receives the same `matchData` payload
- state updates still call the manager's state hook

- [ ] **Step 3: Run the server tests to verify they fail**

Run: `pnpm exec vitest run server/__tests__/DisconnectPresenceManager.test.js server/__tests__/timerPubSub.test.js`

Expected:
- new manager tests fail because the manager does not exist yet
- updated pubsub test fails because no disconnect manager hook is wired

### Task 2: Implement the server presence manager and route wiring

**Files:**
- Create: `server/presence/DisconnectPresenceManager.js`
- Modify: `server/timers/timerPubSub.js`
- Modify: `server/server.js`

- [ ] **Step 4: Implement `DisconnectPresenceManager`**

Add a focused server module that:
- tracks `statusByPlayerId`
- records `disconnectedAtMs`, `deadlineAtMs`, and event history
- exposes `onMatchData(matchID, matchData)`, `onState(matchID, state)`, and `getSnapshot(matchID, state?)`
- schedules/cancels a timeout per match
- dispatches a server-only forfeit move when the deadline expires

Store an `afterGameLogSeq` on each server event so the client can merge presence events into the visible log in stable order.

- [ ] **Step 5: Wire the manager into the existing publish path**

Update `server/timers/timerPubSub.js` so it:
- continues bot syncing from `matchData`
- forwards `matchData` payloads to `DisconnectPresenceManager`
- forwards state updates / patches to `DisconnectPresenceManager`
- caches the latest state per match from `update` / `patch`
- attaches `disconnectPresence` and `disconnectServerTimeMs` to outgoing `update` / `patch` payloads

When a `matchData` connection-change payload arrives, rebroadcast the cached current state for that match as an `update` payload so clients receive fresh board props immediately even if no move was made.

- [ ] **Step 6: Wire the manager into server startup**

In `server/server.js`:
- instantiate the disconnect manager alongside `TimerManager`
- pass it into `createTimerPubSub`
- keep the existing `/timer/:matchID` route unchanged

- [ ] **Step 7: Run the server tests to verify they pass**

Run: `pnpm exec vitest run server/__tests__/DisconnectPresenceManager.test.js server/__tests__/timerPubSub.test.js`

Expected: PASS

- [ ] **Step 8: Commit the server presence layer**

```bash
git add server/presence/DisconnectPresenceManager.js server/__tests__/DisconnectPresenceManager.test.js server/timers/timerPubSub.js server/__tests__/timerPubSub.test.js server/server.js
git commit -m "feat: add disconnect presence server state"
```

### Task 3: Add explicit resign and server-only disconnect-forfeit moves

**Files:**
- Create: `app/catana/__tests__/Moves.resign.test.js`
- Modify: `app/catana/Game.js`
- Modify: `app/catana/Moves.js`
- Modify: `server/serverGame.js`

- [ ] **Step 9: Write the failing move tests**

Add tests covering:
- `resign` sets `G.core.gameOver` with winner/opponent and a resignation reason
- `maybeLogGameOver` still logs the normal `game:over` entry
- `resolveDisconnectForfeit` sets `G.core.gameOver` with `Disconnect Forfeit`
- the server-only forfeit move is included in `ServerCatan` but not the default client `Catan`

- [ ] **Step 10: Run the move tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/Moves.resign.test.js`

Expected:
- fail because the resign / disconnect-forfeit moves do not exist
- fail because server-only move wiring does not exist

- [ ] **Step 11: Implement the minimal move wiring**

In `app/catana/Moves.js`:
- add `resign`
- add `resolveDisconnectForfeit`
- set `G.core.gameOver = { winnerId, reason }`
- call `maybeLogGameOver` once

In `app/catana/Game.js`:
- add an option such as `includeServerMoves`
- expose `resign` to the normal game
- expose `resolveDisconnectForfeit` only when `includeServerMoves === true`

In `server/serverGame.js`:
- build `ServerCatan` with `includeServerMoves: true`

- [ ] **Step 12: Re-run the move tests to verify they pass**

Run: `pnpm exec vitest run app/catana/__tests__/Moves.resign.test.js`

Expected: PASS

- [ ] **Step 13: Commit the move layer**

```bash
git add app/catana/__tests__/Moves.resign.test.js app/catana/Game.js app/catana/Moves.js server/serverGame.js
git commit -m "feat: add resign and disconnect forfeit moves"
```

### Task 4: Add client-side presence polling and merged server log entries

**Files:**
- Create: `app/catana/utils/disconnectPresence.js`
- Create: `app/catana/__tests__/disconnectPresence.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/utils/gameText.js`
- Modify: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/__tests__/gameText.test.js`
- Modify: `app/catana/__tests__/GameLogPanel.test.js`

- [ ] **Step 14: Write the failing client helper and formatter tests**

Add tests for:
- reading pushed presence snapshots from board props
- computing remaining reconnect time from `{ deadlineAtMs, serverTimeMs, receivedAtMs }`
- merging presence events with `G.gameLog` using `afterGameLogSeq`
- formatting `server:*` entries into a distinct token stream
- rendering hooks for a `server` label / italic system style in `GameLogPanel`

- [ ] **Step 15: Run the helper / log tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/disconnectPresence.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/GameLogPanel.test.js`

Expected:
- new helper tests fail because `disconnectPresence.js` does not exist
- updated formatter / panel tests fail because server log entries are not supported

- [ ] **Step 16: Implement the presence helper and polling**

Create `app/catana/utils/disconnectPresence.js` with small focused helpers:
- `readPresenceSnapshot`
- `getDisconnectRemainingMs`
- `mergeVisibleLogEntries`

Update `app/catana/GameScreen.js` to:
- read `bgioProps.disconnectPresence` and `bgioProps.disconnectServerTimeMs`
- keep `receivedAtMs` + `serverDelayMs` for countdown display
- build `visibleLogEntries = mergeVisibleLogEntries(G.gameLog, presence.events)`

- [ ] **Step 17: Teach the log formatter / renderer about server entries**

Update `app/catana/utils/gameText.js` and `app/catana/components/GameLogPanel.js` so `server:*` entries render with:
- a `server` label token
- italic copy
- muted/slate or soft-amber treatment

Keep gameplay entries unchanged.

- [ ] **Step 18: Re-run the helper / log tests to verify they pass**

Run: `pnpm exec vitest run app/catana/__tests__/disconnectPresence.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/GameLogPanel.test.js`

Expected: PASS

- [ ] **Step 19: Commit the presence client data layer**

```bash
git add app/catana/utils/disconnectPresence.js app/catana/__tests__/disconnectPresence.test.js app/catana/GameScreen.js app/catana/utils/gameText.js app/catana/components/GameLogPanel.js app/catana/__tests__/gameText.test.js app/catana/__tests__/GameLogPanel.test.js
git commit -m "feat: surface disconnect presence in the log"
```

### Task 5: Add disconnected-seat visuals and endgame reason copy

**Files:**
- Create: `app/catana/__tests__/PlayerAvatarStatsPresence.test.js`
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/PlayerAvatarStats.css`
- Modify: `app/catana/components/OpponentPlayerBox.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/OpponentPlayerBox.test.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`

- [ ] **Step 20: Write the failing seat/UI tests**

Cover:
- warning badge is rendered inside the avatar box
- reconnect pill is rendered directly below the avatar box
- disconnected seat applies a subtle pulse/dim class
- game-over reason copy recognizes `Resignation` and `Disconnect Forfeit`
- `GameScreen` wires a resign control to `moves.resign`

- [ ] **Step 21: Run the seat/UI tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/GameScreen.gameOver.test.js`

Expected:
- new presence test fails because the avatar badge / timer pill do not exist
- existing seat / game-over tests fail after adding the new assertions

- [ ] **Step 22: Implement the seat treatment**

Update `PlayerAvatarStats.js` / `.css` to:
- render the in-avatar `⚠️` badge
- render the `Disconnected 0:43` pill below the avatar
- add a custom slow pulse animation with `prefers-reduced-motion` handling

Update `OpponentPlayerBox.js` and `PlayerActionContainer.js` to:
- apply disconnected dim / desaturation classes to the seat wrapper
- pass `presenceState` and `disconnectRemainingMs` through to `PlayerAvatarStats`

- [ ] **Step 23: Update game-over copy and the resign control**

In `GameScreen.js`:
- map `gameOverState.reason` to friendly copy for resignation and disconnect forfeit
- add a minimal resign affordance in the top-right control cluster and wire it to `moves.resign`
- keep the control hidden/disabled once the game is already over

- [ ] **Step 24: Re-run the seat/UI tests to verify they pass**

Run: `pnpm exec vitest run app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/GameScreen.gameOver.test.js`

Expected: PASS

- [ ] **Step 25: Commit the seat/UI layer**

```bash
git add app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/components/PlayerAvatarStats.js app/catana/components/PlayerAvatarStats.css app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/GameScreen.gameOver.test.js
git commit -m "feat: add disconnect seat status and resign UI"
```

### Task 6: Update docs and run final verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 26: Record the feature in agent docs**

Update:
- `docs/agent/PROGRESS.md` with a short status note
- `docs/agent/NOTES.md` with the authoritative behavior:
  - 1v1 disconnect grace window is 60 seconds
  - disconnect presence is server-owned and pushed through board payloads
  - server log entries are merged client-side with `G.gameLog`

- [ ] **Step 27: Run the focused verification suite**

Run: `pnpm exec vitest run server/__tests__/DisconnectPresenceManager.test.js server/__tests__/timerPubSub.test.js app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/disconnectPresence.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/GameScreen.gameOver.test.js`

Expected: PASS

- [ ] **Step 28: Run broader repo verification**

Run: `pnpm verify`

Expected:
- PASS if no unrelated pre-existing failures are present
- if unrelated failures exist, capture them separately and do not block the feature summary on them

- [ ] **Step 29: Commit docs + final verification state**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note disconnect and resign authoritative flow"
```

## Review Notes For The Implementer

- Keep the server manager small and stateful; do not smuggle transport state into `G.core`.
- Reuse the existing `/timer/:matchID` fetch/poll pattern rather than inventing a second client architecture.
- Keep the disconnected-seat styling subtle and Catana-native; avoid a full red alert treatment.
- Use `superpowers:verification-before-completion` before claiming the feature is done.

## Manual QA Checklist

- Disconnect one player mid-match and verify the other seat shows dim/pulse/badge + reconnect pill.
- Reconnect before 60 seconds and verify the seat clears and the server log gets a reconnect line.
- Let the timer expire and verify the opponent wins by disconnect forfeit.
- Trigger resign manually and verify immediate game over plus a server-style resign message.
