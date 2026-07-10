# Engine Transaction Hardening Design

**Date:** 2026-07-10

**Status:** Approved direction; implementation pending

## Goal

Make the existing SettleX game engine safer against malformed or partially
valid moves without replacing its current mutable-state architecture.

For every hardened rule operation, the contract is:

- a successful result applies the complete move;
- a rejected result leaves the match state unchanged;
- finite-bank resource cards are neither created nor lost;
- normal valid gameplay behaves exactly as it does today.

## Why this is a focused change

The engine already validates most moves before mutation. This pass addresses a
small number of helpers where validation and mutation are interleaved or where
the contract is only safe because every current caller performs an earlier
check.

This is not an immutable-engine rewrite, a generic transaction framework, or a
change to the public game-state shape. It uses small temporary arrays or shallow
state overlays only where an operation needs to prove its complete result
before committing.

## Chosen approach: validate, stage, commit

Each affected operation will follow three explicit steps:

1. Validate the actor, requested inputs, resource availability, piece
   availability and board legality.
2. Calculate the complete result against temporary data.
3. Commit the staged result to the real state only after all validation passes.

This keeps the current in-place engine API and avoids cloning the entire match
state for every move.

## Engine changes

### Atomic resource spending

`spendResources` will preflight the complete cost against the player's hand.
It will not remove any cards or add anything to the bank until the whole cost
is available.

This protects current build and development-card purchase callers and makes the
helper safe for future direct use.

### Atomic multi-step road validation

The two-road core helper will validate the first road against the real state,
then validate the second against a shallow staged road map containing the first
road. The real `roadsByEdgeId` map will not be touched until both roads are
legal.

This preserves the rule that the first road can unlock the second while
removing temporary mutation-and-rollback from validation.

### Atomic maritime trade batches

A batch trade will first be locked down with failure-state contract tests. If
those tests confirm that its existing complete preflight makes every subsequent
sub-trade infallible, the implementation will remain unchanged. If a reachable
partial-failure path is exposed, it will instead calculate the final player
hand and finite-bank contents once, then assign both together.

Single maritime trades and player-to-player trades will retain their current
behavior, with failure-state tests confirming their existing validation is
non-mutating.

### Robber input hardening

Robber movement will reject an unknown acting player before changing the robber
tile. When its optional internal random selector is supplied, it will be
required to be a finite number in the half-open range `0 <= value < 1` before
it is used to select a card. Omitting it retains the current deterministic
fallback used by direct core calls.

Normal boardgame.io server calls already provide this shape. The change closes
malformed internal-call edge cases without changing valid robber behavior.

### Existing discard transaction

The new discard implementation remains the reference pattern: validate the
selection against a copied hand, then commit the new hand, finite-bank return,
pending-discard update and phase transition together.

## Contract and invariant tests

Tests will be added before each implementation change.

### Rejected moves do not mutate state

A small test helper will snapshot the relevant `GameState`, invoke a rule
operation expected to fail, and assert deep equality with the snapshot.

Coverage will include:

- incomplete resource spending;
- illegal second Road Building placement;
- invalid maritime batch inputs;
- invalid robber actor, victim or selector;
- the already-fixed malformed discard selection.

The helper is test-only. Production code will not pay for full-state cloning.

### Resource conservation

For finite-bank rules, focused action sequences will assert that each resource
type's total across the bank and all player hands remains constant when the
rules say cards should only move between owners. Covered paths will include
discarding, builds, development-card purchases, maritime trades and resource
distribution.

The tests will account for intentionally non-bank transfers such as Monopoly,
which move cards only between players.

### Award and development-card lifecycle

Focused sequence tests will confirm:

- Longest Road and Largest Army owners are either `null` or a real player;
- award recomputation and victory checks remain consistent after their
  triggering actions;
- a committed development card cannot be reused if its later effect needs
  additional choices or placements.

These are regression contracts around existing behavior, not new rules.

## App test-runner efficiency

The per-file Vitest isolation and 120-second timeout will remain. The runner
will move from a synchronous one-file-at-a-time loop to a bounded asynchronous
worker pool using Node's built-in child-process APIs.

- Default concurrency: the smaller of four workers or the available CPU count.
- Override: a validated environment variable, bounded to a safe range.
- Each file keeps its own timeout and attributable output.
- On failure, no new files are scheduled; already-active files are allowed to
  finish, with the existing timeout still bounding each one.
- Successful output is summarized per file so concurrent logs do not become
  unreadable.

The serial mode remains available through a concurrency value of one. The same
test set must pass in both serial and default modes before completion.

## Unused dependency cleanup

`jsnetworkx` and `next-images` have no production imports in the current
checkout; the only `next-images` reference is commented-out configuration.
They will be removed with pnpm, updating `package.json` and `pnpm-lock.yaml`.

The production dependency audit will be recorded before and after removal.
No Better Auth, Next.js or other dependency versions will be upgraded in this
worktree.

## Non-goals

- balanced-board generation changes;
- a generic transaction or immutable-state framework;
- changing the game-state schema or boardgame.io integration;
- Better Auth or Next.js upgrades;
- server chat/retention policy changes;
- dead-lobby deletion or UI monolith splitting;
- gameplay balancing or new Catan rules.

## Implementation order

1. Add failure-state and resource-conservation tests.
2. Harden resource spending, Road Building, maritime batches and robber input.
3. Run the game-core build and tests.
4. Implement and test the bounded app-test worker pool.
5. Remove the unused dependencies and refresh the lockfile.
6. Update `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md`.
7. Run full verification, production dependency audit and production build.

Keeping these as distinct checkpoints makes regressions easy to locate and
allows the engine hardening to remain reviewable independently of the test and
dependency improvements.

## Acceptance criteria

- Every covered rejected rule operation leaves `GameState` unchanged.
- Finite-bank resource conservation holds across the covered action sequences.
- Valid gameplay results remain unchanged.
- No whole-state production clone or new dependency is introduced.
- Serial and default-concurrency app test runs pass the same files.
- Default-concurrency verification is materially faster than the current
  sequential runner on the same machine, without intermittent failures.
- `pnpm verify` passes.
- The production build passes with the repository's intended build-time server
  placeholder flag.
- The dependency audit no longer includes trees reachable only through
  `jsnetworkx` or `next-images`.
