---
name: catana-match-lifecycle
description: Use when changing Catana match creation, joining, leaving, recovery, alerts, active-match credentials, canonical game URLs, interrupted duels, finished or archived matches, replay entry, or ambiguous match/network outcomes.
---

# Catana Match Lifecycle

Keep app-owned lifecycle state subordinate to live server truth.

## Classify the Boundary

- **Deterministic game/server state:** moves, stages, turn ownership,
  `playerView` masking, and timers belong in `game-core` or the
  server-authoritative runtime. A Road Building stage error is this kind of
  defect; reproduce it with deterministic game/server tests.
- **App-owned lifecycle:** creation, join/leave, matchmaking recovery, alert
  pauses, credentials, active-match storage, bot handoff, and archived/final
  routing belong in app/server helpers around the engine.
- **Presentation:** dialogs, waiting states, recovery copy, and postgame/replay
  controls may be UI work, but cannot change authority or reveal hidden state.

## Read First

- `app/catana/lobby/useLobbyHomeActions.js`.
- `app/api/matches/create/handler.js`, `join/handler.js`, and `leave/handler.js`
  for mutations; `lib/server/matches/` for helpers and locks.
- `app/catana/matchAlerts/` and `lib/server/matchAlerts/`.
- `app/catana/lobby/[matchID]/MatchPageClient.js` and `app/g/[matchID]/`.
- `lib/server/replays/`, archive helpers, and `docs/agent/NOTES.md` for finished
  or archived matches.

## Authority and Identity Invariants

- The game server and Settlex-owned Postgres rows are authoritative. Browser
  local storage is a recovery hint, never proof of ownership or release.
- Prove the **account**, authenticated **`playerID`**, **credential**, and
  **`matchID`** separately. A stored credential does not prove the current
  account owns that seat. Keep `playerID` and credential paired; never retarget
  them merely because another seat is open.
- Do not make a human game visible or alert-eligible before its account/alert
  pause state is reserved.
- Preserve a filled human duel when late matchmaking Cancel loses the race:
  retain credentials and enter `/g/:matchID`.
- Start Puffer only through the server-owned bot path, never over an uncertain
  human seat.
- `/g/:matchID` is canonical. Redirect legacy replay links into this lifecycle;
  do not create a separate replay lifecycle. Archived replay must be read-only,
  derive participant perspective from proven account/seat identity, and hide
  future scores, logs, private state, and results until the replay cursor allows
  them.

## Ambiguous Mutation Procedure

For join, leave, alert click, recovery, or cleanup:

1. Distinguish definite rejection, such as a validated 4xx ownership failure,
   from timeout, network error, 5xx, or unavailable reconciliation. The latter
   are ambiguous: the mutation may have committed.
2. Keep local match state, credentials, and destructive UI actions blocked while
   fetching authoritative state. Clear them only after confirmed leave success
   or a live fetch proves the account no longer owns a seat.
3. Serialize competing operations for the same match with the existing
   transaction/advisory-lock boundary while allowing different matches to
   proceed independently.
4. Use a generation token or equivalent guard so stale polls, alerts, retries,
   and out-of-order responses cannot undo newer server-confirmed state.
5. Reconcile to the safe result: enter a valid filled match, retain an uncertain
   match and retry safely, or clear only a proven release. Make retries
   idempotent.

## Verification

Add focused executable regressions for changed lifecycle behavior:

- definite rejection versus each ambiguous outcome, including responses lost
  after the server commits;
- same-match serialization, different-match independence, and stale responses;
- account/`playerID`/credential/`matchID` proof and persistence or cleanup;
- late Cancel preserving a filled duel and interrupted-duel recovery;
- canonical archived replay, perspective, spoiler gating, and read-only actions.

Use real Postgres tests when lock behavior depends on database semantics. Keep
manual/browser checks for visible recovery states, alert clicks, and replay UI.
