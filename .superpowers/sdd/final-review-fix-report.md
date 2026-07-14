# Final Review Fix Report

## Status

Implemented the complete final-review fix list on
`codex/duel-fair-board-lab`. No dependency, build-tool, catalog corpus,
production, deployment, push, or merge changes were made.

## Findings Resolved

1. Production setup validation now rejects an explicit custom `boardConfig`
   independently of whether `devScenarioState` is present. Direct helper and
   boardgame.io game-config validation tests cover the production path.
2. `BOARD_CONFIGS`, every built-in config, and every nested generation/options
   object are recursively frozen and exposed through a `DeepReadonly` type.
   A hostile mutable cast cannot change the process-wide official config.
3. Dev scenarios that supply replacement `tiles` now receive
   `boardSourceId: "custom"`, `boardConfigId: "custom"`, and custom provenance.
   Scenarios that do not replace tiles retain the freshly generated board's
   legitimate identity.
4. Catalog selection rejects empty seed arrays and rejects a selected seed
   unless it is an integer. Invalid RNG boundaries remain rejected.
5. The superseded live-catalog block in `docs/agent/PROGRESS.md` is explicitly
   historical; its old hashes and identifiers are no longer presented as
   current runtime guidance.
6. `docs/agent/HANDOFF.md` now points to product-owned modes, the board-source
   registry, the fair catalog, immutable official/random engine configs, and
   current initial-state provenance. Its January gameplay snapshot is labeled
   historical.
7. Archive tests directly prove legacy metadata fallback writes SQL-null board
   source/provenance fields.
8. Archive tests inject a failure after the archived-match insert succeeds and
   prove transaction rollback restores the fake database and releases the
   client.

`docs/agent/NOTES.md` records the production/custom-board and provenance safety
boundaries for future work.

## TDD Evidence

The initial focused RED run covered the new logic regressions:

```text
Test Files 4 failed | 1 passed (5)
Tests      9 failed | 29 passed (38)
```

The expected failures were the missing production rejection, stale catalog
provenance after scenario tile replacement, mutable config registry, and
missing catalog guards. The two archive coverage additions passed immediately
because the production transaction/fallback behavior was already correct; the
test fake gained only deterministic fault injection.

After the minimal runtime fixes, the combined focused suite passed:

```text
Test Files 5 passed (5)
Tests      38 passed (38)
```

The engine build initially caught the intended readonly mutation in test code;
the test now uses an explicit hostile-consumer cast so runtime mutation
resistance is exercised without weakening the public readonly type.

## Verification Evidence

- `pnpm test:catana`: 214 files, 825 tests, exit 0.
- `pnpm -C game-core test`: 14 files, 149 tests, exit 0.
- `pnpm -C game-core build`: exit 0.
- `pnpm test:server`: 47 files, 191 tests, exit 0.
- `pnpm exec eslint` over every changed JS/TS implementation and test file:
  exit 0.
- Runtime sweep for `standard-balanced`, `BalancedBoard`,
  `generateBalancedBoard`, `generateBoardClass`, and `boardCatalog`: no
  matches under `app`, `game-core/src`, `lib`, `server`, `ai`, or `scripts`.
- Engine product-mode import sweep: no stale `resolveGameMode` or
  `resolveDefaultGameModeId` imports from `@settlex/game-core`.
- Handoff sweep: no stale balanced generator/preset, `boardCatalog`, or
  unimplemented-official guidance.
- Normal setup retains exactly one `setupData.boardConfigId` mention: the
  intentional rejection in `initialState.js`.
- `git diff --check`: exit 0.

The controller will run the requested full release verification after
independent re-review.

## Concerns

- Existing non-failing Vite CJS deprecation, stale Browserslist data, and React
  `fetchPriority` warnings appeared during the broad suites. None originate in
  this fix.
