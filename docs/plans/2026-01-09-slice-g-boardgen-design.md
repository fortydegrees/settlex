# Slice G (Board Generation: Random) Design

## Goal
Introduce a minimal board-generation preset layer that is separate from rulesets, and switch the UI to use a deterministic random board generator (resources + numbers shuffled). Generated tiles remain stored in game state for replay/reconnect determinism.

## Approach
- Keep `ruleset` concerns in core state; add a separate board preset resolver in `game-core/src/board`.
- Use existing `generateBoard` (randomized via `RandomQueue` + deterministic RNG) as the random generator; no 6/8 adjacency constraints yet.
- During setup, resolve a board preset id to a config object, generate tiles once, and store:
  - `tiles` (resolved board)
  - `boardPresetId` (string) for replay metadata
  - `robberTileId` derived from the desert tile
- Leave the BalancedBoard generator in place (still exported) but stop using it in the main setup.

## API Surface
- `BoardPresetId` (union of preset ids; start with `"standard-random"`).
- `resolveBoardPreset(id)` → board config object (currently wraps `spec`).

## Testing
- Reuse existing board invariant tests for resource/number counts.
- Add a small preset resolution test (ensures the preset id maps to a config with expected shape/radius).

