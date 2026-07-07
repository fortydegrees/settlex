# Guest Auth And Play Entry Flow Design

Date: 2026-06-25
Scope: Homepage and lobby entry flows for logged-out visitors, guest profiles, saved accounts, username selection, and sign-in.
Status: Draft for user review

## Goal

Make the first game fast without making identity feel fake or confusing.

The product should clearly separate three concepts:

- an auth account, used for sign-in, recovery, and cross-device continuity,
- a game profile, used for username, avatar, color, and public display,
- a match seat, used by the live game server for one active game.

The first-time path should feel like "choose a username and play", not "create a full account before you can try the game". At the same time, generated usernames and avatars must not look like already-existing accounts until the player accepts or creates a guest profile.

## Product Principles

- Bot play is the lowest-friction path and should start without a visible identity step.
- Online and friend play need a visible identity checkpoint because other people will see the player's name.
- A generated name is a suggestion, not an account claim until the player submits it.
- The initial online checkpoint should ask for one real decision: username.
- Avatar and color can be shown as a generated preview, but full avatar/color choice should stay hidden unless the player asks for it.
- Sign-in is for saving, recovery, and using an existing account. It should not be required just to try a game.
- Guests can set a display username, but saving that profile requires email/password or another auth provider.

## States

### No Profile

The browser has no current guest or saved profile session.

Homepage chrome:

- top-right control says `Sign in`,
- no fake avatar/name pill is shown,
- play actions remain available.

### Guest Profile

The browser has a server-backed anonymous/guest profile.

Homepage chrome:

- top-right control shows the actual avatar/name,
- menu primary action is `Save profile` or `Create account`,
- menu also includes `Edit profile` and `Sign out`.

The guest profile may have either a generated username or a custom username chosen by the player.

### Saved Profile

The browser has a signed-in auth account linked to a game profile.

Homepage chrome:

- top-right control shows the avatar/name,
- menu includes account/profile actions and `Sign out`,
- account copy should no longer imply that the profile is temporary.

## Flow: First Visit, Top-Right Sign In

Clicking `Sign in` opens an auth-first modal, not a page navigation and not a small account popover.

The modal should support:

- email/password sign-in,
- email/password account creation,
- configured social providers when available,
- a quiet `Continue as guest` escape hatch.

The auth-first modal is about account continuity. It should not be the default gate for `Play Online`, because that would make online play feel like it requires registration.

## Flow: Play Vs Bot With No Profile

`Play vs Bot` should silently create or reuse a generated guest profile, then start the bot game.

Rules:

- no username modal is shown,
- the server remains authoritative for the final generated username,
- if a generated username collides, the server silently rerolls,
- after returning to the homepage/lobby, top-right chrome shows the created guest profile.

This keeps the "try it now" path genuinely fast.

## Flow: Play Online With No Profile

`Play Online` opens a username-first modal.

Recommended modal purpose:

> Choose a username to play online.

The modal creates a guest profile on this browser and then starts matchmaking. It must not imply that the suggested name is an existing account or that the player has already signed in.

### Default UI

Show:

- title: `Choose a username to play online`,
- short helper copy: `This creates a guest profile on this browser. You can save it later.`,
- a generated avatar/color preview,
- a username input prefilled with a generated name,
- primary CTA using the current input value,
- secondary action: `Sign in instead`.

Example CTA copy:

- `Play online as CleverSheep42`
- or `Use username and play`

The input itself is the edit affordance. Do not add a separate `Edit name` button.

### Avatar And Color

The generated avatar/color combo can be visible as a compact preview.

Default behavior:

- no avatar grid,
- no color grid,
- no carousel controls,
- no extra choices before play.

Optional behavior:

- clicking the avatar preview opens an expanded picker,
- the expanded picker can reuse the existing profile picker controls,
- closing the expanded picker returns to the username-first view.

This gives motivated players customization without making the first online step feel like a character creator.

### Username Source Rules

The client must send whether the username is still the untouched generated suggestion.

- Untouched generated suggestion: submit as `generated`; server may silently reroll on collision.
- Edited username: submit as `custom`; server returns the normal "username taken" error on collision.

If the server rerolls a generated username, the UI should accept the server-returned profile and continue. The player should see the final username in account chrome after entry.

If a custom username is taken, keep the modal open, focus the input, and show an inline error.

## Flow: Play A Friend With No Profile

`Play a Friend` should use the same username-first checkpoint as `Play Online`, with intent-specific CTA copy.

Example CTA copy:

- `Create invite as CleverSheep42`
- or `Use username and create invite`

After profile creation, continue directly into friend challenge creation.

## Flow: Returning Guest

When a guest profile already exists:

- `Play vs Bot` starts immediately,
- `Play Online` starts matchmaking immediately,
- `Play a Friend` creates the invite immediately,
- top-right chrome shows the guest avatar/name.

The account menu should make the temporary nature clear without being alarming:

- primary: `Save profile`,
- secondary: `Edit profile`,
- destructive/utility: `Sign out`.

`Save profile` opens a save-profile variant of the auth modal. It should preserve the current guest profile and attach email/password or a provider to it.

## Flow: Saved Account

When a saved account exists:

- no entry modal appears before play,
- username/avatar/color are read from the saved game profile,
- top-right menu uses account language instead of guest language.

If a player signs into an existing saved account while a guest profile also exists, do not silently overwrite the saved account's profile with guest data. The existing saved account should win unless a future explicit account-switch or merge flow is designed.

## UI Components

Use one modal shell with several modes rather than unrelated dialogs.

Suggested component shape:

- `AccountEntryModal`
  - `auth-first`
  - `play-username`
  - `save-profile`
- existing profile picker internals can be reused only inside the optional expanded avatar/color section,
- existing `IdentityModal` can remain for full profile editing after a guest profile exists.

The modal should use the shared Dialog/top-layer behavior. It must appear above blur overlays, alerts, board content, and homepage chrome. Avoid page-local z-index fixes that only solve one instance.

## Backend Contract

Better Auth owns auth users and sessions. Settlex owns the game profile attached to that auth identity.

Profile creation rules:

- bot path can create an anonymous/guest auth user plus profile silently,
- online/friend username modal creates an anonymous/guest auth user plus profile after submission,
- saved-account creation converts or links the current guest auth/profile rather than creating a parallel profile.

Username rules:

- generated usernames may reroll on collision,
- custom usernames must not reroll silently,
- username uniqueness remains server-authoritative,
- changing username as a guest is allowed, but it is still only recoverable on this browser until saved.

## Error Handling

Username modal:

- custom username taken: inline error, keep modal open,
- invalid username: inline validation near input,
- network/server failure: show retryable error and keep the typed username,
- generated collision: server rerolls silently and returns final profile.

Auth modal:

- wrong email/password: inline error,
- provider unavailable: hide provider button when config is missing,
- provider failure: return to modal with a concise retry message,
- guest-to-saved conflict: do not merge silently.

## Non-Goals

- No forced registration before first game.
- No full account merge UI in this pass.
- No mature username-change policy such as cooldowns, paid changes, or supporter-only changes.
- No requirement to configure social providers before this flow ships.
- No full profile editor inside the quick online username checkpoint.
- No public leaderboard/profile dependency for this flow.

## Implementation Notes

Expected code direction:

- keep `Play vs Bot` on the silent generated guest path,
- route `Play Online` and `Play a Friend` through a username-first guest creation modal when no profile exists,
- make top-right `Sign in` open the auth-first modal,
- make `Save profile` open the save-profile modal from the guest account menu,
- keep `/account` as a fallback route if useful, but the primary homepage experience should be modal-based.

Expected tests:

- focused source/unit tests for modal mode wiring,
- guest creation tests for generated versus custom username sources,
- flow tests showing bot play stays silent,
- flow tests showing online/friend play gates only when no profile exists,
- auth options tests showing unconfigured providers are hidden.

Manual visual verification is useful for the modal presentation, but implementation should not require a broad browser test pass for every small copy or spacing adjustment.

## Acceptance Criteria

- A new visitor can click `Play vs Bot` and start without seeing a username modal.
- A new visitor who clicks `Play Online` sees a clear username-first modal with a generated name already filled in.
- The online modal does not expose full avatar/color choice by default.
- Clicking the avatar preview can reveal optional avatar/color selection without making it part of the default decision.
- A generated username suggestion does not look like an existing account before submission.
- A custom username collision shows an error instead of silently changing the name.
- A returning guest sees their actual profile in the top-right account chrome.
- A guest can save the current profile with email/password later.
- Signing into an existing saved account does not silently overwrite that saved profile with guest data.
