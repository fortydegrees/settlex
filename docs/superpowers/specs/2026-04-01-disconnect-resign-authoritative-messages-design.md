# Disconnect / Resign Authoritative Messages Design

Date: 2026-04-01

## Goal

Handle resigns and disconnects with server-authoritative UX that fits Catana's current visual language.

For the current MVP:
- scope is 1v1 only,
- `resign` is an immediate loss,
- `disconnect` starts a 60 second reconnect window,
- if the disconnected player does not return in time, the other player wins by disconnect forfeit.

This design should:
- show durable server-originated messages in the game log,
- mark the disconnected seat clearly but subtly,
- show the reconnect countdown on the affected seat,
- reuse the existing game-over flow for resignation and disconnect forfeits,
- avoid putting transport/presence concerns inside deterministic core rules.

## Non-Goals

Not in this slice:
- multiplayer disconnect policies,
- bot takeover after timeout,
- removing a player from the board,
- returning cards/buildings to the bank,
- replay-safe persistence of presence inside `G.core`,
- a global top-of-screen banner system.

Future multiplayer behavior can layer on top of the same presence model, but this spec only covers the current 1v1 path.

## Product Decisions

### Match Outcomes

- `resign` ends the game immediately.
- `disconnect` does not end the game immediately.
- `disconnect` starts a 60 second reconnect grace period.
- reconnecting before the deadline clears the disconnect state immediately.
- failing to reconnect before the deadline ends the match and awards the win to the still-connected opponent.

### Log UX

The game log gains a new server/system message treatment:
- same log panel,
- distinct from gameplay entries,
- small `server` label pill,
- italic copy,
- more muted/slate or soft amber tone than normal move text.

These are durable state-change messages, not ticking status updates. The countdown itself should not spam the log.

Example copy:
- `server Bren disconnected. Reconnect window started.`
- `server Bren reconnected.`
- `server Bren failed to reconnect. Alice wins by forfeit.`
- `server Bren resigned. Alice wins.`

### Seat UX

When a seat is disconnected:
- dim the seat slightly,
- reduce saturation a little,
- apply a subtle slow pulse to the affected seat container,
- place a `⚠️` badge inside the avatar box at the bottom-right,
- show a reconnect pill directly below the avatar box: `Disconnected 0:43`.

The disconnected treatment should be noticeable, but it should still feel like Catana meta UI rather than a harsh alert state. Avoid flooding the seat with rose/red styling.

### Countdown Placement

The reconnect countdown belongs only under the affected player's avatar. It does not belong in the global action/status area, because that area is already used for turn/stage status and timers.

## Architecture

## Existing Constraints

Current repo structure already gives us:
- server-published timer snapshots in `server/timers/timerPubSub.js`,
- client access to `matchData`, including `boardgame.io` connection metadata,
- game log rendering via `G.gameLog` and `formatLogEntry`,
- existing game-over flow in the Catana UI.

`boardgame.io` already updates `matchData[].isConnected` on connect/disconnect. That should remain the raw authoritative transport signal. The new work is to turn that signal into server-owned match presence state and UI-friendly events.

One important constraint: `matchData` changes can arrive without a normal game-state `update` / `patch`. The disconnect design must therefore publish immediate UI data on connection changes instead of waiting for the next move.

## Recommended Model

Introduce a server-side disconnect presence layer that lives beside the existing timer manager, not inside `G.core`.

Per match, track:
- `playerId`
- `status`: `connected | disconnected | resigned`
- `disconnectedAtMs`
- `reconnectDeadlineAtMs`
- `resolvedAtMs`
- `resolution`: `none | reconnected | forfeit | resign`

Derived match snapshot:
- `activeDisconnectPlayerId`
- `deadlineAtMs`
- `remainingMs`
- `statusByPlayerId`
- `events`

The snapshot should be published to clients alongside the existing timer snapshot, using server time so countdown rendering stays consistent across refreshes and reconnects.

## Why Keep It Out Of `G.core`

Disconnect presence is a transport/platform concern, not a deterministic game rule. Keeping it out of core:
- preserves engine determinism,
- avoids replay/state pollution from transient connectivity,
- keeps future policy changes local to server orchestration,
- matches the current timer publishing pattern.

## Event Flow

### Disconnect

1. `boardgame.io` updates `matchData[player].isConnected = false`.
2. Server presence layer detects the transition.
3. If the match is active and unresolved:
   - mark the player disconnected,
   - start a 60 second reconnect timer,
   - append one authoritative server event for UI consumption.
4. Publish updated presence snapshot.

### Reconnect Before Deadline

1. `matchData[player].isConnected` flips back to `true`.
2. Server presence layer clears the pending timeout.
3. Mark the player reconnected.
4. Append one authoritative server event.
5. Publish updated snapshot.

### Disconnect Timeout

1. Server deadline expires while the player is still disconnected.
2. Server presence layer resolves the disconnect as a forfeit.
3. End the match immediately and award the win to the connected opponent.
4. Append one authoritative server event.
5. Publish final presence snapshot.

### Resign

1. Player explicitly triggers `resign`.
2. Server skips reconnect flow entirely.
3. End the game immediately.
4. Record and publish one authoritative server event.

## UI Contract

The Catana client should receive:
- existing `matchData`,
- existing timer snapshot,
- new disconnect presence snapshot.

The client should not infer disconnect outcomes locally from browser transport state alone.

Because connection changes may arrive as `matchData` messages before the next state update, the presence snapshot must be delivered on that path too, or through an equivalent immediate server channel. Waiting for the next move is not acceptable for disconnect UX.

## Log Rendering

Extend the log formatting path to support server-originated entries with a new entry type, for example:
- `server:disconnect`
- `server:reconnect`
- `server:disconnectForfeit`
- `server:resign`

These entries should:
- render in the existing log panel,
- use distinct token formatting from gameplay actions,
- not look like errors,
- preserve player names and emojis where useful.

Recommended styling:
- `server` pill label in muted/slate or soft amber,
- italic text,
- no bold by default,
- no aggressive red unless the match result itself needs emphasis.

The current log panel only renders `G.gameLog`, so the implementation must explicitly choose one of these:
- merge authoritative presence events with `G.gameLog` in the client before rendering, or
- persist server log entries into the game's durable log path through an explicit server/game integration.

For this MVP, client-side merged rendering is the simpler fit because disconnect presence is intentionally kept outside `G.core`.

## Seat Rendering

Extend player seat components so both self and opponent seats can consume a shared presence state input.

Recommended props shape:
- `presenceState`
- `disconnectRemainingMs`

Affected components:
- `PlayerAvatarStats`
- `OpponentPlayerBox`
- self-seat composition inside `PlayerActionContainer`

Disconnected seat rules:
- slight opacity reduction,
- slight desaturation,
- gentle slow pulse on the seat container,
- `⚠️` badge inside avatar bottom-right,
- reconnect pill below avatar only.

The pulse should be custom and subtle, not the default loud Tailwind pulse. Respect `prefers-reduced-motion`.

## Endgame UI

Reuse the current game-over path. Extend the reason copy so it can show:
- `Resignation`
- `Disconnect Forfeit`

No separate disconnect modal is needed for the MVP.

## Data Transport Options

### Preferred

Attach disconnect snapshot data the same way timer snapshot data is attached today:
- server observes/publishes match updates,
- helper enriches outgoing payload with presence snapshot and server timestamp,
- client reads the snapshot directly from board props.

This keeps delivery aligned with existing Catana timer infrastructure, but it must also enrich `matchData`-driven connection-change payloads so disconnect UI updates immediately.

### Acceptable Alternative

If attaching to state updates becomes awkward, expose a dedicated server endpoint for polling current disconnect presence. This is less desirable because it duplicates the existing publish model and creates more client orchestration.

## Implementation Notes

### Server

Add a new server-side manager, parallel to `TimerManager`, responsible for:
- tracking disconnect state,
- starting/canceling reconnect deadlines,
- producing a UI-ready snapshot,
- producing durable server-log events,
- triggering end-of-match resolution on timeout.

This manager should consume:
- `matchData` connection changes,
- explicit resign actions,
- possibly state updates only to know whether the match is already over.

### Client

Client work splits cleanly into:
- formatting/rendering server log entries,
- injecting presence state into seat components,
- rendering reconnect countdown from server timestamp + deadline,
- clearing visuals immediately when reconnect resolves.

### Resign API

If no explicit resign move/UI exists yet, add one as a deliberate player action that resolves instantly and logs a server message.

## Open Boundaries For Later

This model is intentionally compatible with future multiplayer policies:
- bot takeover after timeout,
- skipped turns,
- seat removal,
- setup-time disconnect policy selection.

Those policies should reuse the same disconnect presence layer, changing only resolution behavior after deadline.

## Testing

### Server Tests

- disconnect starts a 60 second reconnect window,
- reconnect before deadline clears pending timeout,
- disconnect timeout resolves 1v1 match in favor of opponent,
- resign ends immediately without grace period,
- resolved matches ignore later disconnect transitions.

### Client Tests

- server log entries render with distinct styling,
- disconnected seat shows warning badge inside avatar,
- reconnect pill renders below avatar,
- disconnected seat gets subtle pulse/dim treatment,
- reconnect clears seat treatment,
- game-over reason renders correctly for resignation and disconnect forfeit.

### Manual Verification

1. Start a 1v1 match.
2. Disconnect one client.
3. Verify the other client sees:
   - server log entry,
   - affected seat dim/pulse/warning badge,
   - countdown under the avatar.
4. Reconnect before 60 seconds and verify everything clears.
5. Repeat and let the timer expire.
6. Verify the match ends with opponent win and `Disconnect Forfeit` reason.

## Acceptance Criteria

- In a live 1v1 match, a player disconnect triggers an authoritative 60 second reconnect window.
- The disconnected player's seat is visibly marked with subtle Catana-consistent styling.
- The reconnect countdown appears directly below the affected avatar.
- The game log shows durable server-originated entries styled differently from gameplay entries.
- Reconnecting before the deadline clears the disconnect state immediately.
- Failing to reconnect before the deadline ends the game and awards the win to the opponent.
- Resigning ends the game immediately and logs a distinct server message.
- The implementation does not move disconnect presence into deterministic core rules.
