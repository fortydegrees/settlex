# Duel Fair v2 Opening Evaluator

## Status

This design is the human-review successor to the evaluator portion of
`duel-fair-v1`. It keeps the existing board facts, deterministic generators,
streaming run storage, and `game-core` ownership boundary. It does not change
production board generation or live match setup.

## Objective

Evaluate whether a standard 1v1 board produces a fair, viable, and
skill-rewarding opening placement game under the actual order:

```text
P1 -> P2 -> P2 -> P1
```

The evaluator must distinguish raw production from useful production. For
example, wood without brick is weak road access, wheat and sheep without ore
do not form a development-card engine, and cards received from the second
settlement can create immediate tempo.

The evaluator remains a narrow opening solver, not a Catan bot. It understands
the placement draft and basic build costs but does not simulate the subsequent
game.

## Why v1 Is Insufficient

`duel-fair-v1` correctly established deterministic facts, resource-access
metrics, legal settlement pairs, explainable reports, and large streamed
calibration runs. Its fairness interpretation has four material blind spots:

1. Individual production is valued more strongly than complete portfolio
   viability.
2. Strong settlement pairs are counted when they exist on the board, without
   proving either seat can obtain them through the snake draft.
3. Resource access is measured in isolation. Two vertices touching the same
   strong ore hex can appear equally contestable even when one vertex is a
   premium three-hex location and the other is a weak coastal location.
4. The cards granted by each player's second settlement are omitted.

Seed 47 demonstrates all four issues. It receives a score of 99.55 even though
the v1 greedy line gives P1 all five resources and a road-ready starting hand,
while P2 receives brick, sheep, and wheat production with no wood or ore.

## Scope

This design targets:

- two-player duel rules;
- standard 19-land-hex topology and standard tile counts;
- placement order `P1, P2, P2, P1`;
- the exact resources granted by the third and fourth global settlements;
- player trading disabled;
- bank and port trading available under the duel ruleset;
- deterministic offline generation and calibration.

## Non-Goals

`duel-fair-v2` does not:

- simulate dice rolls or complete turns;
- predict robber placement, trading behaviour, development-card draws, road
  races, army races, or final win probability;
- introduce a learned model or online weight updates;
- claim mathematically proven balance;
- add a production board catalog or player-facing setting;
- add a new generator family in the same implementation slice;
- replace the official-spiral or freeform candidate generators;
- change `game-core` ownership or place fairness policy in the engine;
- define multiplayer fairness for three- or four-player games.

## Design Principles

### Scarcity Is Not Unfairness

A board may have scarce ore, clustered brick, unusually strong sheep, or a
single premium resource hex. It is unfair only when the placement draft gives
one seat uncompensated access to materially greater opening power.

Resource abundance, clumping, and scarcity are therefore descriptive features
and tags, not automatic rejection reasons.

### Fairness Assumes Competent Placement

Fairness is measured under planned opening play rather than four greedy
individual picks. A player may rationally decline the highest-production node
to deny an opponent's stronger complete portfolio.

The evaluator separately reports how strongly the board rewards this planning.
It does not confuse a strategically deep board with an intrinsically unfair
one.

### Stable Features, Tunable Policy

Rule-derived facts and features remain stable where possible. Subjective
weights, thresholds, and tolerances live in a versioned policy object.

Future high-quality match data may tune policy values without changing feature
extraction. Discovering a missing concept requires a new feature version rather
than pretending existing weights can represent it.

### Explainability Before Compression

The evaluator exposes opening lines, production vectors, starting hands,
recipe capacities, seat advantage, and placement-depth diagnostics. A single
sortable score is derived only after those outputs exist.

## Ownership Boundary

The existing dependency remains one-way:

```text
scripts/duel-board-lab -> game-core topology, rules, costs, and neutral facts
game-core              -X-> fairness weights, verdicts, ranking, and reports
```

`game-core` continues to own the authoritative rule that only the second
settlement grants adjacent non-desert resource cards. The lab derives the
starting hand from immutable board facts using that rule; it does not mutate a
game state to evaluate a board.

## Architecture

The v2 evaluation flow is:

```text
completed board
  -> immutable board facts
  -> structural screen
  -> settlement and portfolio features
  -> P1/P2/P2/P1 opening solver
  -> fairness result
  -> board-quality result
  -> placement-depth result
  -> versioned ranking policy
  -> calibration report
```

The implementation should keep these units separate:

```text
analysis/
  startingResources.mjs
  recipeCapacity.mjs
  openingPortfolio.mjs
  openingPolicy.mjs
  openingDraftSolver.mjs
  placementDepth.mjs
  evaluateDuelBoardV2.mjs
  duelFairV2Profile.mjs
```

Names may change during the implementation plan if an existing module is the
clear owner, but the boundaries must remain explicit.

## Structural Screen

The screen performs inexpensive checks before the opening solver:

- valid standard counts and topology;
- no adjacent `6` and `8` tokens in the default fair-board profile;
- enough legal settlements to complete the opening draft;
- finite feature values and complete port topology;
- optional coarse warnings for extreme production cliffs.

Only invalid topology and impossible setup are universal hard failures.
Adjacent red numbers are a default-profile guardrail, not a permanent claim
that every such board is strategically bad. A later experimental profile may
allow them without changing feature extraction.

Resource clumping, uneven resource totals, and awkward global distributions do
not fail the structural screen.

## Opening Portfolio Features

An opening portfolio is the ordered pair of settlements owned by one player.
Order matters because only the second settlement grants starting cards.

```ts
type OpeningPortfolio = {
  settlementNodeIds: [number, number];
  productionPips: Record<Resource, number>;
  totalProductionPips: number;
  producedResourceCount: number;
  missingProducedResources: Resource[];
  startingCards: Resource[];
  ownedPorts: PortType[];
  directRecipeCapacity: RecipeCapacity;
  tradeAdjustedRecipeCapacity: RecipeCapacity;
  startingReadiness: StartingReadiness;
  policyFeatures: Record<string, number>;
};
```

### Production

Production uses the existing dice-dot weights per resource. Preserve the full
five-resource vector. Do not replace it with resource-specific scalar weights
before recipe and starting-hand features are derived.

### Direct Recipe Capacity

For recipe costs `cost[r]` and production pips `pips[r]`, direct capacity is:

```text
min(pips[r] / cost[r]) for every resource required by the recipe
```

The v2 recipes are:

```text
road        = 1 wood, 1 brick
settlement  = 1 wood, 1 brick, 1 sheep, 1 wheat
dev card    = 1 sheep, 1 wheat, 1 ore
city        = 2 wheat, 3 ore
```

This deliberately treats a missing complement as a zero direct capacity. High
brick with zero wood cannot masquerade as strong road production.

Retain both the bottleneck capacity and the non-bottleneck surplus as separate
features. Surplus may become valuable through ports or later policy tuning; it
must not silently compensate for a zero bottleneck in the direct value.

### Trade-Adjusted Recipe Capacity

Compute a second capacity using the player's owned opening ports and bank trade
rates. It is the maximum fractional number of recipes supportable by the
production vector when unused production may be exported at:

- `4:1` without a port;
- `3:1` with a generic port;
- `2:1` for a matching specific port.

This is a deterministic small optimisation over five resources. It must not
include ports that are merely nearby or potentially reachable later.

For a proposed fractional capacity `x`, first reserve `x * cost[r]` of every
required resource. For each resource, define:

```text
surplus[r] = max(pips[r] - x * cost[r], 0)
deficit[r] = max(x * cost[r] - pips[r], 0)
rate[r]    = 2 with that resource's specific port,
             otherwise 3 with a generic port,
             otherwise 4
```

The proposed capacity is feasible when:

```text
sum(surplus[r] / rate[r]) >= sum(deficit[r])
```

The trade-adjusted capacity is the greatest feasible `x`, calculated with a
deterministic bounded numeric search and a profile-owned precision. Imported
cards cannot be re-exported. This definition permits ordinary bank conversion
without modelling turn order, hand limits, or speculative future ports.

Direct and trade-adjusted capacities remain separate features so policy tuning
cannot hide a port-dependent opening behind the same number as direct access.

### Starting Resources and Tempo

Starting cards are the multiset of non-desert resources adjacent to the
player's second settlement. Duplicate adjacent resources grant duplicate
cards.

For each recipe, record:

- whether it can be purchased immediately;
- the number of missing cards;
- the missing resource multiset;
- cards remaining after the purchase, if immediately available.

Do not assign the final value of an immediate road, settlement, dev card, or
city in feature extraction. Those bonuses belong to the versioned policy.

### Geography

V2 records owned opening ports and legal unoccupied expansion nodes reachable
from each starting settlement through one and two road edges. Reachability is a
descriptive feature; the evaluator does not simulate road placement choices or
opponent road blocking after setup.

## Tunable Opening Policy

The policy maps an `OpeningPortfolio` feature vector to a scalar opening value
for search and ranking. Its initial parameters are source-controlled and
finite.

The policy includes weights or thresholds for:

- total production;
- direct road, settlement, dev-card, and city capacity;
- trade-adjusted capacity;
- produced-resource coverage;
- missing-resource penalties;
- immediate-purchase readiness;
- owned ports;
- one- and two-road expansion depth;
- production concentration and surplus.

The official v2 policy is the only lens that controls the initial verdict.
Additional expansion-leaning and development-leaning lenses use the same
features with different parameter values and are diagnostic. They reveal
style-dependent or uncertain boards without creating separate board modes.

Each report records:

```ts
type EvaluatorIdentity = {
  featureVersion: "duel-opening-features-v1";
  policyVersion: "duel-fair-v2";
  profileHash: string;
};
```

Changing only policy parameters changes `profileHash` and, when accepted as a
new durable policy, increments the policy version. Adding or changing a feature
increments `featureVersion`.

## Opening Draft Solver

The solver performs deterministic backward induction over:

```text
P1 chooses first settlement
P2 chooses first settlement
P2 chooses second settlement and receives starting cards
P1 chooses second settlement and receives starting cards
```

At terminal sequences, construct both ordered portfolios and calculate:

```text
seatAdvantage = value(P1 portfolio) - value(P2 portfolio)
```

P1 maximises seat advantage and P2 minimises it. This models both self-interest
and denial without inventing a turn-by-turn bot strategy.

All distance-rule exclusions are applied after every pick. Node-ID ordering is
the final deterministic tie-breaker.

### Search Tiers

The correct solver accepts all legal nodes. Batch orchestration may use two
tiers to preserve corpus throughput:

1. Run structural and static feature screening over every generated board.
2. Run the opening solver over every board eligible for a final catalog or
   human shortlist.

A board without a completed v2 draft audit cannot receive a final v2 pass. It
may retain a `screen-pass` status for later audit.

Optimisation may precompute legal pairs, exclusion masks, ordered response
lists, and terminal portfolio features. It must not change the selected line or
verdict. Any future beam or candidate-node approximation must report itself as
approximate and cannot silently replace the exact solver.

## Evaluator Outputs

V2 returns three separate results.

### Fairness

```ts
type FairnessResult = {
  verdict: "pass" | "reject" | "review";
  favouredSeat: "P1" | "P2" | null;
  seatAdvantage: number;
  normalisedSeatAdvantage: number;
  solvedLine: PlacementPick[];
  rejectionCodes: string[];
  diagnosticLensResults: LensResult[];
};
```

The official policy controls `seatAdvantage`. Hard rejection occurs when the
normalised advantage exceeds the calibrated v2 threshold or when one terminal
portfolio materially dominates the other across production viability,
starting tempo, and recipe capacity.

`review` is used when:

- diagnostic lenses strongly disagree about the favoured seat;
- only one narrow defensive first move avoids a rejection-sized disadvantage;
- the board depends materially on port-adjusted rather than direct capacity;
- a solver approximation was explicitly requested for exploratory reporting.

Only exact-audit `pass` boards are eligible for an automatic catalog.

### Board Quality

Board quality describes whether the solved opening gives both players a
functional game rather than merely equally poor production.

It records:

- the weaker portfolio's official value;
- the weaker portfolio's viable recipe count;
- total and direct production for both players;
- whether either player has no credible direct road, settlement, dev-card, or
  city path;
- whether the board is materially dependent on bank or port conversion;
- descriptive scarcity and strategy-shape tags.

Quality is not allowed to reverse an unfairness rejection. It ranks and tags
boards that already pass or require review.

### Placement Depth

Placement depth measures whether planning and game knowledge matter during
setup. It records:

- `greedyRegret`: the difference between the solved outcome and four greedy
  individual picks;
- `meaningfulFirstPickCount`: P1 first moves within the policy tolerance of the
  solved result;
- `meaningfulResponseCount`: P2 response pairs within tolerance of the best
  response;
- `forcedDefence`: whether only one P1 first move prevents a rejection-sized
  disadvantage;
- `lineSensitivity`: the outcome swing caused by the strongest plausible
  alternative line.

Placement depth is descriptive in the first v2 policy. It may rank fair boards
but does not rescue an unfair board. A high-regret, single-answer board is
tagged as `knife-edge`; a board with multiple consequential competitive lines
may be tagged `strategic`.

## Ranking and Tags

Do not collapse every property into one opaque notion of balance.

The final report exposes:

```ts
type DuelBoardV2Report = {
  evaluatorIdentity: EvaluatorIdentity;
  screenVerdict: "pass" | "reject";
  fairness: FairnessResult | null;
  quality: BoardQualityResult | null;
  placementDepth: PlacementDepthResult | null;
  tags: string[];
  overallScore: number | null;
};
```

Possible descriptive tags include:

- `ore-scarce`, `brick-scarce`, or another resource scarcity tag;
- `resource-clustered`;
- `port-dependent`;
- `expansion-leaning`;
- `development-leaning`;
- `strategic`;
- `knife-edge`;
- `low-counterplay`;
- `starting-tempo-asymmetry`.

`overallScore` orders exact-audit fair boards. It is composed from fairness
margin, weaker-player quality, and placement depth using visible policy
weights. It is `null` for unaudited screen passes and rejected invalid boards.

## Hard Rules and Profiles

The default v2 fair-board profile initially keeps:

- standard tile and number counts;
- valid port counts and topology;
- no adjacent red-number tokens;
- exact settlement-distance legality;
- a maximum calibrated seat-advantage threshold.

It does not hard-reject:

- adjacent equal resources;
- globally scarce resources;
- unequal resource pip totals;
- high-production awkward portfolios;
- asymmetric expansion and development opportunities.

Those properties are judged through the solved portfolios and exposed as tags.

## Calibration Fixtures

V2 adds complete board fixtures with durable generator provenance and stored
tiles.

### Official Spiral Seed 47

Expected classification: `reject` or an explicitly review-blocking P1
advantage during initial calibration; it must never rank as a top automatic
pass.

The report must expose the v1 greedy line:

```text
P1: Ore 9 / Sheep 10 / Wood 6
P2: Sheep 10 / Brick 8 / Wheat 5
P2: Wheat 9 / Brick 10 / Sheep 5
P1: Wood 3 / Brick 4 / Wheat 6
```

and show that P1 receives all five produced resources plus a road-ready
starting hand, while P2's obvious denial pair has no wood or ore.

The solver must also inspect P2's credible compensating alternatives rather
than freezing the greedy line as truth.

### Official Spiral Seed 2604

Expected initial classification: `review` until human calibration decides the
seat advantage.

The solver must be capable of preferring the defensive P1 opening at Brick 11 /
Sheep 6 / Wood 5 over the superficially stronger Ore 5 / Sheep 10 / Wheat 9
node. The report must show P2's ore/sheep/wheat starting hand and immediate
development-card readiness in the discussed response line.

This fixture proves that planning and denial can make a board interesting even
when the highest-production individual settlement is a trap.

### Existing Synthetic Fixtures

Retain and extend the existing scarcity, monopoly, dominant-spot, varied-route,
and pick-sensitivity fixtures. Add fixtures for:

- equal total production with one dead portfolio;
- compensated single-resource scarcity;
- starting-road asymmetry;
- starting-development-card asymmetry;
- port-dependent viability;
- a fair strategic board with multiple competitive lines;
- a knife-edge board with one defensive first move.

Fixture expectations assert the complete report contract, not only one score or
ratio.

## Calibration and Future Match Data

Initial parameters are calibrated through named fixtures and human review of
top, bottom, threshold, disagreement, and unusual boards.

Future high-level match data may estimate:

- value of immediate road or development-card readiness;
- penalties for missing production resources;
- practical value of direct versus port-adjusted recipe capacity;
- value of one- and two-road expansion access;
- observed seat advantage after controlling for player strength.

Parameter fitting is offline and reproducible. Accepted parameters are checked
in as a versioned profile with their dataset provenance and validation report.
The production evaluator never learns or changes weights online.

Raw win rate is not treated as board fairness. Analysis must control for player
rating, seat, ruleset version, board version, and opening placements. Placement
choice data and game outcomes are distinct signals. Because observational data
does not reveal unchosen counterfactual lines, fixture review and deterministic
solver analysis remain necessary.

## Reporting

Every rendered v2 calibration board shows:

- geographically positioned ports rather than a text-only port legend;
- the solved four-pick sequence with P1/P2 labels;
- both combined production vectors;
- both starting hands;
- immediate purchases and missing recipe resources;
- direct and trade-adjusted recipe capacities;
- official and diagnostic-lens seat advantages;
- fairness, quality, placement-depth outputs, and tags;
- alternative opening lines when they materially change the diagnosis.

The report remains an offline lab artifact. Reusing the existing static 2D
Catana poster or themed assets is presentation work inside the report boundary;
the full live 3D game renderer is not a dependency of the evaluator.

## Failures and Determinism

- Invalid topology or counts return stable structural rejection codes.
- A board with no legal complete placement sequence is invalid.
- Non-finite feature or policy values fail evaluation with a stable code.
- A screen pass without a completed exact draft audit cannot become a final
  pass.
- Search ties resolve deterministically by node IDs and then ordered sequence.
- Rotation and reflection may change node IDs but must preserve scalar metrics,
  verdicts, tags, and equivalent transformed placement lines.
- Candidate records store feature version, policy version, and profile hash.
- Re-running a board under the same identities reproduces the complete report.

## Tests

Implementation follows test-driven slices. Focused tests cover:

- exact second-settlement starting-card multisets;
- zero direct road capacity for wood without brick and vice versa;
- zero direct dev capacity when sheep, wheat, or ore is absent;
- recipe-cost normalisation for cities;
- generic and specific port conversion capacity;
- ordered portfolio construction;
- distance-rule exclusions after every draft pick;
- backward-induction denial choices;
- a lower raw-production first pick winning through planning;
- deterministic tie-breaking;
- separate fairness, quality, and placement-depth contracts;
- screen-pass boards being ineligible without exact audit;
- full expected reports for seed 47, seed 2604, and synthetic fixtures;
- rotation/reflection equivalence;
- feature-version and profile-hash provenance;
- streamed record and report compatibility.

Benchmarks measure static screening and exact draft evaluation separately. CI
uses bounded fixture batches and does not assert wall-clock timing.

## Delivery Sequence

The implementation plan should preserve reviewable slices:

1. Starting-card and recipe-capacity features.
2. Ordered opening portfolios and tunable policy contract.
3. Exact draft solver with deterministic backward induction.
4. Fairness, quality, and placement-depth outputs.
5. Seed 47 and seed 2604 calibration fixtures.
6. V2 record, CLI, and report integration.
7. Benchmarks and a bounded human-review corpus.
8. Human calibration gate before any large final evidence run.

A Settlers Setup-inspired candidate generator is a separate design after the
v2 evaluator can distinguish the calibration boards. Production catalog and
match integration remain later work.

## Acceptance Criteria

- The evaluator models the exact `P1, P2, P2, P1` placement sequence.
- Starting resources come only from each player's second settlement.
- Missing complementary resources materially reduce direct build capacity.
- The evaluator can choose a planned denial pick over a greedy production pick.
- Seed 47 cannot appear as a top automatic fair-board pass.
- Seed 2604 surfaces the discussed defensive line and starting-development-card
  tempo for human review.
- Fairness, board quality, and placement depth remain separate outputs.
- Resource scarcity and clumping are not automatic fairness failures.
- Only structurally valid, exact-audit fair boards receive a final sortable
  score.
- Features and policy parameters have separate reproducible versions.
- Calibration reports show geographic ports, placements, portfolios, starting
  cards, recipe viability, and verdict explanations.
- The work remains offline under `scripts/duel-board-lab` and does not change
  live game behaviour.
