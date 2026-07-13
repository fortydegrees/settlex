# Duel Fair v3 Fast Ranking

## Status

This design supersedes `duel-fair-v2` as the proposed default offline ranking
path for 1v1 boards. It preserves v1 and v2 as historical research tools. No
production board-generation or live match path changes as part of this design.

The design reflects the calibration discussion after the bounded v2 run:

- exact v2 measured about `0.497` boards per second with diagnostic lenses;
- the exact solver visited about 5.5 million legal four-placement endings on a
  standard board;
- the v2 report mixed a v1 shortlist with v2 audit verdicts and therefore did
  not provide one coherent ranking;
- the desired workflow is instead `generate -> score every board -> sort`;
- subjective weights should be source-controlled, explainable, and cheap to
  tune later.

## Objective

Assign every structurally valid standard 1v1 board a deterministic numeric
score quickly enough to rank tens of thousands of candidates offline.

The ranking should reward:

- comparable opening opportunity for P1 and P2 under `P1, P2, P2, P1`;
- useful rather than merely abundant resource production;
- viable road, settlement, city, and development-card portfolios;
- contextual access to scarce resources;
- starting-card tempo from each player's second settlement;
- ports, city potential, robber resilience, and reachable expansion;
- multiple credible responses without requiring strategic variety to define
  fairness.

The result remains an explainable heuristic, not a claim of solved Catan or
predicted win probability.

## Decisions

1. A new fast evaluator, `duel-fair-v3`, becomes the proposed default lab
   ranking path.
2. The exact opening solver is retained only as a bounded validation oracle and
   explicit single-board diagnostic.
3. All structurally valid boards receive numeric `overall`, `fairness`,
   `quality`, and `interest` scores. Review or warning tags never erase the
   comparative score.
4. Only invalid topology, invalid standard components, non-finite facts, or an
   impossible complete opening are unrankable.
5. The normal report is one score-ordered gallery. Historical evaluator
   comparisons live in a separate research output.
6. Suggested placements are hidden by default.
7. Human judgment is not part of per-board evaluation. It is a later
   calibration input for changing versioned weights.

## Ownership Boundary

The current dependency direction remains:

```text
scripts/duel-board-lab -> game-core topology, costs, and neutral rules
game-core              -X-> fairness policy, weights, ranking, and reports
```

The fast evaluator belongs in `scripts/duel-board-lab`. `game-core` remains the
pure game engine and does not acquire duel-fairness policy.

## Scope

This design covers:

- standard 19-land-hex boards and standard ports;
- official-spiral and freeform candidate families already present in the lab;
- 1v1 placement order `P1, P2, P2, P1`;
- deterministic feature extraction and ranking;
- bank and owned-port conversion, with player trading excluded;
- an ordered HTML report with alternative sort modes;
- bounded comparison against the exact solver.

## Non-Goals

This slice does not:

- add a production catalog or live 1v1 board-selection setting;
- add a SettlersSetup-inspired constructive generator family;
- simulate turns, development-card draws, robber decisions, trades, road
  races, or win probability;
- train a learned model or tune from match history;
- define three- or four-player fairness;
- run a 100,000-board corpus;
- delete v1/v2 artifacts needed for historical comparison.

## Architecture

The default evaluation flow is:

```text
candidate board
  -> immutable board facts
  -> board context and resource scarcity
  -> 54 settlement feature vectors
  -> legal ordered two-settlement portfolios
  -> strategically covered candidate-node pool
  -> pruned P1/P2/P2/P1 comparison
  -> fairness, quality, and interest scores
  -> overall score and explanatory components
  -> score-ordered report
```

The implementation should keep these responsibilities separate:

```text
analysis/
  boardContext.mjs
  settlementFeaturesV3.mjs
  portfolioValueV3.mjs
  candidatePoolV3.mjs
  prunedOpeningDraftV3.mjs
  evaluateDuelBoardV3.mjs
  duelFairV3Profile.mjs
```

Existing neutral facts, graph traversal, ordered starting-resource, port, and
recipe helpers should be reused where their contracts fit. Exact-v2 policy and
verdict semantics must not leak into v3 ranking.

## Board Context

Board context is calculated once per candidate.

For each resource it records:

- total tile production pips, counting each tile once;
- production per resource tile, so standard differences in tile counts do not
  automatically make ore or brick scarce;
- distribution across settlement nodes;
- the best and second-best geographically independent access;
- geographic concentration and the distance between viable access regions;
- matching 2:1 and generic 3:1 port access.

The scarcity multiplier compares actual production per tile with the standard
expected production per tile and is clamped to `[0.80, 1.25]`. Scarcity can
raise the marginal value of useful access without making a weak `3` resource
spot dominate every other feature.

Scarcity and access concentration remain separate facts. Low ore with several
independent ore routes is different from the same total ore concentrated in
one premium region.

## Settlement Features

All 54 settlement nodes receive a feature vector before pruning:

- production pips by resource and total production;
- initial resource diversity and roll-number diversity;
- scarcity-adjusted production;
- direct road, settlement, city, and development-card recipe contribution;
- matching port value and generic port value;
- marginal city uplift if this settlement is upgraded;
- worst single-tile production loss;
- best and second-best one-road and two-road expansion gains;
- route redundancy to those expansion destinations;
- denial value created by the distance rule;
- a broad opportunity score used only for candidate selection.

These calculations are arithmetic over a fixed board graph. They do not search
complete games.

## Ordered Portfolio Value

An opening portfolio is an ordered pair of non-adjacent settlements. Order is
semantic because only the second settlement supplies starting cards.

The evaluator preserves the complete production vector and derives these
normalised component values:

1. **Production**: base resource-weighted pips.
2. **Recipe readiness**: road, settlement, city, and development-card capacity,
   including complement bottlenecks.
3. **Scarcity access**: useful access to board-relative scarce resources.
4. **Starting tempo**: recipe progress from the second-settlement cards.
5. **Trade and ports**: owned-port conversion without hiding direct shortages.
6. **City potential**: best marginal value from doubling either settlement,
   conditioned by the portfolio's ability to produce city resources.
7. **Expansion**: best and second-best reachable marginal portfolio gains.
8. **Resilience**: worst single-tile loss, critical-resource concentration,
   and route redundancy.

Initial base resource weights are deliberately conservative:

```text
Wheat  1.15
Ore    1.10
Wood   1.00
Brick  1.00
Sheep  0.90
```

They are not sufficient on their own. Recipe bottlenecks ensure, for example,
that high wood without brick or a useful port does not receive full road value.

Initial portfolio component weights are:

```text
production       0.30
recipeReadiness  0.25
scarcityAccess   0.10
startingTempo    0.10
tradeAndPorts    0.05
cityPotential    0.05
expansion        0.10
resilience       0.05
```

Each component is normalised before weighting. Related sub-features are capped
inside their component so scarcity, concentration, and resilience cannot
triple-count one missing resource without bound.

All policy values live in an immutable, versioned profile. A policy hash is
stored with every run.

## Candidate-Node Pool

The fast search does not assume the best opening is simply the highest raw
production node.

The default pool limit is 16 nodes. The pool first includes the deterministic
champion for each of these lenses when one exists:

- broad opportunity;
- road;
- settlement;
- city;
- development card;
- access to each of the five resources;
- port value;
- expansion value;
- denial value.

Duplicate champions collapse to one node. Remaining slots are filled by broad
opportunity score with stable node-id tie-breaking.

If the initial pool contains no complete legal four-placement sequence, a
cheap full-board legality scan finds the stable first complete draft and adds
its missing nodes to the pool. This can grow the default pool from 16 to at
most 20 nodes; it never restores a 54-node exhaustive ranking search. If the
legality scan itself finds no complete draft, the board is structurally
invalid. The evaluator records the final pool size and whether fallback nodes
were required.

## Pruned Opening Comparison

Within the candidate pool, evaluate every legal sequence:

```text
P1 first -> P2 first -> P2 second -> P1 second
```

At the default 16-node limit the raw upper bound is:

```text
16 * 15 * 14 * 13 = 43,680 sequences
```

The distance rule reduces the real count further.

Each terminal sequence compares the players' ordered portfolio values. P1
maximises the value difference, P2 minimises it, and stable node order resolves
policy ties. Static ordered-pair portfolio components should be precomputed so
the terminal loop performs only matchup-dependent work such as occupied-route
effects.

The default evaluator does not run diagnostic strategy lenses or materialise
every alternative line. It retains only:

- the selected sequence;
- the best value for each legal P1 root in the pool;
- near-optimal P2 responses needed for choice diagnostics;
- counts and regret gaps needed for explainability.

## Scores

All component scores use `[0, 100]`, where higher is better.

### Fairness

```text
normalisedSeatAdvantage =
  (P1 value - P2 value) / max(abs(P1 value), abs(P2 value), 1)

fairnessScore =
  100 * (1 - clamp(abs(normalisedSeatAdvantage) / fairnessScale, 0, 1))
```

The initial `fairnessScale` is `0.20`. A board at or beyond a 20% normalised
seat advantage receives zero fairness points but remains numerically rankable.

### Quality

Quality is based primarily on the weaker selected portfolio, with a small
board-pace term so two equally starved openings do not look ideal:

```text
qualityScore =
  0.80 * weakerPortfolioScore
  + 0.20 * meanPortfolioScore
```

Portfolio scores are normalised against fixed profile targets rather than the
current batch, so a board's score does not change when unrelated candidates
are added. Each portfolio component is independently normalised to `[0, 100]`
using a source-controlled rule-derived scale before the weighted portfolio
value is calculated; quality therefore needs no corpus-relative denominator.

### Interest

V3 intentionally starts with only two cheap signals:

- `choiceDepth`: the number of choices within the profile's near-optimal
  tolerance at important draft states;
- `responseFreedom`: the inverse of the regret gap between the best and
  second-best credible response.

The initial near-optimal tolerance is `0.05` of normalised portfolio value.
Choice depth reaches 100 at a mean of four near-optimal options and is clamped
above that. Response freedom reaches zero when the best-to-second-best regret
gap is `0.15` or greater and is linearly scaled between those endpoints.

```text
interestScore = 0.50 * choiceDepth + 0.50 * responseFreedom
```

Strategy classification and catalog-relative novelty are deferred. Recipe
vectors remain available as raw diagnostics for later calibration.

### Overall

The initial default ranking is fairness-first without requiring a hard
semantic pass gate:

```text
overallScore = 0.80 * fairnessScore + 0.20 * qualityScore
```

`interestScore` has zero initial influence on `overallScore`. It is independently
sortable so its usefulness can be inspected before it affects default ranking.

## Output Contract

Every structurally valid result includes:

```ts
type DuelFairV3Result = {
  evaluatorIdentity: {
    featureVersion: string;
    policyVersion: "duel-fair-v3";
    profileHash: string;
  };
  status: "ranked" | "invalid";
  invalidCodes: string[];
  overallScore: number | null;
  scores: {
    fairness: number;
    quality: number;
    interest: number;
  } | null;
  selectedLine: Array<{ player: "P1" | "P2"; nodeId: number }> | null;
  selectedPortfolios: {
    P1: OpeningPortfolioV3;
    P2: OpeningPortfolioV3;
  } | null;
  components: Record<string, number> | null;
  choiceDiagnostics: {
    choiceDepth: number;
    responseFreedom: number;
    candidatePoolSize: number;
    evaluatedSequenceCount: number;
    usedFallbackExpansion: boolean;
  } | null;
  tags: string[];
};
```

`OpeningPortfolioV3` extends the existing ordered portfolio contract with the
normalised v3 components and final portfolio value. It does not duplicate
board topology or mutable game state.

Warning tags may describe scarcity, concentration, port dependence, forced
responses, adjacent red numbers, or unusual production. They do not null the
score.

## Exact Solver as Oracle

The exact solver is no longer a batch-ranking dependency. It remains available
for:

- explicit inspection of a named seed;
- a fixed small comparison corpus;
- measuring whether candidate-pool pruning changes conclusions materially.

The comparison uses the same v3 portfolio policy with diagnostic lenses off.
Before accepting the default pool limit, a 12-board fixed corpus must meet all
of these calibration targets:

- seat-advantage direction agrees on at least 10 of 12 boards;
- median absolute normalised-seat-advantage error is at most `0.03`;
- Spearman correlation of board fairness ordering is at least `0.85`.

If the targets fail, first increase the pool to 20. If that still fails, improve
candidate coverage. Do not restore exhaustive search to the default path.

These are calibration tests, not claims that the exact policy represents true
expert play.

## Ranked Report

The default report has one primary gallery ordered by descending
`overallScore`. Each card shows:

- rank;
- seed and generator family;
- overall, fairness, quality, and interest scores;
- compact warning tags;
- board, numbers, and geographic ports.

Controls allow sorting ascending or descending by overall, fairness, quality,
or interest.

Suggested placements are hidden by default behind a report-level toggle.
Portfolio components and the chosen line are collapsed under diagnostics.

The report must not:

- label a v1 shortlist as v3 top candidates;
- use filename order as presentation order;
- duplicate a board across top, threshold, and outlier sections;
- recompute an exact solve during rendering;
- mix `null` audit scores with a ranked list.

Historical v1/v2 disagreement galleries, if retained, use a separate report
title and output path that explicitly identify them as research comparisons.

## Performance and Storage

The development-machine target for complete v3 generate-and-evaluate work is
at least 100 boards per second, measured separately from v1 and exact-v2 rows.
This is a calibration target, not a universal timing assertion or a CI
wall-clock test.

If the target is missed, do not start a large corpus. Profile candidate-pool
construction, ordered-pair precomputation, and matchup-dependent expansion
before changing the scoring model.

The existing streamed run contract remains. Store compact candidate records
for the corpus and materialise/render only bounded ranked selections. Do not
retain all board facts or exact diagnostics in memory.

## Invalid and Error Handling

A candidate is `invalid` only for:

- invalid standard component counts;
- incomplete topology or ports;
- non-finite required feature values;
- no legal complete opening in the full-board legality scan;
- deterministic regeneration or raw-hash mismatch during inspection.

Batch evaluation records the stable error code and continues. It never assigns
a misleading zero score to a malformed board.

## Determinism

Given identical board tiles and profile identity, v3 must return byte-stable
numeric output and chosen lines within the documented floating-point rounding
contract.

Rotation and reflection must preserve scores and transform selected node
identities consistently. Stable node ids resolve ties after comparing values at
the profile precision.

## Verification

Implementation acceptance requires:

1. unit tests for scarcity, recipe bottlenecks, starting tempo, port conversion,
   city uplift, worst-tile robber loss, and expansion redundancy;
2. tests proving candidate-lens champions are retained and fallback expansion
   completes a legal draft;
3. deterministic and symmetry-invariance tests;
4. pruned minimax tests for `P1, P2, P2, P1` and distance-rule blocking;
5. the bounded exact-oracle calibration targets above;
6. a fixture asserting seed 47 no longer ranks near-perfectly for the v1
   production-only reasons;
7. report tests for numeric ordering, sort controls, unique cards, and placement
   overlays hidden by default;
8. a fresh machine-specific benchmark with diagnostic lenses disabled from the
   default path;
9. focused board-lab tests, lint, `game-core` tests/build, and `git diff --check`.

No broad corpus is an implementation acceptance requirement.

## Migration

V3 should be introduced alongside the existing evaluators during development.
Once verification passes:

- the batch command writes v3 as the default ranking record;
- the normal report reads only v3 scores;
- v1/v2 comparison becomes explicit opt-in research output;
- exact-v2 remains callable for inspection and the bounded oracle corpus;
- old stored runs remain readable and are never relabelled as v3.

## Stop Boundary

The implementation slice ends after the fast evaluator, bounded oracle
comparison, benchmark, and ranked report are verified.

It does not automatically:

- generate a 100,000-board corpus;
- freeze policy weights as final;
- add a constructive balanced-board generator;
- publish boards to production;
- change the default board mode in live 1v1.

Those decisions require reviewing the new ordered gallery and explicitly
choosing the next slice.
