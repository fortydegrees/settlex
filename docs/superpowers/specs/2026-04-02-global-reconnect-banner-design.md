# Global Reconnect Banner Design

Date: 2026-04-02

## Goal

Add a lightweight global reconnect affordance so a player who closes the match tab can return to the app on any page and quickly get back into their most recent match.

For the MVP:
- the banner should be available on any app page,
- it should only track the most recent saved match,
- it should use the browser's existing saved seat credentials,
- it should be dismissible for the current page session,
- it does not need a new authoritative reconnect-status endpoint.

## Non-Goals

Not in this slice:
- supporting multiple simultaneous reconnect banners,
- true server-owned browser session tracking,
- authoritative "all reconnectable matches for this user" lookup,
- cross-device recovery,
- a persistent dismissed state across refreshes,
- redesigning the existing lobby / match join architecture.

## Product Decisions

### Scope

- The reconnect affordance should appear on any page in the app.
- The banner should represent only the most recent saved match.
- If the user dismisses the banner, it should stay hidden only until refresh.

### Show Rule

Show the banner when all of these are true:
- a local `lastActiveMatch` record exists,
- the matching credentials key still exists in localStorage,
- the saved match still exists according to the existing lobby match endpoint,
- the user is not already on that exact match page.

The banner should appear even if the saved seat is not currently marked disconnected. For the MVP this is a "return to your game" affordance, not only a "you are currently disconnected" alert.

### Banner Copy

Recommended MVP copy:
- title: `You're already in a game`
- body: `Return to your latest Catana match.`
- primary action: `Rejoin match`
- secondary action: `Dismiss`

If a player name is available in the local record, the body may become:
- `Return to your latest Catana match as Alice.`

Match IDs can be shown only if useful for disambiguation, but should not be the visual focus of the banner.

## Architecture

## Existing Constraints

Current app behavior already gives us:
- per-seat credentials stored in localStorage in:
  - `catana:lobby:credentials:${matchID}:${playerID}`
- app-wide rendering through `app/layout.js`
- lobby match metadata fetches through the existing boardgame.io lobby endpoint:
  - `GET /games/catan/:matchID`

Current lobby metadata can confirm that a match still exists, but it cannot authoritatively confirm that a seat is both unfinished and reconnectable. That limitation is acceptable for the MVP and must be recorded explicitly.

## Recommended Model

Add one new localStorage record, for example:

`catana:last-active-match`

Suggested shape:
- `matchID`
- `playerID`
- `playerName`
- `savedAtMs`

This record is updated whenever the browser successfully joins or resumes a seated match.

The global banner reads this record on mount, validates it, and either:
- renders a reconnect banner,
- or clears / ignores the stale record.

## Validation Strategy

The MVP uses lightweight validation only:

1. Read `lastActiveMatch`.
2. Check that the matching credentials key still exists.
3. Call the existing lobby match endpoint for that `matchID`.
4. If the match is missing, malformed, or the saved seat no longer exists, suppress the banner.
5. Otherwise show the banner.

This is intentionally a weak validity check:
- it proves "this saved match still exists",
- it does not prove "this seat is definitely reconnectable right now".

## UI Placement

Mount a client-only reconnect banner from the root layout so it can appear on:
- `/`
- `/catana/lobby`
- `/catana`
- any future app routes

The banner should:
- sit at the top of the page content,
- use the current Catana glass / pill language rather than a browser-style warning strip,
- remain noticeable but not alarming,
- avoid clashing with in-match disconnect styling.

Recommended visual treatment:
- compact glass panel,
- subtle ring / shadow,
- primary CTA using the existing pill/button vocabulary,
- no red warning semantics by default.

## Behavior

### Save

Write / overwrite the `lastActiveMatch` record when:
- a user successfully joins from the lobby,
- a user lands in a match page with valid credentials,
- a user is actively seated in an in-progress match.

### Rejoin

The primary CTA routes the user to:

`/catana/lobby/${matchID}?playerID=${playerID}`

That page continues to use the existing credential-loading flow.

### Dismiss

Dismiss should be session-local UI state only.

For the MVP:
- do not remove the `lastActiveMatch` localStorage record,
- do not persist dismissal across refresh,
- do hide the banner for the current page session after dismissal.

### Clear

Clear or replace the saved match record when:
- a newer match becomes active,
- the match page knows the game is over,
- validation determines the saved record is stale.

## Error Handling

- If localStorage is unavailable, fail closed and render no banner.
- If the lobby validation request fails, prefer suppressing the banner rather than showing a misleading reconnect affordance.
- If the user clicks `Rejoin match` and the destination page cannot resume the seat, the destination flow remains responsible for showing the error and clearing stale state if appropriate.

## MVP Compromises / Future Hardening

The reconnect banner MVP intentionally uses:
- local browser state for "latest match",
- existing lobby metadata for weak validation.

Known limitation:
- the banner can still be stale in edge cases because the existing lobby endpoint does not expose authoritative unfinished / reconnectable seat state.

Future hardening path:
- add a small server endpoint that validates reconnect eligibility for a saved `matchID + playerID`,
- or later add true server-owned browser session tracking if the product grows into cross-device recovery.

This decision should also be recorded in the repo-level MVP compromises ledger.

## Testing

Recommended coverage:

### Unit

- banner stays hidden when no saved match exists,
- banner stays hidden when saved credentials are missing,
- banner shows when local record and validation both succeed,
- banner hides after dismiss until refresh,
- banner suppresses itself on the active match page.

### Integration

- join a match, navigate back to `/`, verify banner appears,
- click `Rejoin match`, verify route goes back to the saved match,
- end the match, verify the saved record is cleared and the banner disappears on next load,
- simulate stale saved data, verify validation suppresses the banner.
