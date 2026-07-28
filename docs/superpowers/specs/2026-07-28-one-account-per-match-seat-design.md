# One Account Per Match Seat

Date: 2026-07-28
Status: Approved in conversation; pending implementation plan

## Problem

Public matchmaking currently treats any public duel with one occupied seat and
one open seat as joinable. The open-match list and homepage selection do not
exclude a match already occupied by the current account.

The public join route authenticates the account and serializes mutations for a
match, but it only verifies the match kind before forwarding the join to
boardgame.io. The boardgame.io lobby join checks that the requested seat is
open; it does not reject an account already present in another seat.

As a result, two tabs sharing one account can put that account into both human
seats of the same match. Per-seat credentials make controlling both seats
possible even though the canonical game route may initially select only one.

## Objective

Enforce this invariant:

> One authenticated Settlex account may own at most one human seat in a match.

The invariant is per match. The same account may participate in separate
matches. Bot participants do not count as human account ownership and existing
bot setup must remain unchanged.

## Server Boundary

The public match join route remains the final authority for public human seat
entry. Inside the existing `withMatchMutationLock({ matchID, run })` callback,
after loading the live match and validating its kind but before reserving match
alerts or calling boardgame.io, it will inspect the occupied seats.

If an occupied human seat already has
`player.data.accountId === sessionAccount.account.id`, the route returns:

```json
{
  "error": "You are already seated in this match.",
  "code": "ACCOUNT_ALREADY_SEATED"
}
```

with HTTP status `409`.

The rejection does not:

- reserve, finalize, or restore match-alert state;
- call the boardgame.io join endpoint;
- create or overwrite seat credentials;
- change either seat; or
- prevent the account from joining a different match.

The check applies only when `participantType` is `human`. Server-owned bot
setup and the explicit bot-fill path continue to join bot seats.

Friend challenges already reject the inviter account in the accept route with
`403 You cannot accept your own challenge.` That existing protection remains
in place and receives a focused regression assertion as part of the full
human-entry invariant; the fix does not broaden challenge lifecycle behavior.

## Helper Boundary

The account-seat inspection should be a small server helper under
`lib/server/matches/`. It accepts a live match and account ID, considers only
occupied human participants, and returns the matching seat or `null`.
For this guard, occupancy is a truthy live `player.name`; retained
`data.usernameSnapshot`, `data.accountId`, and other snapshot metadata alone
do not keep a vacated seat occupied.

Keeping the metadata interpretation in one helper makes the invariant
executable without coupling it to `NextResponse`, alert reservation, or
boardgame.io transport. The public join handler owns the HTTP response and
ordering within the match lock.

## Client Behaviour

No client-side filtering is treated as security. A second tab may still select
the account's existing open match from the public list, but the server rejects
the attempted second-seat join deterministically and the existing request
error path displays the server message.

Automatic seat recovery or cross-tab navigation is outside this fix. It can be
added later without weakening the server invariant.

## Concurrency

The live-match read and ownership rejection stay inside the current
per-match PostgreSQL advisory lock. Two concurrent human joins by the same
account therefore serialize:

1. the first join may occupy one seat;
2. the second locked read observes that occupied account seat; and
3. the second join is rejected before any alert or boardgame.io mutation.

Different matches retain independent locks and remain unaffected.

## Verification

Test-first regressions will prove:

- a public human join is rejected with `409 ACCOUNT_ALREADY_SEATED` when the
  authenticated account owns another occupied human seat;
- rejection happens inside the match lock and before alert reservation or the
  boardgame.io join call;
- a different authenticated account can still join the open seat;
- a bot participant can still fill an open seat when the requesting account
  owns the human seat;
- matching usernames with different account IDs are allowed;
- the helper ignores empty seats (including retained human snapshot metadata)
  and bot participants;
- the existing friend-challenge self-accept rejection remains intact; and
- account ownership in one match does not affect joins to another match.

Focused route/helper tests, the relevant matchmaking lifecycle tests, lint on
the changed files, and `git diff --check` are sufficient verification for this
narrow server lifecycle fix. No production deploy is part of this work.

## Acceptance Criteria

- One account cannot occupy two human seats in the same match through public
  matchmaking or direct public-seat entry.
- The server, not browser state, enforces the invariant.
- The rejection is deterministic, clear, and mutation-free.
- Legitimate different-account joins, bot fills, and separate matches keep
  their current behaviour.
- Friend-challenge self-accept protection remains covered.
