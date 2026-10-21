# Slice F (Ruleset Config + Validation) Design

## Goal
Provide static ruleset specs (standard + duel), a `createRuleset(spec)` factory that deep-copies rulesets, and minimal validation enforced inside `createEmptyState` with thrown errors on invalid rulesets.

## Approach
- Export canonical ruleset objects from `game-core/src/ruleset.ts`.
- Add `createRuleset(spec)` to return a fresh copy so per-game rulesets aren’t shared.
- Add `validateRuleset(ruleset)` to check only invariants (non-negative counts, required keys, thresholds ≥ 1).
- Extend `createEmptyState(players, ruleset?)` to validate and throw `Error` with newline-joined messages when invalid.
- Do **not** enforce policy constraints like min players or duel settings.

## API Surface
- `STANDARD_RULESET`, `DUEL_RULESET` constants
- `createRuleset(spec: Ruleset): Ruleset`
- `validateRuleset(ruleset: Ruleset): { ok: boolean; errors: string[] }`
- `createEmptyState(players: string[], ruleset?: Ruleset)` (optional ruleset override, throws if invalid)

## Validation Rules (Minimal)
- Required keys present for bank resource counts and dev card counts
- Numeric fields are finite
- Counts/limits/thresholds ≥ 0 (thresholds like victoryPointsToWin, longestRoadMinLength, largestArmyMinKnights must be ≥ 1)
- Trade rates ≥ 1

## Testing
- `createRuleset` returns a deep copy (mutating result doesn’t affect source).
- `validateRuleset` reports errors for negative counts and missing keys.
- `createEmptyState` throws on invalid rulesets, works for standard/duel specs.
