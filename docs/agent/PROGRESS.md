# PROGRESS

## Status (2026-01-08)
- Phase 0: added AI harness files (`AGENTS.md`, `game-core/AGENTS.md`, `docs/agent/*`).
- Phase 1: created pnpm workspace + `game-core` scaffold, added Vitest config, and moved core types/spec/board generation into `game-core`.
- Fixed Next import/export issue for `@settlex/game-core`, removed duplicate `PlayerColor` export, and updated board generation RNG to use boardgame.io `random.Number()`; `/catana` now renders.

## Next
- Add initial `game-core` tests (Vitest).
- Continue core extraction (moves/validation) into `game-core`.
- Clean up legacy duplicates in `app/catana/game`, `spec/`, `strategy/`, `utils/`.
- Address React list key warnings in `app/catana/Board.js`.

## Notes
- Keep Next as the UI shell; multiplayer runs in the separate boardgame.io server.
