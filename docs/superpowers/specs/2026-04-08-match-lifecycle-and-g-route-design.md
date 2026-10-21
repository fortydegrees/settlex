# Match Lifecycle And `/g/:matchID` Design

## Summary

Settlex should treat a match URL as a stable game permalink, not a temporary live-lobby endpoint.

The canonical match URL becomes `/g/:matchID`.

That URL must work for the full lifetime of a match:

- while the match is live and unfinished
- after the match is finished but the live lobby is still retained for postgame chat
- after the live lobby has been cleaned up and only the archived record remains

The page should render one match experience with different capabilities depending on lifecycle state, similar to chess.com or lichess: the same link shows the live game when it is active, then later shows the final position and replay tools.

## Goals

- Make `/g/:matchID` the only canonical match URL.
- Remove `/catana/lobby/:matchID`.
- Keep finished matches chat-capable while players are still present.
- Clean up finished live matches automatically once they are inactive.
- Preserve finished matches durably for later read-only viewing and replay.
- Render the same app-level match page for both live and archived matches.

## Non-Goals

- Reworking the core game engine or match rules.
- Building synchronized chat replay in the first pass.
- Replacing the existing archive schema wholesale.
- Designing a brand-new replay UI from scratch in this slice.

## Product Behavior

### Canonical URL

The canonical route for a match is:

- `/g/:matchID`

This route is used for:

- live games
- finished postgame lobbies
- archived read-only replay/postgame viewing

The old `/catana/lobby/:matchID` route is removed rather than redirected.

## Lifecycle States

The match page should resolve one of four states on the server:

1. `live_unfinished`
2. `live_finished`
3. `archived`
4. `missing`

### `live_unfinished`

The live bgio match exists and is not over.

Capabilities:

- interactive board
- live chat
- normal reconnect behavior
- timers / active turn state

### `live_finished`

The live bgio match exists and `ctx.gameover` is set.

Capabilities:

- final board and postgame UI
- live chat remains enabled
- no further moves
- no timers / live gameplay automation

### `archived`

The live bgio match no longer exists, but a durable archived match record exists for the same `matchID`.

Capabilities:

- read-only final board and postgame UI
- replay controls
- read-only chat history
- no live socket gameplay session
- no message sending

### `missing`

Neither a live match nor an archived match exists for `matchID`.

Capabilities:

- 404 / match not found

## Server Resolution Model

`/g/:matchID` should be resolved on the server, not by first mounting a live bgio client and hoping to fall back later.

The resolver should:

1. Check whether a live match exists without triggering bgio match creation.
2. If a live match exists:
   - inspect whether it is unfinished or finished
   - render the live match page in the correct mode
3. If no live match exists:
   - look up the archived match by `bgio_match_id`
   - render archived read-only mode if found
4. If neither exists:
   - return not found

Important rule:

- Do not use a bgio sync path that auto-creates a missing match as part of this lifecycle resolution.

The live/archived decision is an app-level server concern, not something the browser should infer by failing a socket sync and then switching modes.

## Unified Match View Model

The page should consume a normalized app-level match view model rather than raw bgio shape alone.

The view model should include enough data to drive both live and archived rendering:

- `matchID`
- `status`: `live_unfinished | live_finished | archived`
- `players`
- `currentState` or `finalState`
- `initialState` when replay is available
- `gameLog`
- `chatLog`
- `replayFrames` or replay source data
- capability flags:
  - `canMove`
  - `canChat`
  - `isReplay`
  - `isArchived`

Live mode may still internally use bgio transport and live state, but the page contract should not depend on archived mode pretending to be a real live socket session.

## Cleanup Policy

### Archive Timing

When a match ends:

- archive it immediately to durable storage

“Archive immediately” means preserving the match record outside the live bgio store:

- metadata
- initial state
- final state
- action log / replay data
- associated per-match chat history

### Live Retention

Do not delete the live bgio match immediately at game end.

Instead:

- if any player remains connected, keep the finished live match
- when the last player disconnects, start a cleanup timer
- if any player reconnects before the timer expires, cancel cleanup
- if the timer expires with nobody connected, clean up the live bgio match

Recommended initial cleanup timer:

- 5 minutes after the last connected player leaves

This keeps postgame chat available without leaving finished matches in memory forever.

### Explicitly Rejected Behavior

Do not force-close the finished lobby exactly 5 minutes after game end regardless of active presence in v1.

That would cut off active postgame chat sessions and conflicts with the desired “keep it while any player is still connected” behavior.

## Chat Behavior

### Live Finished Matches

While the finished live match still exists:

- chat remains readable and sendable

### Archived Matches

Once the live match is cleaned up:

- chat becomes read-only

### Archival Requirement

Chat history should be archived durably with the match so that `/g/:matchID` can still show the conversation after cleanup.

Important implementation note:

- current bgio chat transport is broadcast-only and not a durable match record
- archived read-only chat therefore requires an app-managed per-match chat store rather than relying on bgio to replay chat history on sync

Archived chat entries should store at least:

- stable per-message id
- `matchID`
- sender / actor id
- message text
- created timestamp

## Replay Behavior

### V1

Archived mode should support:

- final-state postgame viewing
- board replay
- read-only archived chat as a static full history panel

### V2

Later, replay can reveal chat messages at the point they originally happened in the match.

That requires:

- durable timestamps on chat entries
- a replay timeline contract shared between board/log playback and chat reveal timing

This is an extension to the archive model, not a prerequisite for the first implementation.

## Route And Link Changes

The app should move match navigation to `/g/:matchID`.

This includes:

- match creation / join flows
- reconnect helpers
- active-match local storage
- in-app links
- any page loaders or route handlers that currently assume `/catana/lobby/:matchID`

The old `/catana/lobby/:matchID` route is removed rather than preserved as a redirect.

## Existing Replay URLs

`/g/:matchID` becomes the canonical lifecycle URL for a match.

Existing replay pages keyed by `replayId` may remain temporarily if useful for profile/history flows, but the long-term match permalink should be `matchID`-based so one link works both live and archived.

## Failure And Edge Cases

### Archive Exists But Live Also Exists

This is expected for finished matches that are still being retained for postgame chat.

Resolver behavior:

- prefer live mode while the live finished match still exists
- switch to archived mode only after live cleanup

### Cleanup Race With Reconnect

If a player reconnects during the cleanup window:

- cancel the pending cleanup
- keep the finished live match available

### Missing Archive For Finished Match

If cleanup ever becomes possible before archive succeeds, the system can lose the only durable record.

Therefore:

- archive must complete successfully before a finished match is eligible for cleanup

### Admin / Support Use

Archived chat visibility may eventually become admin-only or permission-gated, but the first pass can expose read-only archived chat broadly.

## Acceptance Criteria

- Visiting `/g/:matchID` during a live match shows the live interactive game.
- Visiting `/g/:matchID` after game end but before cleanup shows postgame UI with live chat still enabled.
- Leaving and revisiting `/g/:matchID` after cleanup shows archived read-only postgame/replay mode on the same URL.
- Finished live matches are not cleaned while any player remains connected.
- Disconnecting all players starts cleanup; reconnecting cancels it.
- Archived mode renders without a live bgio socket session.
- Archived mode includes read-only full chat history.
- `/catana/lobby/:matchID` no longer exists as the match route.
