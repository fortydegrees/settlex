# NOTES

- Use `pnpm dev:log` to capture dev-server output at `.logs/dev.log` for debugging without manual copy/paste.
- boardgame.io RNG is passed as `random` in setup/moves; use `random.Number()` for deterministic floats.
- ESLint is now configured via `.eslintrc.json` with `react/jsx-key`; `pnpm lint` may emit existing warnings (hooks/img).
- Trading rules live in `game-core/src/rules/trading.ts`; port eligibility uses `coreTopology.portsByNodeId` and `ruleset.tradeRates`.
- Victory/awards logic lives in `game-core/src/rules/victory.ts`; thresholds are ruleset-configurable.
- Ruleset specs/factory/validation live in `game-core/src/ruleset.ts`; `createEmptyState` throws on invalid rulesets.
- Board presets live in `game-core/src/board/boardPresets.ts`; UI setup resolves `"standard-random"` and uses `generateBoard` to create tiles.
- UI now renders from `G.core` and uses `app/catana/utils/playerView.js` to map core players to UI colors and counts.
