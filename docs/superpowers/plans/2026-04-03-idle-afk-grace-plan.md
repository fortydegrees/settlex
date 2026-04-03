# Idle / AFK Grace Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-authoritative 1v1 idle / AFK grace flow that records idle strikes from fully auto-resolved normal turns, starts a 60 second `Idle` grace window after two strikes, lets the affected player acknowledge with `I'm still here`, and resolves the match as `AFK Forfeit` if they do not respond.

**Architecture:** Keep idle policy outside `G.core`, parallel to the existing disconnect presence layer. Add an `IdlePresenceManager` that observes state updates and `deltalog`, attach `idlePresence` snapshots to the same pushed board payload path as timers/disconnects, and expose one authenticated `POST /idle/:matchID/ack` endpoint for clearing server-owned idle state. Reuse the current seat/log visual system, but keep idle copy and event types distinct from real disconnects.

**Tech Stack:** Next.js, React, boardgame.io, Node server routes, Vitest, existing Catana glass/status UI

---

## File Structure

### Server presence / policy

- Create: `server/presence/IdlePresenceManager.js`
  - Owns idle strikes, active idle grace window, idle event history, and timeout dispatch.
- Create: `server/presence/acknowledgeIdle.js`
  - Focused server helper for `POST /idle/:matchID/ack`: validate credentials, clear idle state, rebroadcast current state.
- Create: `server/__tests__/IdlePresenceManager.test.js`
  - Unit coverage for strike counting, grace start, acknowledge reset, timeout, and disconnect precedence.
- Create: `server/__tests__/acknowledgeIdle.test.js`
  - Unit coverage for credential validation, idle clear, and rebroadcast behavior.
- Modify: `server/timers/timerPubSub.js`
  - Forward state/matchData to idle presence, attach `idlePresence` snapshots, and rebroadcast updated state.
- Modify: `server/__tests__/timerPubSub.test.js`
  - Guard snapshot forwarding and rebroadcast behavior.
- Modify: `server/server.js`
  - Instantiate the idle manager, wire it into pubsub, and register `POST /idle/:matchID/ack`.

### Server dispatch / terminal resolution

- Modify: `server/dispatch/dispatchMatchUpdate.js`
  - Add the new targeted server move to the existing targeted-dispatch path.
- Modify: `server/__tests__/dispatchMatchUpdate.test.js`
  - Prove AFK forfeits dispatch as the active seat while targeting the idle loser.
- Modify: `server/serverGame.js`
  - Expose the server-only AFK-forfeit move in the server game config.

### Game / moves

- Modify: `app/catana/Moves.js`
  - Add `AFK Forfeit` reason and a server-only `resolveIdleForfeit` move.
- Modify: `app/catana/Game.js`
  - Expose `resolveIdleForfeit` only in the server build, consistent with the disconnect-forfeit pattern.
- Modify: `app/catana/__tests__/Moves.resign.test.js`
  - Extend terminal-resolution coverage to AFK forfeit.

### Client idle data + UI

- Create: `app/catana/utils/idlePresence.js`
  - Read pushed idle snapshots and compute active idle seat state / countdown.
- Create: `app/catana/__tests__/idlePresence.test.js`
  - Unit coverage for receipt timing, remaining time math, and active-idle filtering.
- Create: `app/catana/components/IdlePromptModal.js`
  - Focused modal for `Are you still there?` + countdown + `I'm still here`.
- Create: `app/catana/__tests__/IdlePromptModal.source.test.js`
  - Source-level coverage for approved copy and timer/action hooks.
- Create: `app/catana/__tests__/GameScreen.idleGrace.test.js`
  - Source-level wiring checks for `idlePresence`, `bgioProps.credentials`, local-player modal gating, and ack fetch path.
- Modify: `app/catana/GameScreen.js`
  - Read `idlePresence`, derive effective seat state with disconnect precedence, render idle modal, and send ack requests.
- Modify: `app/catana/utils/gameText.js`
  - Add `server:idle`, `server:idleAck`, and `server:idleForfeit` copy.
- Modify: `app/catana/__tests__/gameText.test.js`
  - Guard AFK/idle log text.
- Modify: `app/catana/components/PlayerAvatarStats.js`
  - Generalize the disconnect pill text/timer to also support `Idle`.
- Modify: `app/catana/components/OpponentPlayerBox.js`
  - Treat active idle seats like disconnected seats for visual shell styling.
- Modify: `app/catana/components/PlayerActionContainer.js`
  - Apply the same active idle seat styling on the self seat.
- Modify: `app/catana/__tests__/PlayerAvatarStatsPresence.test.js`
  - Guard `Idle` copy and timer hook changes.
- Modify: `app/catana/__tests__/OpponentPlayerBox.test.js`
  - Guard idle seat styling on opponents.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- MVP remains 1v1-only.
- Idle strikes count only during normal gameplay turns; setup / placement are out of scope.
- A real transport disconnect should clear any active idle grace state for that seat and let the existing disconnect manager take over.
- Do not refactor disconnect and idle into a single generic presence manager in this slice.
- Use the existing `credentials` prop already available to the board component for the idle-ack request.
- `GameLogPanel` styling does not need structural changes; new AFK events should flow through the existing generic `server:*` rendering path.

### Task 1: Lock the idle-presence server contract with tests

**Files:**
- Create: `server/__tests__/IdlePresenceManager.test.js`
- Modify: `server/__tests__/timerPubSub.test.js`

- [ ] **Step 1: Write the failing idle-manager tests**

Cover these behaviors in `server/__tests__/IdlePresenceManager.test.js`:
- normal gameplay turn with only timeout moves increments one strike,
- setup / placement auto-moves do not increment strikes,
- any genuine human move resets strikes to `0`,
- two consecutive idle strikes start `activeIdlePlayerId` + `deadlineAtMs`,
- `acknowledge(matchID, playerID)` clears the active idle window and strikes,
- timeout dispatch calls the server-only AFK-forfeit move,
- a later `matchData` disconnect clears active idle state so disconnect policy can take over.

Use assertions like:

```js
expect(snapshot.activeIdlePlayerId).toBe("1");
expect(snapshot.statusByPlayerId["1"]).toEqual({
  status: "idle",
  idleStrikeCount: 2
});
expect(dispatch).toHaveBeenCalledWith({
  matchID: "m1",
  move: "resolveIdleForfeit",
  playerID: "1"
});
```

- [ ] **Step 2: Extend the pubsub tests for idle snapshots**

Add failing coverage in `server/__tests__/timerPubSub.test.js` showing that:
- state updates call the idle manager’s `onState`,
- `matchData` payloads call the idle manager’s `onMatchData`,
- outgoing `update` payloads include `idlePresence` and `idleServerTimeMs`.

- [ ] **Step 3: Run the server tests to verify they fail**

Run: `pnpm exec vitest run server/__tests__/IdlePresenceManager.test.js server/__tests__/timerPubSub.test.js`

Expected:
- FAIL because the new manager does not exist yet,
- FAIL because `timerPubSub` does not know about idle snapshots.

### Task 2: Implement the idle manager and snapshot wiring

**Files:**
- Create: `server/presence/IdlePresenceManager.js`
- Modify: `server/timers/timerPubSub.js`
- Modify: `server/server.js`

- [ ] **Step 4: Implement `IdlePresenceManager`**

Add a focused manager module with methods like:

```js
export class IdlePresenceManager {
  constructor({ dispatch, isBotPlayer, idleStrikeThreshold = 2, idleTimeoutMs = 60_000 }) {}
  onState(matchID, state, deltalog) {}
  onMatchData(matchID, matchData) {}
  acknowledge(matchID, playerID) {}
  getSnapshot(matchID) {}
}
```

Implementation rules:
- ignore bot seats,
- count strikes only in normal gameplay turns,
- treat `auto*` timeout moves as idle candidates,
- treat any real human move as participation and reset strikes,
- when the threshold is hit, append one `server:idle` event and start the grace timer,
- when a real disconnect arrives for that seat, clear idle state and strikes.

- [ ] **Step 5: Wire idle snapshots into `timerPubSub`**

Update `server/timers/timerPubSub.js` so it:
- accepts `idleManager`,
- calls `idleManager.onState(matchID, state, deltalog)` from `rememberState(...)`,
- calls `idleManager.onMatchData(matchID, matchData)` on `matchData` payloads,
- attaches `idlePresence` and `idleServerTimeMs` to outgoing `update` / `patch` payloads,
- keeps rebroadcast behavior identical to the disconnect/timer path.

- [ ] **Step 6: Instantiate the idle manager in `server/server.js`**

Use the same bot-player knowledge already passed into `TimerManager`:

```js
const idleManager = new IdlePresenceManager({
  dispatch,
  isBotPlayer: ({ matchID, playerID }) =>
    botManager.isBotPlayerForMatch(matchID, playerID)
});
```

Pass it into `createTimerPubSub(...)` beside `disconnectManager`.

- [ ] **Step 7: Re-run the server presence tests**

Run: `pnpm exec vitest run server/__tests__/IdlePresenceManager.test.js server/__tests__/timerPubSub.test.js`

Expected: PASS.

- [ ] **Step 8: Commit the idle-presence server layer**

```bash
git add server/presence/IdlePresenceManager.js server/__tests__/IdlePresenceManager.test.js server/timers/timerPubSub.js server/__tests__/timerPubSub.test.js server/server.js
git commit -m "feat: add idle presence server state"
```

### Task 3: Add AFK-forfeit move support to the server dispatch path

**Files:**
- Modify: `server/dispatch/dispatchMatchUpdate.js`
- Modify: `server/__tests__/dispatchMatchUpdate.test.js`
- Modify: `app/catana/Moves.js`
- Modify: `app/catana/Game.js`
- Modify: `app/catana/__tests__/Moves.resign.test.js`
- Modify: `server/serverGame.js`

- [ ] **Step 9: Write the failing forfeit and dispatch tests**

Add failing coverage for:
- `resolveIdleForfeit` setting `G.core.gameOver` with `AFK Forfeit`,
- the new move being server-only like `resolveDisconnectForfeit`,
- `dispatchMatchUpdate` treating `resolveIdleForfeit` as a targeted server move and dispatching it as the active seat.

Example assertion:

```js
expect(onUpdate).toHaveBeenCalledWith(
  expect.objectContaining({
    payload: expect.objectContaining({
      type: "resolveIdleForfeit",
      args: ["1"],
      playerID: "0"
    })
  }),
  6,
  "m3",
  "0"
);
```

- [ ] **Step 10: Run the move / dispatch tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/Moves.resign.test.js server/__tests__/dispatchMatchUpdate.test.js`

Expected:
- FAIL because `resolveIdleForfeit` does not exist,
- FAIL because targeted dispatch only knows about disconnect forfeits.

- [ ] **Step 11: Implement the minimal AFK-forfeit move wiring**

In `app/catana/Moves.js`:
- add `GAME_OVER_REASONS.AFK_FORFEIT = "AFK Forfeit"`,
- add `resolveIdleForfeit` using the existing terminal-resolution helper.

In `app/catana/Game.js` and `server/serverGame.js`:
- expose `resolveIdleForfeit` only in the server build.

In `server/dispatch/dispatchMatchUpdate.js`:
- include `resolveIdleForfeit` in `TARGETED_SERVER_MOVES`.

- [ ] **Step 12: Re-run the move / dispatch tests**

Run: `pnpm exec vitest run app/catana/__tests__/Moves.resign.test.js server/__tests__/dispatchMatchUpdate.test.js`

Expected: PASS.

- [ ] **Step 13: Commit the AFK-forfeit move slice**

```bash
git add app/catana/Moves.js app/catana/Game.js app/catana/__tests__/Moves.resign.test.js server/serverGame.js server/dispatch/dispatchMatchUpdate.js server/__tests__/dispatchMatchUpdate.test.js
git commit -m "feat: add afk forfeit server move"
```

### Task 4: Add the authenticated idle-ack route

**Files:**
- Create: `server/presence/acknowledgeIdle.js`
- Create: `server/__tests__/acknowledgeIdle.test.js`
- Modify: `server/server.js`

- [ ] **Step 14: Write the failing idle-ack helper tests**

Cover:
- rejecting missing `playerID` / `credentials`,
- rejecting invalid credentials,
- calling `idleManager.acknowledge(matchID, playerID)` on success,
- fetching the current state and rebroadcasting it through the match channel so clients receive fresh snapshots immediately.

Suggested helper contract:

```js
const result = await acknowledgeIdle({
  serverInstance,
  idleManager,
  matchID: "m1",
  playerID: "1",
  credentials: "secret"
});

expect(result).toEqual({ ok: true });
```

- [ ] **Step 15: Run the helper test to verify it fails**

Run: `pnpm exec vitest run server/__tests__/acknowledgeIdle.test.js`

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 16: Implement the helper and server route**

Create `server/presence/acknowledgeIdle.js` that:
- fetches `metadata` and `state`,
- validates credentials with `serverInstance.auth.authenticateCredentials(...)`,
- calls `idleManager.acknowledge(matchID, playerID)`,
- publishes `{ type: "update", args: [matchID, state] }` to `MATCH-${matchID}` so `timerPubSub` reattaches fresh snapshots.

Then wire `POST /idle/:matchID/ack` in `server/server.js`:

```js
server.router.post("/idle/:matchID/ack", async (ctx) => {
  const { playerID, credentials } = ctx.request.body ?? {};
  // call acknowledgeIdle(...)
});
```

- [ ] **Step 17: Re-run the helper test**

Run: `pnpm exec vitest run server/__tests__/acknowledgeIdle.test.js`

Expected: PASS.

- [ ] **Step 18: Commit the idle-ack route slice**

```bash
git add server/presence/acknowledgeIdle.js server/__tests__/acknowledgeIdle.test.js server/server.js
git commit -m "feat: add idle acknowledge endpoint"
```

### Task 5: Add idle presence helpers and AFK log copy on the client

**Files:**
- Create: `app/catana/utils/idlePresence.js`
- Create: `app/catana/__tests__/idlePresence.test.js`
- Modify: `app/catana/utils/gameText.js`
- Modify: `app/catana/__tests__/gameText.test.js`

- [ ] **Step 19: Write the failing client helper / formatter tests**

In `app/catana/__tests__/idlePresence.test.js`, cover:
- annotating pushed idle snapshots with `receivedAtMs` and `serverDelayMs`,
- computing remaining idle time from `deadlineAtMs`,
- exposing active idle state only while `activeIdlePlayerId` is still live.

In `app/catana/__tests__/gameText.test.js`, add failing checks for:
- `server:idle`
- `server:idleAck`
- `server:idleForfeit`

- [ ] **Step 20: Run the helper / formatter tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/idlePresence.test.js app/catana/__tests__/gameText.test.js`

Expected:
- FAIL because `idlePresence.js` does not exist,
- FAIL because AFK server log copy is not implemented.

- [ ] **Step 21: Implement the minimal helper + formatter changes**

Create `app/catana/utils/idlePresence.js` with helpers like:

```js
export const readIdlePresenceSnapshot = (snapshot, serverTimeMs, receivedAtMs = Date.now()) => { ... };
export const getIdleRemainingMs = (snapshot, nowMs = Date.now()) => { ... };
export const getActiveIdleStateByPlayerId = (snapshot, nowMs = Date.now()) => { ... };
```

Update `app/catana/utils/gameText.js` so AFK events render as server-style entries, for example:

```js
case "server:idle":
  tokens.push(textToken(" was idle for 2 turns. Response window started.", { variant: "server" }));
```

- [ ] **Step 22: Re-run the helper / formatter tests**

Run: `pnpm exec vitest run app/catana/__tests__/idlePresence.test.js app/catana/__tests__/gameText.test.js`

Expected: PASS.

- [ ] **Step 23: Commit the client idle-data slice**

```bash
git add app/catana/utils/idlePresence.js app/catana/__tests__/idlePresence.test.js app/catana/utils/gameText.js app/catana/__tests__/gameText.test.js
git commit -m "feat: add idle presence client data helpers"
```

### Task 6: Add shared seat-state rendering and the local idle modal

**Files:**
- Create: `app/catana/components/IdlePromptModal.js`
- Create: `app/catana/__tests__/IdlePromptModal.source.test.js`
- Create: `app/catana/__tests__/GameScreen.idleGrace.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/OpponentPlayerBox.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/__tests__/PlayerAvatarStatsPresence.test.js`
- Modify: `app/catana/__tests__/OpponentPlayerBox.test.js`

- [ ] **Step 24: Write the failing UI source tests**

Add source-level checks for:
- `IdlePromptModal` approved copy: `Are you still there?`, `I'm still here`, countdown text hook,
- `GameScreen` reading `bgioProps.idlePresence`, `bgioProps.idleServerTimeMs`, and `bgioProps.credentials`,
- `GameScreen` posting to `/idle/${matchID}/ack`,
- `PlayerAvatarStats` rendering `Idle` as an alternative to `Disconnected`,
- `OpponentPlayerBox` / `PlayerActionContainer` treating idle seats as active seat-warning shells.

- [ ] **Step 25: Run the UI tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.idleGrace.test.js app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js`

Expected:
- FAIL because the modal does not exist,
- FAIL because `GameScreen` has no idle wiring,
- FAIL because presence text is hard-coded to `Disconnected`.

- [ ] **Step 26: Implement the seat-status generalization**

Update `app/catana/components/PlayerAvatarStats.js` so it derives display copy from `presence.status`, for example:

```js
const isSeatWarning = presence?.status === "disconnected" || presence?.status === "idle";
const presenceLabel = presence?.status === "idle" ? "Idle" : "Disconnected";
```

Use the same timer pill structure and warning glyph for both states.

Update `OpponentPlayerBox.js` and `PlayerActionContainer.js` so idle seats reuse the same warning shell classes currently used for disconnected seats.

- [ ] **Step 27: Implement the modal + `GameScreen` wiring**

Create `IdlePromptModal.js` as a focused glass/danger modal with:
- title,
- supporting countdown copy,
- inline error slot,
- `I'm still here` CTA.

Then update `GameScreen.js` to:
- read and annotate `bgioProps.idlePresence`,
- derive `idleStateByPlayerId`,
- compose effective seat presence with disconnect precedence,
- show the idle modal only when the local player matches `activeIdlePlayerId`,
- use `bgioProps.credentials` and `fetch` to call `POST /idle/:matchID/ack`,
- clear any local modal error on successful acknowledgement or when idle state disappears.

- [ ] **Step 28: Re-run the UI tests**

Run: `pnpm exec vitest run app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.idleGrace.test.js app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js`

Expected: PASS.

- [ ] **Step 29: Commit the idle UI slice**

```bash
git add app/catana/components/IdlePromptModal.js app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.idleGrace.test.js app/catana/GameScreen.js app/catana/components/PlayerAvatarStats.js app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js
git commit -m "feat: add idle afk grace ui"
```

### Task 7: Record the work and run the targeted verification set

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 30: Update agent docs**

Record:
- the idle-strike rule,
- the custom `/idle/:matchID/ack` endpoint,
- the disconnect-over-idle precedence rule,
- the client use of `bgioProps.credentials` for acknowledgement.

- [ ] **Step 31: Run the focused verification suite**

Run:

```bash
pnpm exec vitest run \
  server/__tests__/IdlePresenceManager.test.js \
  server/__tests__/acknowledgeIdle.test.js \
  server/__tests__/timerPubSub.test.js \
  server/__tests__/dispatchMatchUpdate.test.js \
  app/catana/__tests__/Moves.resign.test.js \
  app/catana/__tests__/idlePresence.test.js \
  app/catana/__tests__/gameText.test.js \
  app/catana/__tests__/IdlePromptModal.source.test.js \
  app/catana/__tests__/GameScreen.idleGrace.test.js \
  app/catana/__tests__/PlayerAvatarStatsPresence.test.js \
  app/catana/__tests__/OpponentPlayerBox.test.js
```

Expected: PASS.

- [ ] **Step 32: Run broader repo verification**

Run: `pnpm verify`

Expected:
- all tests pass,
- any remaining lint output should be limited to known non-blocking pre-existing warnings only.

- [ ] **Step 33: Commit docs + final verification**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record idle afk grace implementation"
```
