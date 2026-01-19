# Board Generation Config + Official Spiral Design

## Goals
- Support multiple board generation strategies (random, balanced, official spiral) without branching game setup logic.
- Allow a single "final config" object to drive game setup (spec + generation + reveal rules).
- Keep specs focused on geometry/counts and make strategies composable for future custom lobbies.
- Implement the official number placement spiral with a random start corner and deterministic RNG.
- Prepare for 5/6-player boards and expansions by keeping the generator generic.

## Non-goals (for now)
- Split the current balanced generator into independent terrain/number strategies.
- Support the official "random numbers, no adjacent red" variant.
- Build UI for lobby configuration; only the core config and generator wiring.

## Data Model
Introduce a single input object for setup:

```
BoardConfig = {
  specId: string,
  generation: {
    terrain: 'random' | 'balanced' | 'official',
    numbers: 'random' | 'balanced' | 'official',
    ports: 'random',
    options?: {
      official?: { startCorner?: 'random' | 'fixed' }
    }
  },
  reveal?: {
    tiles?: 'start' | 'turn1' | 'end',
    numbers?: 'start' | 'turn1' | 'end'
  }
}
```

Specs remain in a registry keyed by `specId`, containing geometry, resource counts, roll numbers, and port slots.

## Generation Pipeline
1) Resolve `specId` to `BoardSpec`.
2) Create deterministic RNG from boardgame.io.
3) Generate base hex tiles + topology (no resources/numbers yet).
4) Apply terrain strategy:
   - `random`: shuffle resources (includes desert).
   - `balanced`: use existing BalancedBoard generator (monolithic for now).
   - `official`: same as random (official only constrains numbers).
5) Apply numbers strategy:
   - `random`: shuffle roll numbers (skip desert).
   - `official`: spiral placement using ordered token list from `spec`.
   - `balanced`: no-op unless/when split later.
6) Apply ports: shuffle port resources across fixed port slots.

If the terrain strategy returns a fully-built board (balanced), skip later steps for that board and return it directly.

## Official Spiral Algorithm
- Use a ring spiral on axial/cube coords for a hexagon of radius `r`.
- Start corner is chosen via RNG (random among 6 corners), unless `fixed`.
- Walk the outer ring counter-clockwise, then inner rings, then center.
- Place number tokens in ordered list (from `spec.officialNumbers`) skipping the desert tile.
- Desert receives no number.

The spiral is purely a placement order; terrain is still randomized.

## Error Handling
- Validate that `officialNumbers.length` equals `(landTiles - deserts)`.
- Validate that all required resources/ports are present in the spec.
- Throw with actionable errors during setup when counts mismatch.

## Future-proofing
- 5/6-player board: add a new spec with correct `officialNumbers` list; spiral works for any radius.
- Irregular boards: allow `spec.officialOrder` to be an explicit coordinate list.
- Balanced strategies can be split later into `balancedTerrain` + `balancedNumbers`.

## Testing
- Determinism: same RNG seed yields identical boards.
- Official placement: desert has no number, multiset of numbers matches spec.
- Spiral order: ensure CCW ring order and inward progression.
- Port shuffle: port resources are permuted across slots.
