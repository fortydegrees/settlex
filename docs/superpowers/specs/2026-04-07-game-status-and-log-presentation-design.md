# Game Status And Log Presentation Design

Date: 2026-04-07
Scope: Catana current-status rewrite, thought-bubble alignment, and MVP game-log timing/payload improvements
Status: Approved for implementation

## Goal

Make the status box near the dice act as a fast orientation surface:

- tell the viewer what is happening now,
- tell them who is acting,
- tell them what they should do next when it is their responsibility,
- stay correct for players, opponents, spectators, and reconnects.

At the same time, improve the game log enough that major actions are easier to understand without turning the status box into a second feed.

## Non-goals

- No full unified event architecture for all UI surfaces.
- No attempt to match Colonist feature-for-feature or string-for-string.
- No transient "major event flash" system in the status box for this MVP.
- No viewer-specific secret steal copy in this slice.
- No redesign of the status box shell, thought-bubble shell, or log panel shell.
- No change to server-authoritative game rules or timer policy beyond exposing better presentation data.
- No requirement that all effects replay on reconnect.

## UX Summary

The UI should have three separate jobs:

- Status box:
  - current prompt,
  - viewer-personalized,
  - orientation-first,
  - optionally shows a timer when the timer is semantically aligned with that prompt.
- Thought bubble:
  - icon-only companion to the same current-status model,
  - no independent copy or branching logic.
- Game log:
  - resolved events and history,
  - richer public payloads for key actions,
  - local reveal timing may wait for local effects to finish.

This slice intentionally keeps those jobs distinct:

- status answers "what is happening now?",
- log answers "what just happened?",
- the thought bubble echoes the current action category only.

## Product Rules

- The status box is a prompt/orientation surface, not an event feed.
- Viewer-personalized wording is the default:
  - if the viewer is the acting player, prefer direct imperatives such as `Discard resources`,
  - if another player is acting, prefer descriptive copy such as `Visitor 2 is discarding`.
- The thought bubble must continue to read from the same status model as the status box.
- Canonical game-log entries are still appended immediately in game state.
- Any delay in log visibility is client-local presentation timing only.
- Clients with animations disabled must not wait on other clients' settings.
- Reconnect must always recover a correct status box immediately from authoritative state.
- Backfilled log entries after reconnect should appear immediately, not wait for effects that may never replay.

## Recommended Approach

Introduce a richer shared current-status model for status box + thought bubble, while keeping the log as a separate canonical event history.

This is intentionally the middle path:

- more structured than the current string hack in `app/catana/utils/gameStatus.js`,
- much smaller than a full unified event pipeline,
- enough shared presentation logic to keep copy and semantics consistent across surfaces.

## Current-Status Model

`app/catana/utils/gameStatus.js` should stop returning only:

- `text`
- `statusType`
- `activePlayerId`

and instead return a richer object along the lines of:

```js
{
  kind: "waiting_for_roll",
  statusType: "rolling",
  activePlayerId: "1",
  title: "Waiting for Visitor 2 to roll",
  showTimer: true
}
```

### Proposed fields

- `kind`
  - semantic, viewer-aware status identifier
- `statusType`
  - existing icon bucket for the thought bubble
- `activePlayerId`
  - whose action the game is currently waiting on
- `title`
  - final viewer-facing copy for the status box
- `showTimer`
  - whether the timer should be rendered next to this status

### Proposed MVP kinds

- `waiting_to_start`
- `waiting_for_roll`
- `your_turn`
- `opponent_turn`
- `discard_self`
- `discard_other`
- `move_robber_self`
- `move_robber_other`
- `steal_self`
- `steal_other`
- `place_settlement_self`
- `place_settlement_other`
- `place_road_self`
- `place_road_other`
- `place_city_self`
- `place_city_other`
- `game_over`

The set should stay intentionally small. It should mirror real Catana phases and active UI actions, not become a general narrative system.

## Viewer-Personalized Copy

The status resolver should derive final copy from:

- authoritative phase/stage,
- local `playerAction`,
- `viewerPlayerId`,
- player display names.

### MVP copy table

| Situation | Viewer is actor | Viewer is not actor / spectator |
|-----------|-----------------|----------------------------------|
| `preGame` waiting | `Waiting to start` | `Waiting to start` |
| `main:preRoll` | `Roll dice` | `Waiting for {name} to roll` |
| `main:postRoll` | `Your turn` | `{name}'s turn` |
| `main:robberDiscard` | `Discard resources` | `{name} is discarding` |
| `main:moveRobber` | `Move the robber` | `{name} is moving the robber` |
| future explicit robber-steal step | `Choose a player to steal from` | `{name} is choosing who to steal from` |
| placement/build settlement | `Place settlement` | `{name} is placing a settlement` |
| placement/build road | `Place road` | `{name} is placing a road` |
| build city | `Place city` | `{name} is placing a city` |
| game over | `Game over` | `Game over` |

Notes:

- `Your turn` is intentionally terse for normal post-roll play.
- `Waiting for {name} to roll` is more useful than `{name}'s turn` in pre-roll because it tells a confused viewer exactly what gate is pending.
- The same copy rules should work for spectators by treating them as "viewer is not actor".

## Status / Thought-Bubble Relationship

The thought bubble should remain icon-only and continue to read the `statusType` field from the shared status model.

That means:

- no copy duplication in the thought bubble,
- no separate thought-bubble-specific game-state branching,
- no need to invent an event-feed mode for the bubble.

If the status box says:

- `Move the robber`

the bubble should simply show the robber icon.

If the status box says:

- `Visitor 2 is discarding`

the bubble should show the discarding icon over Visitor 2.

## Log Model

The game log remains canonical resolved history:

- entries are still appended in state by `app/catana/Moves.js`,
- formatting still lives in `app/catana/utils/gameText.js`,
- the log does not become a second current-status surface.

### MVP log improvements

Add or improve public log coverage for:

- `robber:move`
  - include the destination tile in public copy
- `robber:steal`
  - public wording only, for example `stole a card from Visitor 2`
- `dev:monopolyResult`
  - separate resolution event summarizing what was claimed
- `resource:shortage`
  - explain finite-bank shortfall cases

The status box should not display these as transient event flashes in this slice.

## Local Log-Reveal Timing

Canonical log entry creation should remain immediate.

Only visibility in the UI should be locally delayed.

### Why

- animation settings may differ by client,
- the authoritative game state should not wait on presentation,
- reconnect may skip effect replay entirely.

### MVP reveal rule

When the client first sees new canonical log entries live:

- distribution-resolution entries may be queued locally while a matching local distribution effect is active,
- once the effect finishes locally, those queued entries become visible,
- if animations are disabled, reveal them immediately.

### Distribution-resolution entries in scope

- `resource:gain`
- `resource:shortage`
- any robber-blocked / production-blocked distribution message added in this slice, if implemented

This is a UI-only reveal queue, not a different log source of truth.

## Timer Rules

The timer should be rendered only when the timer meaningfully matches the current prompt.

The status model should therefore own a `showTimer` boolean.

### MVP timer intent

- show timer for actionable statuses that correspond to an active timed stage or turn,
- hide timer for `game_over`,
- hide timer when the authoritative timer snapshot and the derived current-status kind are semantically out of sync.

### Important stale-timer rule

The server timer system intentionally includes a roll-animation buffer before certain stage timers begin.

That means the client can briefly be in a state where:

- the derived prompt has already moved on from `Roll dice`,
- but the latest timer snapshot still reflects the old pre-roll stage.

In that mismatch window, the status box should suppress the timer instead of showing a stale countdown next to the new prompt.

Practical rule:

- if the timer snapshot's stage meaning does not match the derived current-status kind, hide the timer until the next authoritative snapshot catches up.

This is enough for MVP; no new timer protocol is required in this slice.

## Reconnect Rules

Reconnect behavior must be explicit in the presentation layer.

### Status box / thought bubble

On reconnect:

- recompute current status immediately from the latest authoritative state,
- do not preserve any pre-disconnect transient local status.

This guarantees the viewer sees the correct prompt after resync even if they reconnect mid-turn, mid-discard, or mid-robber flow.

### Log reveal queue

On reconnect:

- clear any pending local reveal queue state,
- show backlog canonical log entries immediately,
- do not wait for effects that may not replay.

Rule of thumb:

- entries first seen live may be locally delayed,
- entries first seen as backlog after reconnect must appear immediately.

## Engine / Move Data Improvements

Some of the requested log improvements require better structured return data from engine rules.

### Monopoly

`game-core/src/rules/devCards.ts::applyMonopoly(...)` should return enough summary data for the move layer to append a separate public result log entry.

Preferred summary shape:

```ts
{ ok: true, resource: Resource, amountStolen: number }
```

This lets the log say:

- `Visitor 2 played Monopoly`
- `Visitor 2 claimed 8 sheep`

without diffing hands in the UI.

### Resource distribution shortages

`game-core/src/rules/turnFlow.ts::applyResourceDistribution(...)` / `applyRollDice(...)` should return shortage metadata, not just final successful distributions.

Preferred shape conceptually:

```ts
type DistributionShortage = {
  resource: Resource
  required: number
  available: number
  entitledByPlayerId: Record<string, number>
  allocatedByPlayerId: Record<string, number>
}
```

This supports both important bank-shortage cases:

- multiple claimants, bank cannot satisfy all:
  - nobody gets that resource type
- one claimant, bank cannot satisfy the full entitlement:
  - that player gets the remainder,
  - the log can explain why they received less than the full entitlement

### Robber move / steal

`robber:move` already has `tileId` in the move layer and should keep it.

For MVP:

- keep `robber:steal` public only,
- do not expose the exact stolen resource in the shared public log payload.

## Log Copy Guidelines

Target wording should be concise and public-information-safe.

### Examples

- `Visitor 2 moved the robber to sheep 8`
- `Visitor 2 stole a card from Visitor 1`
- `Visitor 2 claimed 8 sheep`
- `Bank shortage: 1 wheat available for 2 owed; Visitor 2 received 1`

Exact final wording can be tuned during implementation, but the important contract is:

- robber destination is explicit,
- monopoly result is explicit,
- finite-bank shortfall is explicit,
- public steal copy does not leak hidden information.

## File-Level Changes

- `app/catana/utils/gameStatus.js`
  - replace the current string-only status resolver with a richer viewer-aware model
- `app/catana/GameScreen.js`
  - pass viewer/player-name context into the status resolver
  - own the local log-reveal queue
  - clear pending reveal gates on reconnect
- `app/catana/components/PlayerActionContainer.js`
  - render `gameStatus.title`
  - only render timer when `gameStatus.showTimer` is true and the timer is semantically aligned
- `app/catana/components/StatusBubble.js`
  - keep reading `statusType` only
- `app/catana/utils/gameText.js`
  - add formatting for richer monopoly / robber / shortage log entries
  - reuse shared naming/copy helpers where practical
- `app/catana/Moves.js`
  - append improved canonical log payloads
  - add monopoly result entry
  - add shortage entries from engine return data
- `game-core/src/rules/devCards.ts`
  - return monopoly summary data
- `game-core/src/rules/turnFlow.ts`
  - return shortage metadata for finite-bank distribution cases
- tests under `app/catana/__tests__/` and `game-core/src/rules/*.test.ts`
  - cover viewer-personalized status, log payloads, reveal timing, and reconnect behavior

## Guardrails

- Do not turn the status box into a mini log.
- Do not make the thought bubble own separate game-state logic.
- Do not delay canonical log creation in state based on animation timing.
- Do not couple one client's log reveal timing to another client's animation settings.
- Do not block reconnect/backfill log visibility waiting for effects.
- Do not leak hidden steal information in public log entries.
- Do not chase Colonist parity for its own sake; keep the scope Catana-specific and MVP-sized.

## Verification

Add focused automated coverage for:

- viewer-personalized status resolution:
  - self vs other vs spectator
  - pre-roll vs post-roll
  - discard / robber / placement/build states
- timer visibility rules:
  - aligned snapshot shows timer
  - mismatched stale snapshot hides timer
- monopoly summary payload and log formatting
- robber destination log formatting
- public steal wording
- finite-bank shortfall payload and log formatting
- local log reveal timing:
  - animations on => distribution entries reveal after local effect completion
  - animations off => immediate reveal
  - reconnect/backlog => immediate reveal, pending gates cleared

Manual verification:

- take turn normally:
  - `Roll dice` -> `Your turn` reads correctly
- watch opponent:
  - `Waiting for {name} to roll` and `{name}'s turn` read correctly
- roll a `7`:
  - discard / robber copy is viewer-correct
- monopoly:
  - log shows both play and result
- robber:
  - log shows destination and public steal copy
- finite-bank shortage:
  - log explains why a player received fewer than their full entitlement
- disable animations locally:
  - log entries do not get stuck waiting
- reconnect into an active game:
  - status box is immediately correct
  - backlog log appears immediately

## Acceptance Criteria

- The status box reliably answers "what is happening now?" for players, opponents, and spectators.
- The thought bubble continues to mirror the same underlying status category without separate branching logic.
- `Your turn` only appears when it is actually the viewer's turn.
- The timer is not shown next to semantically stale status text after an action transition.
- `resource:gain` and other distribution-resolution entries no longer appear early when animations are enabled locally.
- Clients with animations disabled reveal those log entries immediately.
- Reconnect restores correct status immediately and does not leave log entries stuck behind dead effect gates.
- Monopoly, robber, and finite-bank shortage logs are materially more informative than the current MVP log.

## Open Questions

- None for this slice. Secret viewer-specific steal copy is intentionally deferred to a later design/implementation pass.
