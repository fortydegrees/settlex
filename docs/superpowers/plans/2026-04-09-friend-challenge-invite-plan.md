# Friend Challenge Invite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private `Play a Friend` challenge flow with a distinct `/challenge/:matchID` URL, modal-based inviter waiting on the home page, 5-minute expiry/cancelation, auto-join for invitees who already have an account, and randomized seat assignment without changing Catana game rules.

**Architecture:** Keep the backing object as a normal 2-player bgio match but tag it in app-owned setup metadata as a `friend_challenge`. Add app-owned challenge create/resolve/accept/cancel routes plus a dedicated `/challenge/:matchID` page, move public lobby reads behind a filtered app route so private challenges never appear in matchmaking/open-games/room-code joins, and extract shared guest-identity UI/storage so the challenge page and lobby do not duplicate account bootstrap logic.

**Tech Stack:** Next.js App Router, React client components, Settlex app API routes, boardgame.io lobby/server endpoints, Vitest, pnpm.

---

## File Structure

### Match Helpers

- Create: `lib/server/matches/getLiveMatch.js`
  - Single live-match metadata fetch helper for app-owned routes.
- Create: `lib/server/matches/friendChallenge.js`
  - Pure helpers/constants for friend-challenge setup metadata, expiry checks, open-seat resolution, and public/private filtering.
- Create: `lib/server/matches/listPublicOpenMatches.js`
  - Fetch `/games/catan`, normalize, and filter out private friend challenges/full matches.
- Modify: `lib/server/matches/createMatchForAccount.js`
  - Add optional creator seat support while preserving current default behavior.

### App Routes

- Create: `app/api/matches/open/handler.js`
- Create: `app/api/matches/open/route.js`
  - App-owned filtered public match list for lobby refresh and public matchmaking.
- Modify: `app/api/matches/join/handler.js`
  - Reject `friend_challenge` matches in the public join path.
- Create: `app/api/challenges/create/handler.js`
- Create: `app/api/challenges/create/route.js`
  - Create a private friend challenge and return `{ matchID, playerID, playerCredentials, challengeUrl, expiresAt }`.
- Create: `app/api/challenges/[matchID]/handler.js`
- Create: `app/api/challenges/[matchID]/route.js`
  - Resolve pending/expired state for challenge pages and inviter modal polling.
- Create: `app/api/challenges/[matchID]/accept/handler.js`
- Create: `app/api/challenges/[matchID]/accept/route.js`
  - Accept a valid challenge using the current session account.
- Create: `app/api/challenges/[matchID]/cancel/handler.js`
- Create: `app/api/challenges/[matchID]/cancel/route.js`
  - Cancel/expire the challenge by removing the inviter seat when appropriate.

### Shared UI / Client Flows

- Create: `app/catana/lobby/playerIdentityStorage.js`
  - Shared localStorage keys, read/write helpers, and suggested guest-identity generation.
- Create: `app/catana/lobby/IdentityModal.js`
  - Extract the existing reusable guest identity picker from `LobbyPageClient.js`.
- Create: `app/catana/lobby/FriendChallengeModal.js`
  - Home-page modal for copy/share/wait/cancel/expire states.
- Modify: `app/catana/lobby/LobbyPageClient.js`
  - Add `Play a Friend`, switch public list reads to `/api/matches/open`, manage invite modal polling and cancelation, and route accepted invites into `/g/:matchID`.
- Create: `app/challenge/[matchID]/page.js`
- Create: `app/challenge/[matchID]/page-content.js`
- Create: `app/challenge/[matchID]/ChallengePageClient.js`
  - Challenge acceptance UI: resolve status, auto-join existing accounts, or show the extracted identity modal for first-time invitees.

### Tests

- Modify: `lib/server/__tests__/matchBootstrap.test.js`
- Create: `lib/server/__tests__/friendChallenge.test.js`
- Create: `lib/server/__tests__/listPublicOpenMatches.test.js`
- Create: `app/__tests__/api/challengeRoutes.test.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`
- Create: `app/__tests__/challengePage.test.js`
- Create: `app/__tests__/challengePageClient.source.test.js`
- Create: `app/catana/__tests__/playerIdentityStorage.test.js`
- Create: `app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

---

### Task 1: Add Friend-Challenge Metadata Helpers And Random Creator Seat Support

**Files:**
- Create: `lib/server/matches/friendChallenge.js`
- Modify: `lib/server/matches/createMatchForAccount.js`
- Test: `lib/server/__tests__/friendChallenge.test.js`
- Test: `lib/server/__tests__/matchBootstrap.test.js`

- [ ] **Step 1: Write the failing helper/bootstrap tests**

```js
expect(buildFriendChallengeSetupData({ inviterSeatId: "1" })).toMatchObject({
  matchKind: "friend_challenge",
  friendChallenge: {
    inviterSeatId: "1",
  },
});

expect(result.playerID).toBe("1");
expect(JSON.parse(joinRequest[1].body)).toMatchObject({
  playerID: "1",
});
```

- [ ] **Step 2: Run the focused helper/bootstrap tests and confirm they fail**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js lib/server/__tests__/friendChallenge.test.js
```

Expected:
- FAIL because `friendChallenge.js` does not exist yet.
- FAIL because `createMatchForAccount` always joins seat `0`.

- [ ] **Step 3: Implement the pure friend-challenge helpers and creator-seat option**

```js
export const FRIEND_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const buildFriendChallengeSetupData = ({ inviterSeatId, nowIso, expiresAtIso }) => ({
  matchKind: "friend_challenge",
  friendChallenge: {
    inviterSeatId,
    createdAt: nowIso,
    expiresAt: expiresAtIso,
  },
});
```

Implementation notes:
- Keep these helpers pure and app-owned; the Catana engine should ignore them.
- `createMatchForAccount` should accept an optional `creatorSeatId` (default `"0"`), pass through `setupData`, and return the chosen seat id in the wrapper result.

- [ ] **Step 4: Re-run the focused tests and confirm they pass**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js lib/server/__tests__/friendChallenge.test.js
```

Expected:
- PASS with explicit creator-seat coverage and metadata helper coverage.

- [ ] **Step 5: Commit the helper/bootstrap slice**

```bash
git add lib/server/matches/friendChallenge.js lib/server/matches/createMatchForAccount.js lib/server/__tests__/friendChallenge.test.js lib/server/__tests__/matchBootstrap.test.js
git commit -m "feat: add friend challenge metadata helpers"
```

---

### Task 2: Move Public Lobby Reads Behind App-Owned Filtering And Block Public Joins Into Private Challenges

**Files:**
- Create: `lib/server/matches/getLiveMatch.js`
- Create: `lib/server/matches/listPublicOpenMatches.js`
- Create: `lib/server/__tests__/listPublicOpenMatches.test.js`
- Create: `app/api/matches/open/handler.js`
- Create: `app/api/matches/open/route.js`
- Modify: `app/api/matches/join/handler.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`

- [ ] **Step 1: Write failing tests for filtered public reads and public join rejection**

```js
expect(publicMatches).toEqual([
  expect.objectContaining({ matchID: "public_1" }),
]);

expect(json.error).toContain("private");
expect(joinMatchForAccount).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the public-read/public-join tests and confirm they fail**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/listPublicOpenMatches.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js
```

Expected:
- FAIL because no `/api/matches/open` route exists.
- FAIL because the public join handler does not inspect friend-challenge metadata.

- [ ] **Step 3: Implement `getLiveMatch`, filtered public reads, and join blocking**

```js
if (isFriendChallengeMatch(liveMatch)) {
  return NextResponse.json(
    { error: "Private friend challenges must be joined through their challenge link." },
    { status: 403 }
  );
}
```

Implementation notes:
- `listPublicOpenMatches` should read the live bgio list and filter out:
  - `friend_challenge` matches
  - full matches
- `app/api/matches/open` becomes the only list/read used by `LobbyPageClient` for public lobby behavior.
- Public `/api/matches/join` should reject private challenge matches before proxying the join.

- [ ] **Step 4: Re-run the focused tests and confirm they pass**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/listPublicOpenMatches.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js
```

Expected:
- PASS with route export coverage and friend-challenge rejection coverage.

- [ ] **Step 5: Commit the filtered-public-lobby slice**

```bash
git add lib/server/matches/getLiveMatch.js lib/server/matches/listPublicOpenMatches.js lib/server/__tests__/listPublicOpenMatches.test.js app/api/matches/open/handler.js app/api/matches/open/route.js app/api/matches/join/handler.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js
git commit -m "feat: filter private challenges from public match reads"
```

---

### Task 3: Extract Shared Guest-Identity Storage And Modal UI

**Files:**
- Create: `app/catana/lobby/playerIdentityStorage.js`
- Create: `app/catana/lobby/IdentityModal.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Test: `app/catana/__tests__/playerIdentityStorage.test.js`
- Test: `app/catana/__tests__/LobbyPageClient.identity.test.js`

- [ ] **Step 1: Write the failing identity-storage test**

```js
expect(buildSuggestedGuestIdentity({ randomInt: () => 4821 })).toMatchObject({
  name: "Guest 4821",
});
expect(result.color).toBeDefined();
expect(result.emoji).toBeDefined();
```

- [ ] **Step 2: Run the shared-identity tests and confirm the new helper coverage fails**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerIdentityStorage.test.js app/catana/__tests__/LobbyPageClient.identity.test.js
```

Expected:
- FAIL because `playerIdentityStorage.js` does not exist yet.

- [ ] **Step 3: Extract the storage/default-generation helper and reusable modal**

```js
export const buildSuggestedGuestIdentity = ({ randomInt }) => ({
  name: `Guest ${randomInt(1000, 9999)}`,
  emoji: pickRandomEmoji(),
  color: pickRandomColor(),
});
```

Implementation notes:
- Move the existing `IdentityModal`/`EmojiPicker` out of `LobbyPageClient.js`.
- Keep all current Catana classes/copy unless the new challenge flow requires an explicit prop override.
- `LobbyPageClient.js` should import the extracted modal and shared storage constants instead of keeping its own duplicate storage key strings.

- [ ] **Step 4: Re-run the shared-identity tests and confirm they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerIdentityStorage.test.js app/catana/__tests__/LobbyPageClient.identity.test.js
```

Expected:
- PASS with generated-default coverage and unchanged identity-modal source contract coverage.

- [ ] **Step 5: Commit the shared-identity slice**

```bash
git add app/catana/lobby/playerIdentityStorage.js app/catana/lobby/IdentityModal.js app/catana/lobby/LobbyPageClient.js app/catana/__tests__/playerIdentityStorage.test.js app/catana/__tests__/LobbyPageClient.identity.test.js
git commit -m "refactor: share lobby guest identity helpers"
```

---

### Task 4: Add Challenge Create / Resolve / Accept / Cancel Routes And The `/challenge/:matchID` Page

**Files:**
- Create: `app/api/challenges/create/handler.js`
- Create: `app/api/challenges/create/route.js`
- Create: `app/api/challenges/[matchID]/handler.js`
- Create: `app/api/challenges/[matchID]/route.js`
- Create: `app/api/challenges/[matchID]/accept/handler.js`
- Create: `app/api/challenges/[matchID]/accept/route.js`
- Create: `app/api/challenges/[matchID]/cancel/handler.js`
- Create: `app/api/challenges/[matchID]/cancel/route.js`
- Create: `app/challenge/[matchID]/page.js`
- Create: `app/challenge/[matchID]/page-content.js`
- Create: `app/challenge/[matchID]/ChallengePageClient.js`
- Test: `app/__tests__/api/challengeRoutes.test.js`
- Test: `app/__tests__/challengePage.test.js`
- Test: `app/__tests__/challengePageClient.source.test.js`
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`

- [ ] **Step 1: Write the failing challenge API/page tests**

```js
expect(json).toMatchObject({
  matchID: "match_1",
  challengeUrl: "/challenge/match_1",
});

expect(html).toContain("ChallengePageClient");
expect(source).toContain('route: "/api/account/me"');
expect(source).toContain('route: `/api/challenges/${matchID}`');
expect(source).toContain('route: `/api/challenges/${matchID}/accept`');
```

- [ ] **Step 2: Run the challenge-route/page tests and confirm they fail**

Run:
```bash
pnpm exec vitest run app/__tests__/api/challengeRoutes.test.js app/__tests__/challengePage.test.js app/__tests__/challengePageClient.source.test.js app/__tests__/api/routeModuleExports.source.test.js
```

Expected:
- FAIL because the challenge routes and `/challenge/[matchID]` page do not exist yet.

- [ ] **Step 3: Implement the app-owned challenge routes**

```js
return {
  status: "pending",
  matchID,
  inviterSeatId: "1",
  inviteeSeatId: "0",
  expiresAt,
};
```

Implementation notes:
- `POST /api/challenges/create`
  - require current session account
  - choose inviter seat randomly (`"0"` or `"1"`)
  - create the match with `setupData.matchKind = "friend_challenge"`
  - join inviter at that seat
  - return challenge URL + expiry
- `GET /api/challenges/[matchID]`
  - fetch live match metadata
  - validate friend-challenge status
  - return `pending` or `expired`
- `POST /api/challenges/[matchID]/accept`
  - require current session account
  - fetch/validate challenge
  - join the single open invitee seat
- `POST /api/challenges/[matchID]/cancel`
  - require current session account
  - verify the caller matches the inviter account
  - leave the inviter seat so the challenge becomes invalid

- [ ] **Step 4: Implement the challenge page and client bootstrap**

```js
useEffect(() => {
  // 1. resolve challenge
  // 2. if expired -> show expired card
  // 3. if account exists -> accept immediately
  // 4. else show IdentityModal with generated defaults
}, [matchID]);
```

Implementation notes:
- The page wrapper should stay thin (`page.js` -> `page-content.js`) to match current Next routing patterns.
- `ChallengePageClient` should:
  - fetch `/api/challenges/:matchID`
  - fetch `/api/account/me`
  - auto-accept existing accounts
  - otherwise show the extracted `IdentityModal`
  - on successful guest creation, call accept
  - persist seat credentials and `lastActiveMatch`, then route to `/g/:matchID?playerID=...`

- [ ] **Step 5: Re-run the challenge-route/page tests and confirm they pass**

Run:
```bash
pnpm exec vitest run app/__tests__/api/challengeRoutes.test.js app/__tests__/challengePage.test.js app/__tests__/challengePageClient.source.test.js app/__tests__/api/routeModuleExports.source.test.js
```

Expected:
- PASS with create/resolve/accept/cancel route coverage and challenge-page contract coverage.

- [ ] **Step 6: Commit the challenge-route/page slice**

```bash
git add app/api/challenges/create/handler.js app/api/challenges/create/route.js app/api/challenges/[matchID]/handler.js app/api/challenges/[matchID]/route.js app/api/challenges/[matchID]/accept/handler.js app/api/challenges/[matchID]/accept/route.js app/api/challenges/[matchID]/cancel/handler.js app/api/challenges/[matchID]/cancel/route.js app/challenge/[matchID]/page.js app/challenge/[matchID]/page-content.js app/challenge/[matchID]/ChallengePageClient.js app/__tests__/api/challengeRoutes.test.js app/__tests__/challengePage.test.js app/__tests__/challengePageClient.source.test.js app/__tests__/api/routeModuleExports.source.test.js
git commit -m "feat: add friend challenge routes and page"
```

---

### Task 5: Add The `Play a Friend` Home-Page Flow And Waiting Modal

**Files:**
- Create: `app/catana/lobby/FriendChallengeModal.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Test: `app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
- Test: `app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js`
- Test: `app/catana/__tests__/LobbyPageClient.playVsBot.test.js`

- [ ] **Step 1: Write the failing lobby source-contract tests**

```js
expect(source).toContain("Play a Friend");
expect(source).toContain('route: "/api/challenges/create"');
expect(source).toContain("Waiting for friend to join");
expect(source).toContain("Close & cancel invite");
expect(source).toContain('route: "/api/matches/open"');
expect(source).toContain('route: `/api/challenges/${challengeState.matchID}/cancel`');
```

- [ ] **Step 2: Run the lobby-focused tests and confirm they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js
```

Expected:
- FAIL because `Play a Friend`, the friend-challenge modal, and `/api/matches/open` reads do not exist yet.

- [ ] **Step 3: Implement the lobby friend-challenge flow**

```js
const createFriendChallenge = async () => {
  const created = await appRequest({ route: "/api/challenges/create", init: { method: "POST" } });
  setChallengeState({ ...created, phase: "waiting" });
};
```

Implementation notes:
- Add `Play a Friend` between `Play` and `Play Against Bot`.
- Switch `refreshMatches()` and public matchmaking reads from direct bgio lobby reads to `/api/matches/open`.
- Show `FriendChallengeModal` after challenge creation.
- Poll `GET /api/challenges/:matchID` while the modal is open:
  - if still pending, keep waiting
  - if accepted, route inviter to `/g/:matchID?playerID=...`
  - if expired, show expired state/copy
- On close, call cancel and clear local state.
- On timeout, call cancel and clear local state.

- [ ] **Step 4: Re-run the lobby-focused tests and confirm they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js
```

Expected:
- PASS with the new button/API/modal contracts and no regression in existing play/matchmaking/bot entrypoints.

- [ ] **Step 5: Commit the lobby friend-challenge slice**

```bash
git add app/catana/lobby/FriendChallengeModal.js app/catana/lobby/LobbyPageClient.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js
git commit -m "feat: add play a friend lobby flow"
```

---

### Task 6: Finish Route Contracts, Update Agent Docs, And Run Full Verification

**Files:**
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Update route/page contract coverage for the new challenge modules**

```js
["app", "api", "challenges", "create", "route.js"],
["app", "api", "challenges", "[matchID]", "route.js"],
["app", "api", "challenges", "[matchID]", "accept", "route.js"],
["app", "api", "challenges", "[matchID]", "cancel", "route.js"],
["app", "challenge", "[matchID]", "page.js"],
```

- [ ] **Step 2: Record the implemented behavior in agent docs**

Implementation notes:
- `docs/agent/PROGRESS.md` should capture the shipped user-facing behavior and focused verification commands.
- `docs/agent/NOTES.md` should capture the long-lived guardrails:
  - friend challenges are private
  - challenge URL is distinct from `/g/:matchID`
  - inviter seat is randomized instead of engine turn order changing
  - canceled/expired/claimed links all collapse to the same expired state

- [ ] **Step 3: Run the full targeted verification suite**

Run:
```bash
pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js lib/server/__tests__/friendChallenge.test.js lib/server/__tests__/listPublicOpenMatches.test.js app/__tests__/api/challengeRoutes.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js app/__tests__/challengePage.test.js app/__tests__/challengePageClient.source.test.js app/catana/__tests__/playerIdentityStorage.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js
```

Expected:
- PASS with 0 failed tests.

- [ ] **Step 4: Run repo-wide verification**

Run:
```bash
pnpm verify
```

Expected:
- PASS with the standard project verification command succeeding.

- [ ] **Step 5: Commit the docs/contracts/verification slice**

```bash
git add app/__tests__/api/routeModuleExports.source.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record friend challenge invite flow"
```
