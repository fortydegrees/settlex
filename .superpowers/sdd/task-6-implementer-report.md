# Task 6 Implementer Report

## Outcome

- Extracted provider-free `SearchingModal`,
  `PendingFriendChallengeScreen`, and `AccountPageView` production leaves.
- Kept matchmaking, match alerts, auth, requests, polling, credentials,
  redirects, navigation, and account refreshes in their route clients.
- Added 27 named stories across search/rescue, account entry, identity,
  friend challenge, and account page surfaces.
- Replaced the page account form's native inputs/buttons with canonical
  `Input` and `Button` primitives while preserving visible copy and layout.
- Marked the five catalog rows `Covered` with their extracted owners and
  orchestration boundaries.
- Deleted both source-reading suites after mapping every assertion.

## Source-test assertion migration

### `HomeTableClient.matchmakingRescue.source.test.js`

1. `0-11s` waiting and `12s` alert rescue:
   `getMatchmakingRescueStage` literal threshold cases in
   `matchmakingRescue.test.js`; named `FindingTable` and
   `AlertRescueAvailable` stories cover the rendered states.
2. Keep-waiting controls do not recreate the queue:
   queue ownership/order remains covered by
   `matchmakingRescue.test.js` and
   `useLobbyHomeActions.matchmaking.test.js`; local disclosure/copy moved to
   the `AlertRescueAvailable` and `PufferRescueAvailable` stories.
3. Puffer is available only at the 30-second stage:
   literal `30 -> puffer` helper coverage plus the
   `PufferRescueAvailable` story.
4. `playOnline=1` waits for account readiness and is consumed once:
   replaced with the production-used `consumePlayOnlineIntent` seam and a
   behavior-first test in `matchmakingRescue.test.js`.
5. Repeated Puffer clicks are locked during the leave transition:
   existing `playPufferAfterLeavingSearch` pending-transition behavior test.
6. Puffer startup remains blocking after the public search is left:
   existing pending lifecycle coverage plus the named `StartingPuffer` story.

### `MatchPageClient.friendChallenge.source.test.js`

1. Pending friend challenge routing, state resolution, canonical `/g/:id`
   URL, and accept/cancel lifecycle:
   `friendChallenge.test.js`, `challengeRoutes.test.js`, and
   `pendingFriendChallenge.test.js`; named friend-challenge stories own
   inviter/invitee/expired/error presentation and exact copy.
2. Anonymous session establishment precedes guest profile provisioning:
   replaced with production-used
   `provisionFriendChallengeGuestIdentity` and focused order/failure
   short-circuit behavior tests in `friendChallengeClient.test.js`.
3. Countdown avoids server/client time drift:
   hydration-safe local countdown behavior moved unchanged with the view;
   local hook/state implementation assertions were not retained. The static
   build is green; live hydration inspection is delegated below.

## Behavior-first RED/GREEN evidence

RED:

```text
friendChallengeClient.test.js: module missing
matchmakingRescue.test.js: expected undefined to be type of function
Test Files 2 failed; Tests 1 failed, 28 passed
```

GREEN:

```text
friendChallengeClient.test.js: 2 passed
matchmakingRescue.test.js: 29 passed
Test Files 2 passed; Tests 31 passed
```

The friend-challenge tests assert that profile provisioning cannot start
before session establishment resolves and does not run after session failure.
The matchmaking test asserts not-ready, ready/consume, and already-handled
outcomes with a preserved unrelated query and hash.

## Story inventory

### Account page

- `composed-surfaces-account-identity-account-page--no-profile`
- `composed-surfaces-account-identity-account-page--guest-profile`
- `composed-surfaces-account-identity-account-page--claimed-profile`
- `composed-surfaces-account-identity-account-page--missing-credentials`
- `composed-surfaces-account-identity-account-page--email-submitting`
- `composed-surfaces-account-identity-account-page--mobile`

### Search and rescue

- `composed-surfaces-lobby-matchmaking-search-rescue--finding-table`
- `composed-surfaces-lobby-matchmaking-search-rescue--alert-rescue-available`
- `composed-surfaces-lobby-matchmaking-search-rescue--puffer-rescue-available`
- `composed-surfaces-lobby-matchmaking-search-rescue--match-found`
- `composed-surfaces-lobby-matchmaking-search-rescue--starting-puffer`

### Account entry

- `product-patterns-account-identity-account-entry--sign-in-or-guest`
- `product-patterns-account-identity-account-entry--save-guest-profile`
- `product-patterns-account-identity-account-entry--choose-online-identity`
- `product-patterns-account-identity-account-entry--choose-friend-identity`
- `product-patterns-account-identity-account-entry--missing-credentials`
- `product-patterns-account-identity-account-entry--email-submitting`

### Identity

- `product-patterns-account-identity-identity--suggested-identity`
- `product-patterns-account-identity-identity--existing-identity`
- `product-patterns-account-identity-identity--empty-name`
- `product-patterns-account-identity-identity--emoji-browser`
- `product-patterns-account-identity-identity--mobile`

### Friend challenge

- `composed-surfaces-lobby-matchmaking-friend-challenge--inviter`
- `composed-surfaces-lobby-matchmaking-friend-challenge--invitee`
- `composed-surfaces-lobby-matchmaking-friend-challenge--invitee-joining`
- `composed-surfaces-lobby-matchmaking-friend-challenge--expired`
- `composed-surfaces-lobby-matchmaking-friend-challenge--challenge-error`

Interaction plays use body-scoped queries and transition-safe `findBy*` or
`waitFor` gates. They cover all five search states, blank credential
validation, never-resolving email submission, and empty identity name.
No story calls `fetch`, `authClient`, challenge APIs, or auth providers.

## Verification

- Focused matchmaking/challenge/auth route run:
  6 files and 62 tests passed.
- Targeted Next lint:
  no warnings or errors.
- `CI=1 pnpm build-storybook`:
  exit 0; no provider/network errors.
- Story index:
  all 27 Task 6 story IDs present on the live local server.
- `git diff --check`:
  clean before staging.

## Live browser handoff

The Codex in-app Browser runtime was unavailable in this subtask
(`agent.browsers.list()` returned no available browsers after bootstrap
troubleshooting). Per coordinator direction, this did not block code closeout.
Parent/reviewer should run the listed interaction stories and inspect:

- desktop `1440x900`: all composed surfaces, with special attention to account
  form primitive alignment and the friend challenge two-column split;
- mobile `390x844`: account entry, identity `Mobile`, account page `Mobile`,
  search rescue height, and friend challenge stacking;
- no visible Storybook error state, hydration warning, or network request;
- `MissingCredentials` shows `Enter an email and password.`;
- `EmailSubmitting` remains on a disabled `Working...` button;
- search states expose only their named valid controls.

## Concerns

- Live desktop/mobile visual inspection is intentionally outstanding for the
  parent/reviewer because this subtask had no available browser backend.
- Storybook/Webpack emits the repository's existing bundle-size and stale
  Browserslist warnings; the build itself succeeds.
