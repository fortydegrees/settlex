# Explicit Board Source Architecture

## Status

Approved in conversation on 2026-07-14. This document is the pre-implementation
review checkpoint. Production deployment remains a separate explicit approval.

This supersedes the runtime setup and ownership model in
`2026-07-14-duel-fair-live-catalog-design.md`. That earlier document remains
the source for how the v1 catalog corpus is published and verified.

## Problem

The first live-catalog implementation overloads `standard-balanced` with two
incompatible meanings:

- in `game-core`, it names the old Settlers Setup-derived runtime generator;
- in default duel setup, it is a sentinel that bypasses that generator, selects
  a seed from `duel-fair-official-v1`, and regenerates the board through the
  `standard-official` configuration.

Consequently, the saved `boardConfigId` does not describe the generator that
produced the board. The coupling is implicit, an explicit balanced request is
ambiguous, and a SettleHex catalog policy is encoded indirectly in a
`game-core` game-mode preset.

Nothing has launched with this representation, so the implementation should be
made internally coherent rather than preserve the provisional convention.

## Objective

Give each setup concept one literal meaning:

- a **game mode** selects product defaults such as player count, ruleset, and
  board source;
- a **board source** decides how a board is selected;
- a **board configuration** tells `game-core` how to construct tiles;
- **board provenance** records which concrete selection and generator produced
  a saved board.

Changing duel from the fair catalog to ordinary generated official-spiral
boards must require changing only the duel mode's `boardSourceId`.

## Ownership Boundary

### `game-core`

`game-core` remains the neutral deterministic Catan engine. It owns:

- ruleset structures and built-in ruleset data;
- board specifications, topology, and invariants;
- deterministic board construction from a `BoardConfig` and injected RNG;
- the `standard-official-spiral` and `standard-random` board configurations.

It does not own:

- SettleHex game-mode product presets;
- fair-board catalogs or catalog identifiers;
- board-source selection policy;
- evaluator identities, scores, or ranking weights.

The current `gameModes.ts` registry moves to a shared SettleHex product module
outside `game-core`. The engine may still expose neutral ruleset and board
configuration identifiers for consumers to resolve.

### Shared SettleHex product configuration

A shared product module, consumable by Catana setup and server match creation,
owns mode defaults:

```js
duel: {
  numPlayers: 2,
  rulesetId: "duel",
  boardSourceId: "duel-fair-official-v1"
}

"standard-3p": {
  numPlayers: 3,
  rulesetId: "standard",
  boardSourceId: "generated-official-spiral-v1"
}

"standard-4p": {
  numPlayers: 4,
  rulesetId: "standard",
  boardSourceId: "generated-official-spiral-v1"
}
```

Matchmaking, friend challenges, bots, and direct setup all resolve these same
presets. They must not duplicate board-source defaults.

### Catana game setup

The Catana setup layer owns the runtime board-source registry and materialises
a source with boardgame.io's injected RNG. It asks `game-core` to generate the
resolved board and records the result's provenance.

The offline board lab remains the only owner of fairness evaluation and catalog
publication.

## Identifiers

The initial source registry contains:

```text
duel-fair-official-v1
  kind: catalog
  catalog: duel-fair-official-v1
  board config: standard-official-spiral
  generator family: official-spiral
  generator version: official-spiral-v1

generated-official-spiral-v1
  kind: generated
  board config: standard-official-spiral
  generator family: official-spiral
  generator version: official-spiral-v1

generated-random-v1
  kind: generated
  board config: standard-random
  generator family: freeform-random
  generator version: freeform-random-v1
```

`standard-official` is renamed `standard-official-spiral`. This is a semantic
identifier change only: its v1 generation algorithm remains random terrain,
official spiral number placement, random ports, and an RNG-selected start
corner.

`standard-balanced` is removed. The old runtime balanced generator and support
code are deleted when they have no remaining consumers. If the algorithm is
ever useful for comparison, it can be reintroduced explicitly in the offline
board lab rather than the server-authoritative engine.

The catalog and its compact runtime artifact record
`boardConfigId: "standard-official-spiral"` alongside the existing generator
family and version, so publication and runtime reconstruction are bound to the
same recipe.

## Setup Resolution

Normal match setup follows one unambiguous path:

1. Resolve `modeId`, defaulting by player count when absent.
2. Resolve `rulesetId` from an explicit override or the mode preset.
3. If an explicit `setupData.boardConfig` object exists, reject an explicitly
   supplied `boardSourceId` and materialise the custom configuration.
4. Otherwise, resolve `boardSourceId` from an explicit override or the mode
   preset, then look it up. Unknown identifiers are setup errors.
5. Materialise the resolved built-in source:
   - a catalog source uses one injected random value to select a catalog entry,
     then reconstructs its seed with the source's board configuration;
   - a generated source passes the injected RNG directly to its board
     configuration.
6. Record the resolved source, actual board configuration, and provenance in
   the initial game state.

Normal product setup no longer accepts `boardConfigId` as an alternative way
to request a built-in source. Existing callers that want a random built-in
board migrate to the corresponding `boardSourceId`. This prevents callers from
creating conflicting source/config combinations.

An explicit `setupData.boardConfig` object remains available for dev scenarios
and focused tests. It is mutually exclusive with `boardSourceId` and resolves
to `boardSourceId: "custom"`, `boardConfigId: "custom"`, and custom
provenance. Supplying both is an error rather than a precedence rule.

There is no silent fallback for an unknown source, missing catalog, invalid
catalog random value, or unknown board configuration.

## Runtime State

A catalog-backed duel records:

```js
{
  modeId: "duel",
  rulesetId: "duel",
  boardSourceId: "duel-fair-official-v1",
  boardConfigId: "standard-official-spiral",
  boardProvenance: {
    sourceKind: "catalog",
    catalogId: "duel-fair-official-v1",
    catalogRank: 37,
    seed: 12345,
    generatorFamily: "official-spiral",
    generatorVersion: "official-spiral-v1",
    evaluatorVersion: "duel-fair-v3",
    evaluatorIdentity: {
      featureVersion: "duel-fair-v3-features-1",
      policyVersion: "duel-fair-v3",
      profileHash: "fefc1c6af6b4ba66c00db3b853feda73d3836ced33b1d9fc43467d17baf3cc05"
    }
  }
}
```

`boardCatalog` is renamed `boardProvenance`: the object describes the selected
board, not the catalog as a collection.

A generated board records the same top-level source and configuration plus
provenance containing `sourceKind: "generated"` and generator identity. It has
no catalog id, rank, seed, or evaluator identity.

Changing duel to ordinary official-spiral generation is therefore only:

```diff
- boardSourceId: "duel-fair-official-v1"
+ boardSourceId: "generated-official-spiral-v1"
```

No setup branch, generator, archive code, or fairness code changes.

## Archive Provenance

The archive writer reads resolved values from the initial game state rather
than treating requested setup metadata as the authority for the actual board.

A forward migration adds to `archived_matches`:

- `board_source_id TEXT`;
- `board_provenance_json JSONB`.

The existing `board_config_id` remains, but now stores the actual resolved
configuration such as `standard-official-spiral`. The provenance JSON stores
the catalog rank, seed, and version identities without forcing every future
provenance field into a database column.

The replay's `initial_state_json` continues to store the complete initial
state. The dedicated archive fields allow a future past-games screen to list,
filter, or label board sources without loading each full replay.

Existing archive rows remain readable and are not reinterpreted. Rows created
before explicit board sources retain their original `board_config_id` and
receive null source/provenance fields; their replay initial state remains the
authority for the historical board. New rows use the explicit model.

## Deletion And Migration Scope

Implementation removes or migrates all live references to:

- the `standard-balanced` board configuration;
- `BalancedBoard` and its runtime exports;
- the time- and process-history-dependent balanced generation branch;
- the duel-plus-balanced catalog interception;
- `boardCatalog` as a game-state field;
- product game-mode imports from `@settlex/game-core`;
- built-in product setup requests expressed as `setupData.boardConfigId`;
- AI and bot defaults that still name `standard-official`.

The existing published board seeds and scores do not change. Only catalog
metadata and runtime identifiers are updated to state the generator
configuration explicitly, and artifact integrity tests must prove every seed
still regenerates its stored board hash.

## Verification

### Focused tests

- Product mode tests prove duel and standard multiplayer map to the expected
  board sources.
- Board-source tests cover catalog selection boundaries, generated sources,
  custom configuration, conflicts, and unknown identifiers.
- Initial-state integration tests prove default duel, switched generated duel,
  standard multiplayer, and custom setup produce truthful state fields.
- Matchmaking and friend-challenge tests prove setup metadata uses
  `boardSourceId` and shares the same mode registry.
- Archive tests prove source, actual configuration, and provenance are written
  from resolved game state.
- Catalog integrity tests regenerate all 1,000 seeds with
  `standard-official-spiral` and match their stored hashes.
- Source/reference tests prove `standard-balanced`, the deleted balanced
  generator, the old interception, and `boardCatalog` are absent from runtime
  code.

### Repository verification

- board-lab tests;
- Catana tests;
- server/lib tests including migrations and archive lifecycle;
- `game-core` tests and build;
- focused lint followed by `pnpm verify`;
- the documented placeholder-enabled production build lane.

## Non-Goals

This cleanup does not:

- change the 1,000 selected boards or evaluator weights;
- evaluate fairness during match setup;
- add a player-facing board-source selector;
- add weighted catalog selection or catalog fallbacks;
- add remote catalogs or a generic plugin framework;
- deploy production;
- implement the past-games UI itself.
