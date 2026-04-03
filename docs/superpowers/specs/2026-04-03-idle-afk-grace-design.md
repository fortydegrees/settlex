# Idle / AFK Grace Design

Date: 2026-04-03

## Goal

Add a server-authoritative idle / AFK flow for Catana that detects when a human player stops participating for multiple normal gameplay turns, warns them, and then resolves the match if they do not respond.

For the MVP:
- scope is 1v1 only,
- setup / placement turns do not count,
- a human player gets an idle strike only after a fully auto-resolved normal gameplay turn,
- `2` consecutive idle strikes start a `60` second idle grace window,
- if the player does not acknowledge during that window, the other player wins by AFK forfeit.

This design should:
- reuse the current server-authored log / seat-status UI language,
- keep idle state separate from real transport disconnects,
- avoid rewinding or interrupting turns that the server already auto-resolved,
- fit the current timer + server snapshot architecture.

## Non-Goals

Not in this slice:
- setup / placement idle enforcement,
- browser heartbeat / focus / mouse-movement tracking,
- cross-tab or cross-device presence reconciliation,
- multiplayer AFK policy,
- bot takeover after AFK timeout,
- rewinding a turn after the player acknowledges,
- collapsing idle and disconnect into one shared server state.

## Product Decisions

### Idle Strike Definition

An idle strike is recorded only when all of these are true:
- the seat is a human player,
- the match is in normal gameplay,
- the seat's turn resolves through server auto-timeout moves,
- no genuine human-authored move occurs during that turn.

For the MVP, setup / placement turns never count toward idle strikes.

### Strike Reset

Any genuine human-authored move during normal gameplay resets that player's consecutive idle-strike count to `0`.

This includes low-commitment actions like a real `endTurn`; the MVP definition is "did the human participate at all?" not "did they perform a complex action?"

### Grace Trigger

When a human player reaches `2` consecutive idle strikes:
- the server starts a `60` second idle grace window,
- that seat is marked `Idle`,
- the countdown is visible to everyone,
- only the affected player gets the modal prompt.

### Acknowledge Behavior

The modal should read:
- title: `Are you still there?`
- body: `You'll forfeit in 0:59 unless you respond.`
- primary action: `I'm still here`

Clicking `I'm still here`:
- clears the active idle grace state,
- clears the player's accumulated idle strikes,
- does not rewind or interrupt any turn resolution that already happened.

### Public UI

Everyone should see:
- a server log message when idle grace starts,
- the affected seat marked with an `Idle 0:59` countdown pill.

Only the affected local player should see the modal.

### Relationship To Disconnect

`Idle` and `Disconnected` are different states:
- `Disconnected` means transport/socket loss,
- `Idle` means the player stayed connected but stopped making human moves.

They may share UI primitives, but not wording or server event types.

If both states overlap, `Disconnected` wins visually and functionally. The client should not tell the table a player is merely idle if their socket is actually gone.

## Architecture

## Existing Constraints

The current repo already has:
- server-owned disconnect presence in `server/presence/DisconnectPresenceManager.js`,
- server-owned turn/stage timeout behavior in `server/timers/TimerManager.js`,
- snapshot enrichment in `server/timers/timerPubSub.js`,
- existing seat/log UI for disconnected players in `app/catana/GameScreen.js`,
- existing local transport banner handling via `bgioProps.isConnected`,
- existing seat credentials stored in localStorage for seated players.

The current timer system already auto-progresses inactive turns with moves such as:
- `autoRoll`
- `autoEndTurn`
- `autoPlaceSettlement`
- `autoPlaceRoad`
- `autoMoveRobber`

That means the game does not get stuck today. The AFK feature is not about unblocking gameplay; it is about deciding when repeated server-only turn resolution means the human is no longer participating.

## Recommended Model

Add a new server-owned idle manager, parallel to the disconnect manager.

Suggested per-match record:
- `strikesByPlayerId`
- `turnActivityByPlayerId`
- `activeIdlePlayerId`
- `deadlineAtMs`
- `statusByPlayerId`
- `events`
- `resolved`
- timer handle for the idle grace deadline

Suggested snapshot:
- `activeIdlePlayerId`
- `deadlineAtMs`
- `remainingMs`
- `statusByPlayerId`
- `events`

This should be published beside:
- `timerSnapshot`
- `disconnectPresence`

using the same enriched board payload path.

## Why Keep It Separate From Disconnect Presence

The state machine is related, but the semantics are different:
- disconnect state is driven by transport facts,
- idle state is driven by gameplay participation policy.

Keeping them separate:
- avoids lying in the UI,
- makes future multiplayer AFK rules easier to evolve,
- lets idle be acknowledged without pretending the socket reconnected,
- avoids overloading `DisconnectPresenceManager` with a second policy domain.

## Idle Detection Strategy

For the MVP, detect idleness by observing normal gameplay turns and `deltalog`.

Recommended rule:
1. Track per-turn activity for the current human player during normal gameplay only.
2. If a human-authored move occurs, mark that turn as active participation.
3. If the turn resolves only through server timeout moves and no human-authored move was recorded, count one idle strike when the turn ends.
4. If a human-authored move occurs on a later normal gameplay turn, reset the strike count to `0`.

### Human vs Auto Move Classification

For MVP, classify moves by move name:
- server timeout moves: `autoRoll`, `autoEndTurn`, `autoPlaceSettlement`, `autoPlaceRoad`, `autoMoveRobber`, `autoDiscard`, `autoResolveDevCard`
- gameplay moves: normal player-authored moves such as `rollDice`, `endTurn`, `maritimeTrade`, `buyDevCard`, piece placement, dev card flow, etc.

This is intentionally a pragmatic classification, not a full browser-activity model.

## Grace / Resolution Flow

### Idle Grace Start

When a player reaches `2` consecutive idle strikes:
- mark the seat idle,
- set `deadlineAtMs = now + 60_000`,
- append one authoritative idle event,
- publish updated snapshot,
- start the idle grace timer.

### Acknowledge

When the affected player acknowledges:
- clear the grace timer,
- clear `activeIdlePlayerId`,
- clear `deadlineAtMs`,
- reset that player's strike count to `0`,
- mark the player connected/idle-clear in idle state,
- append one authoritative event,
- rebroadcast the current state with the updated idle snapshot.

### Idle Timeout

If the idle grace timer expires:
- append one authoritative idle-forfeit event,
- end the match immediately,
- award the win to the opponent,
- surface the result through the existing game-over flow with AFK-specific reason text.

## Transport And Endpoints

### Snapshot Delivery

Idle presence should be attached to the same live board payloads as timer / disconnect data:
- `idlePresence`
- `idleServerTimeMs`

This keeps countdown rendering aligned with the current Catana snapshot model and avoids new polling.

### Acknowledge Endpoint

Use a small custom server endpoint for the modal acknowledgement, parallel to the existing custom `/timer/:matchID` route.

Recommended shape:

`POST /idle/:matchID/ack`

Request body:
- `playerID`
- `credentials`

The server should validate that the caller still owns that seat before clearing idle state.

This endpoint is preferable to a normal gameplay move because:
- idle state lives outside `G.core`,
- acknowledgement is a platform/presence action, not a deterministic game rule move,
- it avoids widening gameplay move maps just to clear server-owned idle state.

## UI Contract

The Catana client should receive:
- `timerSnapshot`
- `disconnectPresence`
- `idlePresence`

The client should merge idle state with existing seat/log rendering rather than inventing a separate visual system.

### Seat Rendering

When a seat is actively idle:
- reuse the existing affected-seat treatment,
- show the pill as `Idle 0:59`,
- reuse the gentle pulse / dim language already established for disconnects,
- prefer `Disconnected` over `Idle` if both are present.

### Log Rendering

Add AFK/idle server log entry types such as:
- `server:idle`
- `server:idleAck`
- `server:idleForfeit`

Example copy:
- `server Bren was idle for 2 turns. Response window started.`
- `server Bren confirmed they are still here.`
- `server Bren failed to respond. Alice wins by forfeit.`

### Modal Rendering

Only the affected local player should see the modal.

Recommended behavior:
- show the same live countdown as the seat pill,
- keep the modal copy concise and urgent,
- primary CTA: `I'm still here`,
- optional inline error if acknowledgement fails,
- do not block future server updates while the modal is open.

## Endgame UI

Reuse the existing game-over flow.

Extend reason copy so the game-over UI can show:
- `AFK Forfeit`

No special post-timeout overlay is needed for MVP.

## Error Handling

- If idle snapshot data is missing, fail closed and render no idle UI.
- If `POST /idle/:matchID/ack` fails, keep the modal open and show a small inline error.
- If the player disconnects while idle grace is active, the disconnect flow takes precedence.
- If the match resolves before the player acknowledges, close the modal and defer to normal game-over UI.

## MVP Compromises / Future Hardening

The AFK MVP intentionally detects idleness through fully auto-resolved normal gameplay turns, not through richer client activity tracking.

Known limitations:
- a player who lightly interacts once per turn will not be considered idle,
- a player watching the game without clicking anything will eventually be considered idle even if the tab remains open,
- the system does not distinguish between "temporarily distracted" and "truly gone" beyond the grace window.

Future hardening path:
- add richer client activity signals or heartbeat semantics,
- consider wall-clock inactivity in addition to turn-level auto-resolution,
- extend the policy beyond 1v1 once multiplayer AFK behavior is defined.

This decision should be recorded in the repo-level MVP compromises ledger.

## Testing

Recommended coverage:

### Server Unit

- setup / placement turns do not create idle strikes,
- one fully auto-resolved normal gameplay turn creates one strike,
- a second consecutive fully auto-resolved normal gameplay turn starts idle grace,
- any genuine human move resets strikes to `0`,
- acknowledge clears idle grace and strikes,
- idle timeout ends the 1v1 match with AFK forfeit,
- disconnect state overrides idle if both would be active.

### Client Unit

- `Idle 0:59` seat state renders through the shared status primitives,
- idle server log entries render in the server-message style,
- only the affected local player sees the idle modal,
- the modal countdown matches the published idle snapshot,
- `Disconnected` UI wins over `Idle` UI when both are present.

### Integration / Manual

- let one player auto-time out through two full normal turns and verify idle grace starts,
- click `I'm still here` and verify idle state clears without rewinding the game,
- let the 60 second idle grace expire and verify AFK forfeit result,
- disconnect during an active idle grace window and verify disconnect treatment takes precedence.
