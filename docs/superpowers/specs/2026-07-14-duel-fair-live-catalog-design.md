# Duel Fair Live Catalog v1

## Status

Approved for implementation on 2026-07-14. Production deployment remains a
separate approval after local verification.

> Runtime setup and ownership in this document were superseded before launch by
> `2026-07-14-explicit-board-source-architecture-design.md`. Catalog corpus,
> publication, ranking, and integrity decisions remain authoritative.

## Objective

Make pre-ranked fair boards the default board source for new 1v1 games without
running the fairness evaluator during match setup.

The first catalog will contain the 1,000 highest-ranked, symmetry-distinct
`official-spiral` boards from a fixed 65,000-seed `duel-fair-v3` run.

## Decisions

1. Generate seeds `1..65000` with `official-spiral-v1` and rank every valid
   board with `duel-fair-v3`.
2. Collapse candidates by `canonicalSymmetryHash`, retaining the better-ranked
   record when a duplicate exists.
3. Sort by `overallScore` descending and seed ascending, then publish the first
   1,000 entries as `duel-fair-official-v1`.
4. Select uniformly from those 1,000 entries for a default duel setup.
5. Use the selected seed with the neutral deterministic RNG and
   `standard-official` generator. Do not evaluate a board during a live match.
6. Record catalog id, rank, seed, generator family, and generator version in
   the initial game state so archives and future replay UI can identify the
   board.
7. Preserve the existing `standard-balanced` generator for explicit custom or
   non-duel setups. Existing archived games already contain their initial
   state and are unchanged.
8. Do not add variety quotas, tag exclusions, database tables, dependencies,
   or player-data calibration in v1.

## Ownership Boundary

```text
scripts/duel-board-lab
  -> generates and ranks the offline corpus
  -> publishes the versioned catalog and small runtime seed module

app/catana/gameSetup
  -> chooses one catalog seed with boardgame.io's injected RNG
  -> asks game-core to generate the selected official board
  -> records catalog provenance in game state

game-core
  -> supplies topology, official board generation, and deterministic RNG
  -X-> owns no fairness score, weights, catalog, or selection policy
```

## Catalog Artifacts

The full source-controlled provenance artifact lives at:

```text
data/board-catalogs/duel-fair-official-v1.json
```

It records:

- catalog, generator, evaluator, feature, policy, and profile identities;
- the fixed source seed range and selection method;
- 1,000 entries containing rank, seed, raw board hash, canonical symmetry hash,
  overall score, component scores, and explanatory tags.

The runtime module lives at:

```text
app/catana/gameSetup/catalogs/duelFairOfficialV1.generated.js
```

It contains only the immutable catalog identity and the 1,000 ranked seeds.
Keeping scores and hashes out of the runtime module avoids adding the full
offline report payload to the game client.

Both artifacts are generated from the same command and checked against one
another in tests.

## Runtime Behaviour

The catalog applies when all of these are true:

- resolved mode is `duel`;
- resolved board configuration is `standard-balanced`;
- no explicit custom `boardConfig` object was supplied.

The existing boardgame.io `random.Number()` value selects an index with
`floor(value * 1000)`. The selected seed initializes the deterministic RNG used
by `generateBoard(resolveBoardConfig("standard-official"), seededRng)`.

Other modes and explicit board configurations continue through the existing
board-generation path. The game state's `boardConfigId` remains
`standard-balanced`, describing the requested fair-board product policy, while
`boardCatalog` records the concrete official-spiral source.

## Determinism And Integrity

The publication path must fail when:

- the run is incomplete or is not `duel-fair-v3` plus `official-spiral-v1`;
- fewer than 1,000 ranked, symmetry-distinct boards exist;
- any selected record lacks its seed, hashes, overall score, or component
  scores;
- runtime seeds diverge from the full catalog;
- regenerating a selected seed no longer produces its stored raw board hash.

The generated artifacts omit timestamps so rerunning publication from the same
completed run produces byte-identical output.

## Verification

- Unit-test catalog ranking, duplicate handling, manifest validation, and
  deterministic artifact rendering.
- Integrity-test all 1,000 published entries against regenerated boards.
- Unit-test first/last runtime selection and invalid random values.
- Integration-test that default duel setup uses the catalog while explicit
  random and non-duel setups retain their existing behaviour.
- Run board-lab, Catana, game-core, lint, and build verification before handoff.

## Non-Goals

This slice does not deploy production, add a board browser, expose scores in the
UI, collect placement surveys, alter multiplayer board generation, or claim
that `duel-fair-v3` predicts game win probability.
