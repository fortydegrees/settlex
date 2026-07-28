# One Account Per Match Seat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent one authenticated Settlex account from occupying more than one human seat in the same match.

**Architecture:** Add a pure server helper that identifies an occupied human seat owned by an account. Invoke it inside the public join route's existing per-match advisory lock, after match-kind validation and before alert reservation or boardgame.io mutation, returning a deterministic `409 ACCOUNT_ALREADY_SEATED` response.

**Tech Stack:** Next.js 13 app router, JavaScript, PostgreSQL advisory locks, boardgame.io 0.50, Vitest 1.6, and ESLint.

## Global Constraints

- The invariant is exactly one human seat per authenticated account per match.
- The same account may participate in different matches.
- Bot participants do not count as human account ownership.
- Browser storage and client-side filtering are not security boundaries.
- Reject duplicate-account human joins with HTTP `409`, code `ACCOUNT_ALREADY_SEATED`, and message `You are already seated in this match.`
- Reject before match-alert reservation, boardgame.io join, or credential writes.
- Keep the live-match read and rejection inside `withMatchMutationLock({ matchID, run })`.
- Preserve the existing friend-challenge self-accept rejection.
- Add no dependencies and make no build-tool changes.
- Update `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md`.
- Do not push or deploy.

---

### Task 1: Add the account-to-human-seat ownership helper

**Files:**
- Create: `lib/server/matches/humanSeatOwnership.js`
- Create: `lib/server/__tests__/humanSeatOwnership.test.js`

**Interfaces:**
- Produces: `findHumanSeatForAccount({ match, accountId }) -> object | null`
- A matching seat must have a truthy live `name`, have
  `data.participantType === "human"`, and have `data.accountId === accountId`.
  Retained `data.usernameSnapshot` or account data alone is not occupancy.

- [ ] **Step 1: Write the failing helper tests**

Create `lib/server/__tests__/humanSeatOwnership.test.js`:

```js
import { describe, expect, it } from "vitest";
import { findHumanSeatForAccount } from "../matches/humanSeatOwnership.js";

describe("findHumanSeatForAccount", () => {
  it("returns the occupied human seat owned by the account", () => {
    const seat = findHumanSeatForAccount({
      match: {
        players: {
          0: {
            id: 0,
            name: "Ada",
            data: {
              participantType: "human",
              accountId: "acct_1",
            },
          },
          1: { id: 1, name: "" },
        },
      },
      accountId: "acct_1",
    });

    expect(seat).toMatchObject({ id: 0, name: "Ada" });
  });

  it("ignores empty seats and bot participants", () => {
    const match = {
      players: [
        {
          id: 0,
          name: "",
          data: {
            participantType: "human",
            accountId: "acct_1",
            usernameSnapshot: "Ada",
          },
        },
        {
          id: 1,
          name: "Puffer",
          data: {
            participantType: "bot",
            accountId: "acct_1",
          },
        },
      ],
    };

    expect(
      findHumanSeatForAccount({ match, accountId: "acct_1" })
    ).toBeNull();
  });

  it("uses account identity rather than display name", () => {
    const match = {
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: {
            participantType: "human",
            accountId: "acct_1",
          },
        },
        1: { id: 1, name: "" },
      },
    };

    expect(
      findHumanSeatForAccount({ match, accountId: "acct_2" })
    ).toBeNull();
  });

  it("has no ownership state outside the supplied match", () => {
    const occupiedMatch = {
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: {
            participantType: "human",
            accountId: "acct_1",
          },
        },
      },
    };
    const differentMatch = {
      players: {
        0: {
          id: 0,
          name: "Bert",
          data: {
            participantType: "human",
            accountId: "acct_2",
          },
        },
      },
    };

    expect(
      findHumanSeatForAccount({
        match: occupiedMatch,
        accountId: "acct_1",
      })
    ).toMatchObject({ id: 0 });
    expect(
      findHumanSeatForAccount({
        match: differentMatch,
        accountId: "acct_1",
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the helper test and verify the red state**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/humanSeatOwnership.test.js --reporter=dot
```

Expected: FAIL because `lib/server/matches/humanSeatOwnership.js` does not
exist.

- [ ] **Step 3: Implement the minimal helper**

Create `lib/server/matches/humanSeatOwnership.js`:

```js
const playersOf = (match) => {
  const players = match?.players;
  return (Array.isArray(players) ? players : Object.values(players ?? {}))
    .filter(Boolean);
};

const isOccupied = (player) => Boolean(player?.name);

export function findHumanSeatForAccount({ match, accountId } = {}) {
  if (!accountId) return null;

  return (
    playersOf(match).find(
      (player) =>
        isOccupied(player) &&
        player?.data?.participantType === "human" &&
        player?.data?.accountId === accountId
    ) ?? null
  );
}
```

- [ ] **Step 4: Run the helper test and verify the green state**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/humanSeatOwnership.test.js --reporter=dot
```

Expected: PASS with four tests.

- [ ] **Step 5: Commit the helper**

```bash
git add lib/server/matches/humanSeatOwnership.js lib/server/__tests__/humanSeatOwnership.test.js
git commit -m "test: define human seat ownership"
```

---

### Task 2: Enforce account ownership in the locked public join route

**Files:**
- Modify: `app/api/matches/join/handler.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Modify: `app/__tests__/api/challengeRoutes.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: `findHumanSeatForAccount({ match, accountId }) -> object | null`
- Produces: public join rejection `{ error: "You are already seated in this match.", code: "ACCOUNT_ALREADY_SEATED" }` with HTTP `409`.

- [ ] **Step 1: Write the failing public-route regression**

Add this test to `app/__tests__/api/matchRoutes.test.js`:

```js
it("rejects a second human seat for the same account inside the match lock", async () => {
  const { createMatchJoinRoute } = await loadRoute("join", "handler.js");
  const order = [];
  const reserveAlertsBeforeHumanJoin = vi.fn(async () => {
    order.push("reserve");
    return null;
  });
  const joinMatchForAccount = vi.fn(async () => {
    order.push("join");
    return {
      playerID: "1",
      playerCredentials: "second_secret",
    };
  });
  const withMatchMutationLock = vi.fn(async ({ run }) => {
    order.push("lock:start");
    const result = await run();
    order.push("lock:end");
    return result;
  });
  const JOIN = createMatchJoinRoute({
    getSessionAccount: vi.fn().mockResolvedValue({
      account: {
        id: "acct_1",
        currentUsername: "Ada",
      },
    }),
    getLiveMatch: vi.fn(async () => {
      order.push("read");
      return {
        matchID: "match_1",
        players: {
          0: {
            id: 0,
            name: "Ada",
            data: {
              participantType: "human",
              accountId: "acct_1",
            },
          },
          1: { id: 1, name: "" },
        },
      };
    }),
    reserveAlertsBeforeHumanJoin,
    joinMatchForAccount,
    withMatchMutationLock,
  });

  const response = await JOIN(
    new Request("http://localhost/api/matches/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: "settlehex_session=a.b",
      },
      body: JSON.stringify({
        matchID: "match_1",
        playerID: "1",
      }),
    })
  );

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({
    error: "You are already seated in this match.",
    code: "ACCOUNT_ALREADY_SEATED",
  });
  expect(order).toEqual(["lock:start", "read", "lock:end"]);
  expect(reserveAlertsBeforeHumanJoin).not.toHaveBeenCalled();
  expect(joinMatchForAccount).not.toHaveBeenCalled();
  expect(withMatchMutationLock).toHaveBeenCalledWith({
    matchID: "match_1",
    run: expect.any(Function),
  });
});
```

- [ ] **Step 2: Run the public-route regression and verify the red state**

Run:

```bash
pnpm exec vitest run app/__tests__/api/matchRoutes.test.js -t "rejects a second human seat" --reporter=dot
```

Expected: FAIL because the route returns `200` and calls alert/join
dependencies instead of returning `409`.

- [ ] **Step 3: Add the locked route guard**

Add this import to `app/api/matches/join/handler.js`:

```js
import { findHumanSeatForAccount } from "../../../../lib/server/matches/humanSeatOwnership.js";
```

Inside the `withMatchMutationLock` callback, immediately after the friend and
bot match-kind checks and before `reserveAlertsBeforeHumanJoinImpl`, add:

```js
if (
  participantType === "human" &&
  findHumanSeatForAccount({
    match: liveMatch,
    accountId: sessionAccount.account.id,
  })
) {
  return {
    response: NextResponse.json(
      {
        error: "You are already seated in this match.",
        code: "ACCOUNT_ALREADY_SEATED",
      },
      { status: 409 }
    ),
  };
}
```

- [ ] **Step 4: Run the helper and match-route suites and verify green**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/humanSeatOwnership.test.js app/__tests__/api/matchRoutes.test.js --reporter=dot
```

Expected: PASS. The existing bot-participant route case in
`matchRoutes.test.js` must remain green with the requesting account already in
the human seat.

- [ ] **Step 5: Add the existing friend-challenge invariant regression**

Add this test to `app/__tests__/api/challengeRoutes.test.js`:

```js
it("rejects the inviter accepting their own friend challenge", async () => {
  const { createChallengeAcceptRoute } = await loadRoute(
    "[matchID]",
    "accept",
    "handler.js"
  );
  const reserveAlertsBeforeHumanJoin = vi.fn();
  const joinMatchForAccount = vi.fn();
  const ACCEPT = createChallengeAcceptRoute({
    getSessionAccount: vi.fn().mockResolvedValue({
      account: {
        id: "acct_inviter",
        currentUsername: "Ada",
      },
    }),
    getLiveMatch: vi.fn().mockResolvedValue({
      matchID: "match_1",
      metadata: {
        setupData: {
          matchKind: "friend_challenge",
          friendChallenge: {
            inviterAccountId: "acct_inviter",
            inviterSeatId: "1",
            createdAt: "2026-07-28T10:00:00.000Z",
            expiresAt: "2026-07-28T10:05:00.000Z",
          },
        },
      },
      players: {
        0: { id: 0, name: "" },
        1: {
          id: 1,
          name: "Ada",
          data: {
            participantType: "human",
            accountId: "acct_inviter",
          },
        },
      },
    }),
    reserveAlertsBeforeHumanJoin,
    joinMatchForAccount,
    now: () => new Date("2026-07-28T10:02:00.000Z"),
  });

  const response = await ACCEPT(
    new Request("http://localhost/api/challenges/match_1/accept", {
      method: "POST",
      headers: {
        cookie: "settlehex_session=a.b",
      },
    }),
    { params: { matchID: "match_1" } }
  );

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: "You cannot accept your own challenge.",
  });
  expect(reserveAlertsBeforeHumanJoin).not.toHaveBeenCalled();
  expect(joinMatchForAccount).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Update the durable project notes**

Add this status block immediately below `# PROGRESS` in
`docs/agent/PROGRESS.md`:

```markdown
## Status (2026-07-28, one account per match seat)
- Added a server-authoritative public-join guard so one authenticated account
  cannot occupy both human seats in the same match.
- Kept the live ownership read and rejection inside the existing per-match
  advisory lock and before alert reservation, boardgame.io join, or credential
  writes.
- Preserved different-account joins, bot fills, separate matches, and the
  existing friend-challenge self-accept rejection.
- Focused helper, match-route, challenge-route, and matchmaking lifecycle tests
  passed with changed-file lint and whitespace checks.
```

Add this note immediately below `# NOTES` in `docs/agent/NOTES.md`:

```markdown
- Match seat ownership boundary (2026-07-28):
- One authenticated account may own at most one occupied human seat per match.
  Enforce this from live match metadata inside the app-owned per-match mutation
  lock, before alert reservation or boardgame.io mutation.
- Account ownership is per match and keyed by `data.accountId`, not username.
  Bot participants do not count, and browser storage or public-list filtering
  must never be treated as the enforcement boundary.
- Duplicate-account human joins return `409 ACCOUNT_ALREADY_SEATED` without
  changing seats, credentials, or alert state.
```

- [ ] **Step 7: Run the complete focused verification**

Run:

```bash
pnpm exec vitest run \
  lib/server/__tests__/humanSeatOwnership.test.js \
  app/__tests__/api/matchRoutes.test.js \
  app/__tests__/api/challengeRoutes.test.js \
  app/catana/matchmaking/__tests__/matchmakingRescue.test.js \
  app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js \
  --reporter=dot
```

Expected: all focused tests PASS.

Run:

```bash
pnpm exec eslint \
  lib/server/matches/humanSeatOwnership.js \
  lib/server/__tests__/humanSeatOwnership.test.js \
  app/api/matches/join/handler.js \
  app/__tests__/api/matchRoutes.test.js \
  app/__tests__/api/challengeRoutes.test.js
```

Expected: exit `0` with no lint errors.

Run:

```bash
git diff --check
```

Expected: exit `0` with no whitespace errors.

- [ ] **Step 8: Commit the route fix and documentation**

```bash
git add \
  app/api/matches/join/handler.js \
  app/__tests__/api/matchRoutes.test.js \
  app/__tests__/api/challengeRoutes.test.js \
  docs/agent/PROGRESS.md \
  docs/agent/NOTES.md
git commit -m "fix: prevent duplicate account match seats"
```
