# Friend Challenge Invite Design

## Summary

Settlex should add a lightweight `Play a Friend` flow on the front page that lets a player create a private 1v1 challenge link, copy it, and wait for a friend to accept.

For MVP, the creator stays on the front page and sees a modal with the copyable challenge link rather than entering a dedicated waiting room. The underlying match is still a normal live 2-player Catana match, but the shared URL is **not** the live game URL.

The challenge link uses:

- `/challenge/:matchID`

The live game uses:

- `/g/:matchID`

This keeps the product intent clear:

- challenge link
- live game link
- replay link

all remain distinct.

## Goals

- Add a third primary front-page action: `Play a Friend`.
- Let the inviter create a private challenge link and copy/share it immediately.
- Keep the inviter on the home page for MVP.
- Auto-route both players into the live game once the invitee joins.
- Make the challenge temporary:
  - closing the modal cancels it
  - it expires after 5 minutes if nobody joins
- Keep friend challenges private:
  - not used by matchmaking
  - not shown in open game lists
  - not joinable through normal room-code flows
- Avoid changing Catana gameplay rules to handle fairness.

## Non-Goals

- Building the long-term waiting room/settings screen in this slice.
- Introducing a separate invite-token table for MVP.
- Changing Catana turn-order or placement rules.
- Solving background janitor cleanup for abandoned empty friend matches in v1.

## Product Behavior

### Front Page CTA

The main lobby card should expose:

- `Play`
- `Play a Friend`
- `Play Against Bot`

`Play a Friend` sits between `Play` and `Play Against Bot`.

### Identity Gate

The inviter uses the existing identity gate:

- if they already have an account/session, skip identity setup
- if they do not, show the current identity modal first

The invitee behaves similarly:

- if they already have an account/session, `/challenge/:matchID` auto-joins immediately
- if they do not, `/challenge/:matchID` shows a lightweight prefilled identity form first

The prefilled guest form should include:

- a generated default username in a simple guest pattern such as `Guest 4821`
- a random emoji
- a random player color

All three remain editable before join.

## URL Model

### Challenge URL

The challenge acceptance route is:

- `/challenge/:matchID`

This route exists only to accept a pending friend invite.

It must not behave like:

- a spectator link
- a direct live game link
- a replay link

### Live Match URL

Once both players are seated, the app routes them into:

- `/g/:matchID`

The challenge URL is not reused as the gameplay URL.

## Match Model

For MVP, `Play a Friend` still creates a normal 2-player live match immediately.

The difference is that the match is tagged as a friend challenge in app-owned metadata so the app can treat it differently from public/open matches.

Required challenge metadata:

- `matchKind: "friend_challenge"`
- `createdAt`
- `expiresAt`
- `inviterAccountId`
- `inviterSeatId`

The invitee seat is simply the other seat.

This metadata may live in app-owned match setup/metadata fields; the game engine does not need to interpret it.

## Invite Creation Flow

When the inviter clicks `Play a Friend`:

1. Ensure the inviter has an account/session.
2. Randomly assign the inviter to seat `0` or seat `1`.
3. Create a normal 2-player match.
4. Join the inviter into the randomly selected seat.
5. Mark the match as a private friend challenge with a 5-minute expiry.
6. Show a modal on the home page with the challenge link.

The modal should display:

- title: `Waiting for friend to join`
- copyable challenge link
- helper text explaining:
  - keep this open while your friend joins
  - closing it cancels the invite
- a destructive/secondary action:
  - `Close & cancel invite`

## Invitee Acceptance Flow

### Existing Account

If the invitee already has an account/session and the challenge is still valid:

1. Auto-join the open seat immediately.
2. Route to `/g/:matchID`.

No confirmation screen is shown in MVP.

### No Account Yet

If the invitee does not already have an account/session and the challenge is still valid:

1. Show the lightweight identity form with generated defaults.
2. Persist that guest identity on submit.
3. Join the open seat.
4. Route to `/g/:matchID`.

## Invite Validity Rules

`/challenge/:matchID` is valid only if all of the following are true:

- the match exists
- it is tagged as `friend_challenge`
- the current time is before `expiresAt`
- the inviter seat is still occupied
- exactly one seat remains open
- the open seat is the invitee seat

Otherwise the route shows:

- `This invite has expired.`

This same expired state is used for:

- timed-out invites
- inviter-canceled invites
- already-claimed invites
- malformed/non-challenge links

## Cancelation And Expiry

### Inviter Cancels

If the inviter closes the modal before the friend joins:

1. remove the inviter from the match via the normal leave flow
2. invalidate the challenge immediately
3. clear any local “active invite” state in the browser

From the user’s perspective, the challenge and its waiting lobby are canceled.

Important implementation note:

- the underlying live match record does not need to be physically deleted in v1 as long as it becomes unjoinable, undiscoverable, and challenge resolution treats it as expired

### Timeout

If 5 minutes pass without the invitee joining:

1. expire the modal client-side
2. remove the inviter from the match if they are still seated
3. treat `/challenge/:matchID` as expired

Recommended copy:

- `Challenge expired`
- `Your friend did not join in time.`

## Privacy And Discovery Rules

Friend challenges are private product flows even though they are backed by normal live match ids.

They must be excluded from:

- `Play` matchmaking candidate selection
- the open games list on the home page
- join-by-room-code flows
- generic match-join API paths intended for public rooms

This means public join surfaces should reject `friend_challenge` matches, while the dedicated challenge acceptance flow remains allowed to join the open seat.

## Fairness

Do not change Catana game rules to special-case friend challenges.

Instead:

- keep the normal seat-based placement order and turn order
- randomize which seat belongs to the inviter at challenge creation time

That produces the desired fairness property:

- the inviter does not always go first
- the engine remains unchanged
- seat ownership, not game rules, is randomized

## UI States

### Inviter

Possible inviter states:

1. idle on home page
2. identity gate
3. invite modal open and waiting
4. invite canceled
5. invite expired
6. friend joined -> route to `/g/:matchID`

### Invitee

Possible invitee states:

1. resolving challenge
2. expired
3. identity form (if needed)
4. auto-joining or joining after form submit
5. routed to `/g/:matchID`

## API / App Boundary

The app should own friend-challenge resolution instead of letting the browser treat it as a raw public bgio room.

The app-level challenge flow needs enough server-side behavior to:

- validate challenge metadata and expiry
- determine whether the invite is pending or expired
- join only through the dedicated challenge path
- prevent public join endpoints from accepting friend-challenge matches

Exact route naming can be chosen during implementation, but the system needs:

- a server-side way to resolve `/challenge/:matchID`
- a dedicated accept/join path for valid challenge matches
- rejection in standard public join routes for `friend_challenge` matches

## Future-Friendly Shape

Even though MVP uses a modal on the front page, the underlying model should not block the later waiting-room product.

The later extension should be able to replace the modal with a dedicated pre-game room that supports:

- match settings
- clearer inviter/invitee presence
- manual start if desired in future
- richer copy/share UI

The MVP data model should therefore think of the challenge as “a private pre-game state backed by a live match,” even if the first UI is just a modal.
