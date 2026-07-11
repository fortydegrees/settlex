# Duel Fair Board Lab

## Objective

Build an offline, deterministic board-generation and analysis lab that can produce and rank large numbers of boards for SettleHex 1v1 duel play.

The lab defines a fair duel board as one with multiple competitive opening routes where no single early settlement monopolises the only viable access to a resource or strategy. A fair board may still be resource-poor, resource-rich, asymmetric, or unusual. The goal is not equal resource totals; it is to keep placement order from becoming the dominant reason a game is won or lost.

The first deliverable proves that the evaluator's rankings match human judgment. It does not change live match creation or replace the current runtime generator.

## Scope

This design targets the current SettleHex duel mode:

- two players;
- placement order `P1, P2, P2, P1`;
- four total opening settlements;
- player trading disabled;
- balanced dice enabled;
- standard 19-hex board shape and resource/token counts.

The facts and analysis primitives may be reusable, but the `duel-fair-v1` policy is not presented as a universal Catan balance model.

## Non-Goals

The first implementation does not:

- change `standard-balanced` or any live game setup path;
- create or load a production board catalog;
- add lobby or player-facing board options;
- design a four-player fairness policy;
- simulate full games, trading, roads, robber strategy, or bot win rates;
- use deep minimax or claim mathematically proven fairness;
- refactor or remove the legacy balanced generator;
- introduce a new workspace package, dependency, database, or build system.

## Ownership Boundary

`game-core` remains the raw, authoritative Catan engine. It owns:

- board specifications and topology;
- legal settlement spacing and other game rules;
- deterministic state transitions and RNG interfaces;
- ruleset variants such as duel rules and balanced dice;
- validation and loading of completed boards.

The board lab owns subjective content curation:

- settlement-opportunity analysis;
- duel fairness weights and thresholds;
- candidate search and ranking;
- calibration fixtures;
- batch results and visual reports.

The dependency is one-way:

```text
scripts/duel-board-lab -> game-core board facts and legality
game-core              -X-> duel-board-lab
```

If the lab needs a missing neutral fact such as settlement adjacency, expose the smallest pure board/topology primitive from `game-core`. Do not move duel fairness terminology, weights, thresholds, ranking, search, or reporting into the engine.

## Proposed Layout

```text
scripts/duel-board-lab/
  analysis/
    boardFacts.mjs
    settlementProduction.mjs
    resourceAccess.mjs
    opportunityDepth.mjs
    pickSensitivity.mjs
    openingRoutes.mjs
    orderSensitivityAudit.mjs
    evaluateDuelBoard.mjs
    duelFairV1Profile.mjs

  generators/
    officialSpiral.mjs
    freeformRandom.mjs

  reports/
    buildSummary.mjs
    renderBoard.mjs
    renderShortlist.mjs

  fixtures/
    scarce-but-fair.json
    wheat-monopoly.json
    dominant-settlement.json
    varied-openings.json
    first-pick-sensitive.json
    second-pick-sensitive.json

  __tests__/
  generate.mjs
  compare.mjs
  inspect.mjs
  benchmark.mjs

tmp/duel-board-lab/
  runs/<run-id>/
    manifest.json
    candidates.jsonl
    summary.json
    report.html
    boards/
```

Generated runs live under `tmp/` and remain uncommitted. Calibration fixtures and the versioned evaluator profile are source-controlled.

## Board Facts

The facts layer converts a completed board into a small immutable analysis model. It does not decide whether the board is fair.

For each settlement node, record:

- adjacent producing hexes;
- production pips per resource using the standard dice probability weights;
- total production pips;
- resource diversity;
- generic and specific port access;
- neighbouring node IDs blocked by the settlement-distance rule.

For the board, record:

- terrain, number, and port counts;
- red-number adjacency;
- legal settlement nodes and legal two-settlement pairs;
- total production per resource;
- coordinate and symmetry information used for canonical hashing.

The facts layer must be deterministic, side-effect free, and invariant under rotations and reflections except for node and coordinate identifiers.

## Meaning of Duel Fairness

The duel policy evaluates contestability rather than abundance.

For example, a board with low wheat may be fair when three independent settlement routes offer similar modest access. A board with more total wheat may be unfair when one settlement captures the only serious wheat production and blocks the remaining useful nodes.

The evaluator returns an explainable report:

```ts
type DuelFairnessReport = {
  evaluatorVersion: "duel-fair-v1";
  verdict: "pass" | "reject";
  rejectionReasons: string[];
  overallScore: number;
  metrics: {
    competitiveSpotDepth: CompetitiveSpotDepthMetrics;
    resourceContestability: ResourceContestabilityMetrics;
    openingRouteDepth: OpeningRouteDepthMetrics;
    pickSensitivity: PickSensitivityMetrics;
    orderSensitivityAudit: OrderSensitivityMetrics | null;
  };
};
```

### Competitive Spot Depth

Measure whether the board contains enough genuinely competitive settlement locations for four opening placements. Do not require equal locations. Penalise a large quality cliff between the strongest few options and the rest of the board.

Settlement quality is inspected through several transparent lenses rather than one universal strategy value:

- raw production;
- resource diversity;
- expansion access through wood and brick;
- growth and development access through wheat, ore, and sheep;
- port-adjusted access.

### Resource Contestability

For each resource, measure:

- total production as descriptive context;
- strongest and next-best access;
- the number of independent competitive access routes;
- how much useful access is concentrated in one settlement and its exclusion zone.

Low total production is not itself a penalty. Concentration that lets one early placement monopolise the useful supply is a penalty.

### Opening Route Depth

Enumerate legal two-settlement combinations and evaluate whether several distinct combinations support plausible openings. Count strategically different routes rather than duplicate pairs that depend on the same dominant node.

The evaluator should recognise expansion-oriented, growth/development-oriented, and flexible mixed openings without requiring every board to support every strategy equally.

### Pick Sensitivity

For each plausible strong early settlement:

1. remove that node and the neighbouring nodes it blocks;
2. recalculate competitive locations and resource access;
3. measure how sharply the remaining opportunity collapses.

This is a structural counterfactual, not a prediction of player behaviour. It directly detects boards where one first pick captures the only viable wheat, ore, or opening engine.

### Placement-Order Audit

Run a lightweight `P1, P2, P2, P1` audit over shortlisted boards and metric disagreements. It is diagnostic in `duel-fair-v1` and does not control the pass/reject verdict.

The audit exists to reveal cases where static metrics appear reasonable but the placement order still produces a suspicious opportunity split. It must not expand into full-game simulation or deep strategy search.

## Verdicts and Ranking

Use hard fairness gates before aggregate ranking:

```text
valid candidates
  -> reject recognisable setup violations
  -> reject monopolies, dominant spots, or insufficient opening depth
  -> rank surviving fair boards
```

Structural validation and recognisable setup rules, including standard counts and no adjacent `6`/`8` tokens, run before subjective fairness analysis.

Fairness gates prevent one excellent metric from compensating for a decisive defect elsewhere. For example, even resource totals cannot compensate for a single wheat monopoly.

Boards that pass are ordered by a versioned composite score made from normalised component penalties. The composite exists for top-ten and shortlist ordering; every component and rejection reason remains visible.

The concrete finite thresholds and weights are stored in `duelFairV1Profile.mjs`. They are selected through the calibration process below. The lab is not considered complete while the profile contains placeholders, infinite bounds, or unreviewed default values.

## Candidate Families

The first implementation generates two internal families.

### Official Spiral

- seed terrain, desert, and port assignments;
- use the canonical official number-token sequence;
- choose the spiral orientation from the seeded RNG;
- preserve standard counts and topology.

### Freeform Random

- seed terrain, number, desert, and port assignments;
- preserve standard counts and topology;
- allow the fairness gates to remove unsuitable layouts.

Both families use the same evaluator. Candidate family is analysis metadata, not a player-facing game mode.

Do not port the legacy balancing algorithm into the new lab. The new work may reuse neutral board data and topology, but its fairness model and generation pipeline are designed independently.

## Search Strategy

Start with generate-and-filter across large deterministic batches. Do not begin with simulated annealing or a mutation optimiser.

Only add bounded swap-based local search if measured results show either:

- too few candidates pass to create a diverse catalog; or
- top quality plateaus well below the human-reviewed fixtures.

Any later local search uses explicit bounded steps and deterministic mutations such as swapping terrain, numbers, desert position, or port assignments. It must report its extra cost and diversity impact against generate-and-filter.

## Candidate and Run Records

Every candidate receives stable provenance:

```ts
type CandidateRecord = {
  candidateIndex: number;
  seed: number;
  generatorFamily: "official-spiral" | "freeform-random";
  generatorVersion: string;
  evaluatorVersion: "duel-fair-v1";
  boardHash: string;
  canonicalSymmetryHash: string;
  verdict: "pass" | "reject" | "invalid";
  rejectionCodes: string[];
  overallScore: number | null;
  metrics: DuelFairnessReport["metrics"] | null;
};
```

The compact record is appended to `candidates.jsonl`. It does not contain a rendered board or a full duplicate of every tile object.

The run manifest records command arguments, seed range, family versions, evaluator version, start/end timestamps, completion status, counts, and benchmark data. Full board payloads are stored only for top, bottom, threshold, disagreement, outlier, and catalog-shortlist candidates.

Candidates can be regenerated during the run from family, version, and seed. Shortlisted boards store their full canonical payload so later generator changes cannot make the reviewed artifact disappear.

## Scale and Reporting

The evaluator operates on 19 hexes and roughly 54 settlement nodes. Precompute node facts and exclusion masks once per board. Avoid repeated coordinate stringification or full-board scans inside candidate loops.

The batch pipeline streams compact records:

```text
generate candidate
  -> compute facts
  -> apply evaluator
  -> append JSONL
  -> update bounded top, bottom, threshold, and outlier sets
```

Do not render every board. The HTML report contains aggregate distributions, rejection counts, family comparisons, and rendered selected boards. `inspect.mjs` regenerates and renders any candidate by run and candidate index.

Initial single-thread performance targets, excluding visual rendering, are:

- at least 500 boards per second for evaluation-only;
- at least 200 boards per second for generate-and-evaluate;
- bounded memory that remains below 256 MB for a 100,000-candidate streaming run.

`benchmark.mjs` records actual results on the development machine. Worker threads are deferred unless the first implementation misses the practical targets after straightforward profiling.

## Determinism, Resumption, and Failures

- Candidate count and seed ranges control work; wall-clock time never controls output.
- Every retryable generation operation has an explicit attempt limit.
- Invalid candidates produce an `invalid` row with a stable reason code rather than hanging or disappearing.
- The batch appends one complete JSON line at a time. A partial final line after interruption is detected and truncated before resumption.
- Resumption continues from the next completed candidate index and verifies the run's generator/evaluator versions before writing.
- Re-running the same completed range with the same versions produces identical board hashes, verdicts, and metrics.
- Reporting failures do not invalidate completed candidate data; reports can be rebuilt from the JSONL file.

## Calibration Process

Calibration is part of the first implementation, not a post-launch activity.

1. Create named fixtures for scarce-but-fair, single-resource monopoly, dominant settlement, varied openings, first-pick sensitivity, and second-pick sensitivity.
2. Verify that objective board facts are correct for every fixture.
3. Choose the initial finite gates and weights so the fixtures receive the intended verdicts and explanations.
4. Generate a broad deterministic corpus from both candidate families.
5. Review the top 20, bottom 20, threshold-near boards, metric disagreements, and placement-order warnings from each family.
6. Adjust and version the profile until rankings and explanations match human review.
7. Freeze `duel-fair-v1` and rerun its calibration corpus from clean output.

The profile is accepted only when it distinguishes scarcity from monopolisation and when selected top boards look recognisably fair without becoming repetitive or artificially uniform.

## Tests

Focused automated tests cover:

- standard pip weights and per-node production vectors;
- settlement exclusion masks and legal pair enumeration;
- resource contestability and opportunity-depth fixtures;
- scarcity alone not causing rejection;
- monopolizable scarcity causing rejection;
- pick-sensitivity counterfactuals;
- seeded generator determinism;
- board counts and structural validity for both families;
- rotation/reflection metric invariance;
- canonical symmetry deduplication;
- compact-record round trips and interrupted-run resumption;
- exact regeneration of shortlisted boards.

Performance measurement remains a benchmark command rather than a timing-sensitive CI assertion. CI verifies bounded candidate counts and deterministic output on a small fixture corpus.

## First Deliverable

The first deliverable can:

```text
generate 100,000 seeded candidates
compare official-spiral and freeform families
show pass/rejection rates and metric distributions
list top, bottom, threshold, disagreement, and outlier boards
inspect and render any selected candidate
reproduce a completed run from its manifest
```

It produces evidence for a later production-catalog design. Live board selection, match metadata, catalog storage, replay integration, removal of the legacy generator, and upstream-license cleanup are separate follow-up work after the evaluator is approved.

## Acceptance Criteria

- The lab is isolated under `scripts/duel-board-lab` and depends on `game-core` only for raw board facts and legality.
- `game-core` contains no duel fairness profile, ranking, search, reporting, or catalog-curation logic.
- Both candidate families produce structurally valid boards from deterministic seeds.
- The evaluator emits named metrics, stable rejection codes, a verdict, and a sortable score.
- Calibration fixtures demonstrate that scarcity is permitted and monopolizable scarcity is rejected.
- Human review approves the top, bottom, threshold, disagreement, and order-audit samples from both families.
- A clean 100,000-candidate run streams compact records, remains resumable, and meets the stated memory target.
- Benchmark results are recorded for evaluation-only and full generate-and-evaluate paths.
- No production match, lobby, or board-generation behaviour changes in this slice.
