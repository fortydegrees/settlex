# Duel Fair v3 Fast Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duel-board lab's slow, production-only ranking path with a deterministic `duel-fair-v3` evaluator that ranks every structurally valid 1v1 board by fairness and playable quality at at least 100 full generate-and-evaluate boards per second on the current development Mac.

**Architecture:** Keep all opinionated fairness policy in `scripts/duel-board-lab`, outside `game-core`. Build immutable board context and settlement features once, select a strategically covered 16-node candidate pool, solve only the bounded P1 → P2 → P2 → P1 opening draft over that pool, and reduce the result to `overall`, `fairness`, `quality`, and separately sortable `interest` scores. Use the same v3 policy with all 54 nodes only in a fixed 12-board calibration command; never run exact search in normal generation or report rendering.

**Tech Stack:** Node.js ES modules, existing `@settlex/game-core` topology primitives, Vitest, existing streaming JSON run store, self-contained HTML/SVG reports, pnpm.

## Global Constraints

- Work only in `/Users/david/coding/settlex/.worktrees/duel-fair-board-lab` on `codex/duel-fair-board-lab`.
- Read `docs/superpowers/specs/2026-07-13-duel-fair-v3-fast-ranking-design.md` before Task 1. Treat it as authoritative when this plan is silent.
- Keep `game-core` unchanged. It remains the raw deterministic Catan engine; duel fairness is product/lab policy.
- Use test-driven development for every shared helper, solver, evaluator, and run-store change: add the focused failing test, observe the expected failure, implement the smallest passing code, rerun the focused test.
- Do not add dependencies or alter build tooling.
- Do not use `Math.random`, wall-clock values, or object insertion order for evaluator decisions. Finish every comparison with stable node-id or candidate-index tie-breakers.
- Do not run a 100,000-board corpus in this slice. Task 5 is a hard gate: stop and refine the scorer if either the oracle calibration targets or 100 boards/sec target fails.
- Keep v1/v2 modules available as explicitly named historical research paths. `duel-fair-v3` becomes the default for generation, inspection, and the primary report.
- A structurally valid board always receives four numeric scores. Only malformed, non-standard, or legally impossible boards use `status: "invalid"`.
- The primary report performs no solving. It only reads stored diagnostics and renders one deduplicated, explicitly sorted gallery.
- Update `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` after the meaningful implementation changes are verified.

---

## Task 1: Define the v3 policy and immutable board context

**Files:**

- Create: `scripts/duel-board-lab/analysis/duelFairV3Profile.mjs`
- Create: `scripts/duel-board-lab/analysis/boardContextV3.mjs`
- Create: `scripts/duel-board-lab/__tests__/boardContextV3.test.js`
- Modify: `scripts/duel-board-lab/constants.mjs`

- [ ] **Step 1: Add a failing profile/context test**

Create `boardContextV3.test.js` with these assertions:

```js
import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { buildBoardContextV3, validateDuelBoardStructureV3 } from "../analysis/boardContextV3.mjs";
import { DUEL_FAIR_V3_PROFILE } from "../analysis/duelFairV3Profile.mjs";
import { BOARD_FAMILIES } from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";

describe("duel-fair-v3 board context", () => {
  it("makes scarce resources more valuable without exceeding the configured clamp", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 }).tiles;
    const context = buildBoardContextV3(buildBoardFacts(tiles), DUEL_FAIR_V3_PROFILE);
    const values = Object.values(context.byResource).map((entry) => entry.scarcityMultiplier);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.8);
    expect(Math.max(...values)).toBeLessThanOrEqual(1.25);
    expect(context.byResource[ResourceType.ORE].tilePips).toBeGreaterThan(0);
  });

  it("reports structural failures but does not reject strategically unusual valid boards", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 }).tiles;
    const facts = buildBoardFacts(tiles);
    expect(validateDuelBoardStructureV3(facts)).toEqual([]);
    expect(validateDuelBoardStructureV3({ ...facts, legalPairs: [] })).toContain("no-legal-opening-draft");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the v3 modules do not exist**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/boardContextV3.test.js
```

Expected: FAIL with `Cannot find module '../analysis/boardContextV3.mjs'`.

- [ ] **Step 3: Add the single source-controlled policy object**

Create `duelFairV3Profile.mjs`. Export one deeply frozen object with these exact initial values:

```js
import { ResourceType } from "@settlex/game-core";

const freezeRecord = (value) => Object.freeze({ ...value });

export const DUEL_FAIR_V3_PROFILE = Object.freeze({
  id: "duel-fair-v3",
  version: 3,
  featureVersion: "duel-fair-v3-features-1",
  policyVersion: "duel-fair-v3",
  candidateLimit: 16,
  fallbackCandidateLimit: 20,
  nearOptimalTolerance: 0.05,
  fairnessAdvantageLimit: 0.20,
  responseRegretLimit: 0.15,
  choiceDepthTarget: 4,
  tradeAdjustedRecipeDiscount: 0.85,
  serializationPrecision: 6,
  tiePrecision: 1e-12,
  contextRules: freezeRecord({
    viableAccessMinimumPips: 2,
    viableAccessBestRatio: 0.60,
    accessRegionMaximumDistance: 2
  }),
  settlementRules: freezeRecord({
    geometricMeanOffset: 0.50,
    denialProductionCap: 1.50,
    routeRedundancyCap: 3
  }),
  candidateBroadWeights: freezeRecord({
    production: 0.55,
    recipeOpportunity: 0.20,
    city: 0.10,
    expansion: 0.10,
    port: 0.05
  }),
  resourceWeights: freezeRecord({
    [ResourceType.WOOD]: 1.00,
    [ResourceType.BRICK]: 1.00,
    [ResourceType.SHEEP]: 0.90,
    [ResourceType.WHEAT]: 1.15,
    [ResourceType.ORE]: 1.10
  }),
  scarcity: freezeRecord({ minimum: 0.80, maximum: 1.25 }),
  portfolioWeights: freezeRecord({
    production: 0.30,
    recipeReadiness: 0.25,
    scarcityAccess: 0.10,
    startingTempo: 0.10,
    tradeAndPorts: 0.05,
    cityPotential: 0.05,
    expansion: 0.10,
    resilience: 0.05
  }),
  recipeWeights: freezeRecord({ road: 0.15, settlement: 0.30, dev: 0.25, city: 0.30 }),
  componentTargets: freezeRecord({
    weightedProduction: 25,
    scarcityAccess: 10,
    tradeCapacityGain: 1.25,
    cityUplift: 12,
    expansionGain: 10,
    robberLoss: 8
  }),
  recipeCapacityTargets: freezeRecord({ road: 2, settlement: 1.5, dev: 1.25, city: 0.8 }),
  overallWeights: freezeRecord({ fairness: 0.80, quality: 0.20 }),
  qualityWeights: freezeRecord({ weakerPortfolio: 0.80, meanPortfolio: 0.20 }),
  interestWeights: freezeRecord({ choiceDepth: 0.50, responseFreedom: 0.50 }),
  tagThresholds: freezeRecord({
    scarcity: 1.15,
    concentration: 0.70,
    portRelianceGap: 20,
    robberFragile: 35,
    forcedResponse: 25
  })
});
```

Later modules must read these values from the profile, including context grouping, geometric-mean offsets, candidate broad weights, trade discount, choice-depth target, tie precision, serialization precision, and tag thresholds. The formulas below show the initial values for readability; do not duplicate them as independent constants.

In `constants.mjs`, add `V3: "duel-fair-v3"` to `EVALUATOR_VERSIONS`, make `EVALUATOR_VERSION` point to V3, and export a `DUEL_FAIR_V3_IDENTITY` with `featureVersion`, `policyVersion`, and a SHA-256 `profileHash`. Add a deterministic `hashDuelFairV3Profile` helper that recursively sorts object keys before `JSON.stringify`; do not rely on incidental insertion order. Do not delete v1/v2 identities.

- [ ] **Step 4: Build resource scarcity and structural context from board facts**

Create `boardContextV3.mjs` with:

```js
import { getNumDots, TileTypes } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function hasCompletePortTopology(facts) {
  const portNodes = facts.nodes.filter((node) => node.port !== null);
  return portNodes.length === 18 && portNodes.every((node) => facts.topology.portsByNodeId[node.nodeId]);
}

function canCompleteOpeningDraft(facts) {
  for (const [p1a, p1b] of facts.legalPairs) {
    const p1Blocked = new Set([
      ...facts.nodes[p1a].blockedNodeIds,
      ...facts.nodes[p1b].blockedNodeIds
    ]);
    const p2Nodes = facts.nodes.filter((node) => !p1Blocked.has(node.nodeId));
    if (p2Nodes.some((left, index) => p2Nodes.slice(index + 1)
      .some((right) => !left.blockedNodeIds.includes(right.nodeId)))) return true;
  }
  return false;
}

export function validateDuelBoardStructureV3(facts) {
  const errors = [...facts.validityErrors];
  if (!hasCompletePortTopology(facts)) errors.push("port-topology");
  if (facts.legalPairs.length === 0 || !canCompleteOpeningDraft(facts)) errors.push("no-legal-opening-draft");
  return [...new Set(errors)].sort();
}

export function buildBoardContextV3(facts, profile) {
  const producingTiles = facts.tiles.filter((tile) =>
    tile.type === TileTypes.LAND &&
    STANDARD_RESOURCES.includes(tile.tile.resource) &&
    tile.tile.number !== null
  );
  const expectedPipsPerTile = producingTiles.reduce(
    (sum, tile) => sum + getNumDots(tile.tile.number), 0
  ) / producingTiles.length;
  const byResource = Object.fromEntries(STANDARD_RESOURCES.map((resource) => {
    const resourceTiles = producingTiles.filter((tile) => tile.tile.resource === resource);
    const tilePips = resourceTiles.reduce((sum, tile) => sum + getNumDots(tile.tile.number), 0);
    const pipsPerTile = tilePips / resourceTiles.length;
    const scarcityMultiplier = clamp(
      expectedPipsPerTile / pipsPerTile,
      profile.scarcity.minimum,
      profile.scarcity.maximum
    );
    const accessNodes = facts.nodes
      .filter((node) => node.resourcePips[resource] > 0)
      .sort((left, right) =>
        right.resourcePips[resource] - left.resourcePips[resource] || left.nodeId - right.nodeId
      );
    return [resource, Object.freeze({
      tileCount: resourceTiles.length,
      tilePips,
      pipsPerTile,
      scarcityMultiplier,
      bestNodeId: accessNodes[0]?.nodeId ?? null,
      bestNodePips: accessNodes[0]?.resourcePips[resource] ?? 0,
      secondIndependentNodeId,
      secondIndependentNodePips,
      accessRegionCount,
      concentration,
      independentAccessDistance,
      matchingPortNodeIds: Object.freeze(
        facts.nodes.filter((node) => node.port === resource).map((node) => node.nodeId)
      ),
      genericPortNodeIds
    })];
  }));
  return Object.freeze({
    expectedPipsPerTile,
    byResource: Object.freeze(byResource),
    structuralErrors: Object.freeze(validateDuelBoardStructureV3(facts))
  });
}
```

Use a `Map` from node id to node inside `canCompleteOpeningDraft`; do not rely on `facts.nodes[nodeId]` unless the existing topology explicitly guarantees dense ids. The code above describes the algorithm; the implementation must use safe node lookup.

Define the omitted access facts without a game-tree search:

- A viable access node has at least `max(2, 0.6 * bestNodePips)` pips of that resource.
- Two viable nodes belong to the same access region when their shortest distance in `topology.nodeNeighbors` is at most two edges; use union-find over the 54-node graph.
- Region production is the sum of unique touching resource-tile pips, so the six corners of one tile are not counted six times.
- `concentration` is the largest region production divided by total resource tile production, clamped to `[0,1]`.
- `secondIndependentNodeId` is the highest-pip viable node outside the best node's region; ties use node id. Its pips are zero and id is null if none exists.
- `independentAccessDistance` is the shortest graph distance from the best node to that second node, or null.
- `genericPortNodeIds` contains all nodes on a 3:1 port. Matching and generic arrays are sorted numerically.

- [ ] **Step 5: Run the focused test and the existing board-facts tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/boardContextV3.test.js scripts/duel-board-lab/__tests__/boardFacts.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add scripts/duel-board-lab/analysis/duelFairV3Profile.mjs scripts/duel-board-lab/analysis/boardContextV3.mjs scripts/duel-board-lab/__tests__/boardContextV3.test.js scripts/duel-board-lab/constants.mjs
git commit -m "feat: define duel fair v3 board context"
```

---

## Task 2: Score resource viability, starting tempo, expansion, and resilience

**Files:**

- Create: `scripts/duel-board-lab/analysis/settlementFeaturesV3.mjs`
- Create: `scripts/duel-board-lab/analysis/openingPortfolioV3.mjs`
- Create: `scripts/duel-board-lab/__tests__/openingPortfolioV3.test.js`
- Reuse: `scripts/duel-board-lab/analysis/openingPortfolio.mjs`
- Reuse: `scripts/duel-board-lab/analysis/recipeCapacity.mjs`

- [ ] **Step 1: Add failing portfolio tests around the user's concrete concerns**

The test must prove four policy properties without locking an entire board to one magic score:

```js
it("rewards complementary wood and brick over stranded wood", () => {
  expect(roadCapable.components.recipeReadiness).toBeGreaterThan(strandedWood.components.recipeReadiness);
});

it("values access to a resource more when that resource is scarce on the board", () => {
  expect(lowOreAccess.components.scarcityAccess).toBeGreaterThan(highOreAccess.components.scarcityAccess);
});

it("counts only the second settlement's adjacent resources as starting cards", () => {
  expect(report.portfolio.startingCards).toEqual(expectedSecondSettlementCards);
});

it("penalizes an opening whose only important production is easy to rob", () => {
  expect(diversified.components.resilience).toBeGreaterThan(singleTileDependency.components.resilience);
});

it("credits useful port conversion without erasing the direct shortage", () => {
  expect(withMatchingPort.components.tradeAndPorts).toBeGreaterThan(withoutPort.components.tradeAndPorts);
  expect(withMatchingPort.components.recipeReadiness).toBeLessThan(100);
});

it("conditions city uplift on city-resource capacity", () => {
  expect(cityCapable.components.cityPotential).toBeGreaterThan(highPipsWithoutCityResources.components.cityPotential);
});

it("rewards two independent expansion routes over one fragile route", () => {
  expect(redundantExpansion.components.expansion).toBeGreaterThan(singleRouteExpansion.components.expansion);
});
```

Use small frozen synthetic `facts` records for the first two comparisons and one real generated board for the starting-card assertion. Build synthetic records with the exact fields consumed by the scorer: `nodes`, `tiles`, `topology.nodeNeighbors`, and `topology.portsByNodeId`.

- [ ] **Step 2: Run the test and confirm the missing-module failure**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingPortfolioV3.test.js
```

Expected: FAIL because `openingPortfolioV3.mjs` does not exist.

- [ ] **Step 3: Precompute settlement-local features once per board**

Create `settlementFeaturesV3.mjs` exporting:

```js
export function buildSettlementFeaturesV3(facts, context, profile) {
  // Returns a frozen array sorted by nodeId. Each record includes:
  // nodeId, weightedProduction, scarcityWeightedProduction,
  // producedResourceCount, numberDiversity, portValue, cityUplift,
  // worstSingleTileLoss, bestOneRoadGain, secondOneRoadGain,
  // bestTwoRoadGain, secondTwoRoadGain, expansionRouteRedundancy,
  // roadLens, settlementLens, devLens, cityLens, expansionLens,
  // denialLens, resourceLens (one numeric entry per standard resource),
  // and producingTileContributions for robber-loss calculation.
}
```

Calculate the fields with these rules:

- `weightedProduction = Σ node.resourcePips[r] * profile.resourceWeights[r]`.
- `scarcityWeightedProduction = Σ node.resourcePips[r] * profile.resourceWeights[r] * context.byResource[r].scarcityMultiplier`.
- `resourceLens[r] = node.resourcePips[r] * context.byResource[r].scarcityMultiplier`.
- `roadLens = geometricMean(woodPips + 0.5, brickPips + 0.5) * scarcity-adjusted road resource mean`.
- `settlementLens = geometricMean(wood + 0.5, brick + 0.5, sheep + 0.5, wheat + 0.5)`.
- `devLens = geometricMean(sheep + 0.5, wheat + 0.5, ore + 0.5)`.
- `cityLens = geometricMean(wheat / 2 + 0.5, ore / 3 + 0.5)`.
- `cityUplift = scarcityWeightedProduction`; upgrading that node from settlement to city adds one more copy of its production.
- `numberDiversity` is the number of distinct non-7 roll numbers touching the node, and `producedResourceCount` is the number of standard resources with non-zero pips.
- `worstSingleTileLoss` is the maximum scarcity-weighted contribution among `producingTileContributions`.
- For one-road and two-road expansion, enumerate graph paths of exactly two and three edges respectively from the settlement. The first edge represents the free starting road; the labels therefore mean one or two *additional* roads. A destination must satisfy the settlement distance rule relative to the source. Record the best and second-best destination `scarcityWeightedProduction` gains for each depth.
- `expansionRouteRedundancy` is the maximum number of distinct first-edge routes reaching either of the top two two-road destinations, capped at three. This is arithmetic over the fixed graph, not a game simulation.
- Generic port value is the node's scarcity-weighted production divided by three. A matching 2:1 port uses half of the matching resource's scarcity-weighted pips. A non-matching port has zero local value but is still represented in the portfolio's trade calculation.
- `denialLens` is the sum of the two highest `scarcityWeightedProduction` values among blocked neighbouring nodes, capped at the current node's `scarcityWeightedProduction * 1.5` so denial cannot dominate production.
- `producingTileContributions` is an array of `{ tileId, resource, pips }` for every numbered resource tile touching the node. Sort by tile id.
- `expansionLens = bestOneRoadGain + 0.5 * secondOneRoadGain + 0.5 * bestTwoRoadGain + 0.25 * secondTwoRoadGain + 0.5 * expansionRouteRedundancy`.

Use `Math.sqrt`/`Math.pow` only; do not round intermediate values. Tie-break sorted features by node id.

- [ ] **Step 4: Score an ordered two-settlement opening on eight bounded components**

Create `openingPortfolioV3.mjs` around a compiled ordered-pair record. Normal draft search must never rebuild a portfolio at every terminal:

```js
export function compileOpeningPairV3({
  facts,
  context,
  featuresByNodeId,
  orderedNodeIds,
  profile
}) {
  const portfolio = buildOpeningPortfolio(facts, orderedNodeIds, {
    occupiedNodeIds: orderedNodeIds,
    precision: 6
  });
  const staticComponents = {
    production: scoreProduction(portfolio, context, profile),
    recipeReadiness: scoreRecipes(portfolio, profile),
    scarcityAccess: scoreScarcity(portfolio, context, profile),
    startingTempo: scoreStartingTempo(portfolio, profile),
    tradeAndPorts: scoreTradeGain(portfolio, profile),
    cityPotential: scoreCityPotential(portfolio, featuresByNodeId, profile),
    resilience: scoreRobberResilience(portfolio, orderedNodeIds, featuresByNodeId, profile)
  };
  const staticValue = Object.entries(staticComponents).reduce(
    (sum, [name, amount]) => sum + amount * profile.portfolioWeights[name],
    0
  );
  return Object.freeze({
    orderedNodeIds: Object.freeze([...orderedNodeIds]),
    portfolio,
    staticComponents: Object.freeze(staticComponents),
    staticValue,
    reachMasks: compileExpansionReachMasks(facts, orderedNodeIds)
  });
}

export function valueOpeningPairMatchupV3({
  entry,
  opponentEntry,
  occupiedMask,
  settlementBlockedMask,
  expansionCache,
  profile
}) {
  const expansion = scoreExpansionFromMasks({
    entry,
    opponentEntry,
    occupiedMask,
    settlementBlockedMask,
    expansionCache,
    profile
  });
  return entry.staticValue + expansion * profile.portfolioWeights.expansion;
}

export function materialiseOpeningPairV3(args) {
  // Rebuild only the selected terminal with all four occupied nodes and return
  // { portfolio, components, value }; assert it matches the compiled scalar.
}
```

Every component is clamped to `[0, 100]` from a source-controlled target:

- `production`: scarcity-adjusted weighted pips divided by `weightedProduction: 25`.
- `recipeReadiness`: for road, settlement, dev, and city, take `max(directRecipeCapacity, tradeAdjustedRecipeCapacity * 0.85)`, divide by that recipe's target, clamp, then apply `recipeWeights`.
- `scarcityAccess`: sum each produced resource's `min(resourcePips, context.bestNodePips) * (scarcityMultiplier - 0.8)` and divide by target 10. This adds value for meaningful scarce access but cannot replace base production.
- `startingTempo`: for each recipe, `1 - missingCardCount / recipeCardCount`, clamped to `[0,1]`, then apply `recipeWeights`. This uses only `portfolio.startingCards`, which already come solely from the second settlement.
- `tradeAndPorts`: weighted mean of `max(0, tradeAdjustedRecipeCapacity - directRecipeCapacity)` divided by target 1.25.
- `cityPotential`: maximum `cityUplift` of the two opening settlements, multiplied by `min(1, directRecipeCapacity.city / 0.8)`, divided by target 12.
- `expansion`: compile destination/transit bitmasks once per unordered pair, apply occupied and settlement-block masks at a leaf, then take the top two reachable destination `scarcityWeightedProduction` values, with the second worth 50%, and divide by target 10. Cache the resulting component by the two unordered pair ids. The existing expansion helper treats these as reachable legal settlement destinations after two road edges; preserve that meaning.
- `resilience`: build the opening's scarcity-weighted production by tile, remove each one tile in turn, and use `100 * (1 - worstLoss / robberLossTarget)`. Clamp to `[0,100]`. This is a dependency signal, not a full robber simulation.

Compile each legal ordered pair once. All components except expansion are static for that ordered pair; starting cards remain order-sensitive. The recursive solver reads scalar `staticValue` fields and an allocation-free cached expansion score. `materialiseOpeningPairV3` runs only twice after the selected line is known, so the report still contains complete P1/P2 portfolios and components without paying that cost at every leaf.

- [ ] **Step 5: Run the focused tests**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingPortfolioV3.test.js scripts/duel-board-lab/__tests__/openingPortfolio.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add scripts/duel-board-lab/analysis/settlementFeaturesV3.mjs scripts/duel-board-lab/analysis/openingPortfolioV3.mjs scripts/duel-board-lab/__tests__/openingPortfolioV3.test.js
git commit -m "feat: score viable duel opening portfolios"
```

---

## Task 3: Select a covered candidate pool and solve the bounded snake draft

**Files:**

- Create: `scripts/duel-board-lab/analysis/candidatePoolV3.mjs`
- Create: `scripts/duel-board-lab/analysis/openingDraftSolverV3.mjs`
- Create: `scripts/duel-board-lab/__tests__/candidatePoolV3.test.js`
- Create: `scripts/duel-board-lab/__tests__/openingDraftSolverV3.test.js`

- [ ] **Step 1: Add failing candidate-pool tests**

Assert:

- deterministic output for identical facts;
- no more than 16 nodes on a normal standard board;
- at least one champion for broad opportunity, road, settlement, city, dev, each of the five resources, port, expansion, and denial when the champions are distinct;
- a legal P1 → P2 → P2 → P1 draft can be completed from the pool;
- fallback adds the stable full-board legal line and never exceeds 20 nodes.

Use seed 47 and seed 2604 as real-board cases because they motivated the design.

- [ ] **Step 2: Run and observe the missing-module failure**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/candidatePoolV3.test.js
```

Expected: FAIL because `candidatePoolV3.mjs` does not exist.

- [ ] **Step 3: Implement deterministic lens coverage and legal-draft fallback**

Create `candidatePoolV3.mjs` with this public interface:

```js
export const V3_LENS_ORDER = Object.freeze([
  "broad", "road", "settlement", "city", "dev",
  "resource:wood", "resource:brick", "resource:sheep",
  "resource:wheat", "resource:ore", "port", "expansion", "denial"
]);

export function selectCandidatePoolV3({ facts, settlementFeatures, profile }) {
  // Return { nodeIds, championsByLens, fallbackUsed, fallbackLine }.
}
```

For each lens, sort all nodes by that lens descending, then `nodeId` ascending, and take the first node not yet included. After lens champions, fill to 16 using `broad = 0.55 * scarcityWeightedProduction + 0.20 * recipeOpportunity + 0.10 * cityLens + 0.10 * expansionLens + 0.05 * portValue`, with each input normalized against the best node on that board. This normalization is only for candidate coverage, not the final board score.

Validate that the pool contains a complete legal draft. If it does not, scan all 54 nodes in ascending node-id order with nested P1a/P2a/P2b/P1b loops and return the first legal line. Add missing line nodes to the pool. Throw `candidate-pool-cannot-complete-draft` if the result exceeds 20 or no full-board line exists. Sort the final node ids ascending; preserve lens selections separately for diagnostics.

- [ ] **Step 4: Add failing minimax tests with an injected cheap leaf evaluator**

Test a six-node synthetic graph where the unique expected line demonstrates:

- P1 maximizes seat advantage at picks 1 and 4;
- P2 minimizes seat advantage at picks 2 and 3;
- distance-rule blocks are applied immediately;
- stable node-id tie breaking;
- `rawSequenceCount` is bounded by 43,680 for a 16-node complete graph and 116,280 for a 20-node complete graph.

The conservative count formula is the four-permutation `n * (n - 1) * (n - 2) * (n - 3)` before distance-rule pruning. The actual legal count is smaller because each settlement immediately blocks adjacent nodes. Report both `rawSequenceCount` and `legalSequenceCount`; assert the conservative bound, not equality.

- [ ] **Step 5: Implement one solver used by both fast and exact modes**

Create `openingDraftSolverV3.mjs`:

```js
export function solveOpeningDraftV3({
  facts,
  context,
  featuresByNodeId,
  profile,
  candidateNodeIds
}) {
  // candidateNodeIds is the 16-20 node fast pool in normal use and all 54
  // land nodes only in the calibration command.
}
```

Before recursion, build:

- dense node-id bit and blocked-mask lookups;
- ordered-pair entries only for legal pairs whose nodes are in `candidateNodeIds`;
- stable integer unordered-pair ids;
- a `Float64Array` expansion cache indexed by the two unordered pair ids, initialized to `NaN`.

Enumerate legal P1a → P2a → P2b → P1b placements recursively. At each leaf perform scalar, allocation-free lookups:

```js
const p1Entry = pairIndex[p1a][p1b];
const p2Entry = pairIndex[p2a][p2b];
const p1Value = valueOpeningPairMatchupV3({
  entry: p1Entry, opponentEntry: p2Entry,
  occupiedMask, settlementBlockedMask, expansionCache, profile
});
const p2Value = valueOpeningPairMatchupV3({
  entry: p2Entry, opponentEntry: p1Entry,
  occupiedMask, settlementBlockedMask, expansionCache, profile
});
const normalizedAdvantage = (p1Value - p2Value) / Math.max(
  Math.abs(p1Value),
  Math.abs(p2Value),
  1
);
```

Choose leaves with nested minimax: P1's two decisions maximize raw `seatAdvantage = p1Value - p2Value`; P2's two decisions minimize it. Carry `normalizedAdvantage` alongside it for fairness and choice diagnostics. Use lexicographic `[p1a,p2a,p2b,p1b]` ascending tie-breaks after comparing seat advantages within `1e-12`.

After minimax selects a line, call `materialiseOpeningPairV3` for P1 and P2 only, and assert each materialized value agrees with its selected scalar within `1e-9`. Return:

```js
{
  selectedLine,
  p1,
  p2,
  normalizedAdvantage,
  rawSequenceCount,
  legalSequenceCount,
  rootOptions: [{ nodeId, seatAdvantage, normalizedAdvantage, selectedLine }],
  responseOptions: [{ nodeIds, seatAdvantage, normalizedAdvantage, selectedLine }]
}
```

`rootOptions` contains one optimal continuation per legal P1 first node. `responseOptions` contains one optimal continuation per legal ordered P2 settlement pair under the selected P1 first node. These bounded arrays are the only data needed for interest scoring; do not store every leaf.

- [ ] **Step 6: Run candidate and solver tests**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/candidatePoolV3.test.js scripts/duel-board-lab/__tests__/openingDraftSolverV3.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add scripts/duel-board-lab/analysis/candidatePoolV3.mjs scripts/duel-board-lab/analysis/openingDraftSolverV3.mjs scripts/duel-board-lab/__tests__/candidatePoolV3.test.js scripts/duel-board-lab/__tests__/openingDraftSolverV3.test.js
git commit -m "feat: solve bounded duel opening drafts"
```

---

## Task 4: Produce numeric fairness, quality, interest, and overall scores

**Files:**

- Create: `scripts/duel-board-lab/analysis/evaluateDuelBoardV3.mjs`
- Create: `scripts/duel-board-lab/__tests__/evaluatorV3.test.js`
- Reuse: `scripts/duel-board-lab/__tests__/fixtures/*.json`

- [ ] **Step 1: Add failing evaluator acceptance tests**

Cover these outcomes:

```js
it("gives every structurally valid board four finite scores", () => {
  const report = evaluateDuelBoardV3(seed47.tiles);
  expect(report.status).toBe("ranked");
  for (const score of [report.overallScore, ...Object.values(report.scores)]) {
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  }
});

it("does not mistake production depth for fairness on seed 47", () => {
  const seed47Report = evaluateDuelBoardV3(seed47.tiles);
  const variedReport = evaluateDuelBoardV3(variedOpeningsFixture.tiles);
  expect(seed47Report.overallScore).toBeLessThan(90);
  expect(seed47Report.scores.fairness).toBeLessThan(variedReport.scores.fairness);
});

it("keeps interest separate from overall ranking", () => {
  const report = evaluateDuelBoardV3(seed2604.tiles);
  expect(report.overallScore).toBeCloseTo(
    0.8 * report.scores.fairness + 0.2 * report.scores.quality,
    8
  );
});

it("is invariant under all twelve board symmetries", () => {
  // Compare the four scalar scores to 8 decimal places and assert the selected
  // node ids equal the symmetry transform of the original selected line.
});

it("is byte-stable for identical tiles and profile identity", () => {
  expect(JSON.stringify(evaluateDuelBoardV3(seed2604.tiles)))
    .toBe(JSON.stringify(evaluateDuelBoardV3(seed2604.tiles)));
});
```

Also assert that a structurally broken board or a board producing any non-finite required feature returns `status: "invalid"`, stable `invalidCodes`, and null score/diagnostic fields rather than fake zeroes.

- [ ] **Step 2: Run and observe the missing evaluator failure**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluatorV3.test.js
```

Expected: FAIL because `evaluateDuelBoardV3.mjs` does not exist.

- [ ] **Step 3: Implement the v3 reduction formulas**

Create `evaluateDuelBoardV3.mjs` and compose Tasks 1-3. For ranked boards compute:

```js
const advantageMagnitude = Math.abs(solved.normalizedAdvantage);
const fairness = 100 * (1 - clamp(
  advantageMagnitude / profile.fairnessAdvantageLimit,
  0,
  1
));
const weakerPortfolio = Math.min(solved.p1.value, solved.p2.value);
const meanPortfolio = (solved.p1.value + solved.p2.value) / 2;
const quality = 0.80 * weakerPortfolio + 0.20 * meanPortfolio;

const bestRootValue = Math.max(...solved.rootOptions.map((option) => option.normalizedAdvantage));
const nearOptimalRoots = solved.rootOptions.filter(
  (option) => bestRootValue - option.normalizedAdvantage <= profile.nearOptimalTolerance
);

const bestResponseValue = Math.min(...solved.responseOptions.map((option) => option.normalizedAdvantage));
const nearOptimalResponses = solved.responseOptions.filter(
  (option) => option.normalizedAdvantage - bestResponseValue <= profile.nearOptimalTolerance
);
const choiceDepth = clamp(
  ((nearOptimalRoots.length + nearOptimalResponses.length) / 2) / 4,
  0,
  1
) * 100;
const responsesByValue = [...solved.responseOptions].sort(
  (left, right) =>
    left.normalizedAdvantage - right.normalizedAdvantage || compareResponseIds(left, right)
);
const forcedResponseRegret = Math.max(
  0,
  (responsesByValue[1]?.normalizedAdvantage ?? responsesByValue[0].normalizedAdvantage)
    - bestResponseValue
);
const responseFreedom = (
  1 - clamp(forcedResponseRegret / profile.responseRegretLimit, 0, 1)
) * 100;
const interest = 0.5 * choiceDepth + 0.5 * responseFreedom;
const overall = 0.80 * fairness + 0.20 * quality;
```

The solver selects its line by raw seat advantage, but choice diagnostics compare each option's `normalizedAdvantage` so the `0.05` and `0.15` profile thresholds are dimensionless. For P2 response options, lower is better. Sort root options by node id and response options lexicographically by their two node ids before counting. Round only serialized report scores to six decimals.

Return a compact report:

```js
{
  status: "ranked",
  evaluator: { id: "duel-fair-v3", version: 3 },
  evaluatorIdentity: DUEL_FAIR_V3_IDENTITY,
  status: "ranked",
  invalidCodes: [],
  overallScore: overall,
  scores: { fairness, quality, interest },
  selectedLine: solved.selectedLine,
  selectedPortfolios: { P1: solved.p1, P2: solved.p2 },
  components: {
    normalizedAdvantage: solved.normalizedAdvantage,
    weakerPortfolio,
    meanPortfolio
  },
  choiceDiagnostics: {
    choiceDepth,
    responseFreedom,
    candidatePoolSize: nodeIds.length,
    evaluatedSequenceCount: solved.legalSequenceCount,
    rawSequenceCount: solved.rawSequenceCount,
    usedFallbackExpansion: fallbackUsed,
    championsByLens,
    fallbackLine,
    rootOptions: solved.rootOptions,
    responseOptions: solved.responseOptions
  },
  tags
}
```

`selectedLine` is an array of `{ player: "P1" | "P2", nodeId }` in placement order. Each selected portfolio contains the existing ordered opening portfolio fields plus its normalized v3 `components` and final `value`. Invalid results use the same top-level keys with `overallScore`, `scores`, `selectedLine`, `selectedPortfolios`, `components`, and `choiceDiagnostics` set to null and with stable sorted `invalidCodes`.

Generate concise deterministic tags: `scarce:<resource>` for scarcity multiplier at least 1.15, `concentrated:<resource>` for concentration at least 0.70, `port-reliant` when trade/ports is at least 20 points above direct recipe readiness, `robber-fragile` when either resilience is under 35, `forced-response` when response freedom is under 25, `adjacent-red` when board facts contain a red-number adjacency, `road-friendly` when the weaker player's road capacity reaches its target, and `dev-friendly` on the equivalent dev target. Tags are descriptive, never pass/reject rules.

- [ ] **Step 4: Run v3 plus symmetry tests**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluatorV3.test.js scripts/duel-board-lab/__tests__/symmetry.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add scripts/duel-board-lab/analysis/evaluateDuelBoardV3.mjs scripts/duel-board-lab/__tests__/evaluatorV3.test.js
git commit -m "feat: rank valid duel boards with v3 scores"
```

---

## Task 5: Calibrate against a fixed exact oracle and enforce the speed gate

**Files:**

- Create: `scripts/duel-board-lab/oracle-v3.mjs`
- Create: `scripts/duel-board-lab/analysis/oracleCalibrationV3.mjs`
- Create: `scripts/duel-board-lab/__tests__/oracleCalibrationV3.test.js`
- Modify: `scripts/duel-board-lab/benchmark.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add failing calibration-math tests**

Test `signAgreement`, median absolute error, and Spearman rank correlation with small known arrays. Include ties by assigning average ranks. Assert that the target predicate is exactly:

```js
signAgreement >= 10 &&
medianAbsoluteAdvantageError <= 0.03 &&
fairnessSpearman >= 0.85
```

- [ ] **Step 2: Run and observe the missing calibration-module failure**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/oracleCalibrationV3.test.js
```

Expected: FAIL because `oracleCalibrationV3.mjs` does not exist.

- [ ] **Step 3: Implement deterministic comparison metrics**

Create `oracleCalibrationV3.mjs` exporting `compareFastAndExactV3(rows)` and `passesV3Calibration(metrics)`. A row is:

```js
{
  seed,
  fastAdvantage,
  exactAdvantage,
  fastFairness,
  exactFairness
}
```

Treat values within `1e-12` as zero for sign comparison. Median uses the arithmetic mean of the two middle values for an even-length array. Spearman uses average ranks for ties and Pearson correlation of the rank arrays. Return all raw rows with the aggregate metrics so failures are inspectable.

- [ ] **Step 4: Add the fixed 12-board oracle command**

Create `oracle-v3.mjs` with official-spiral seeds:

```js
export const V3_ORACLE_SEEDS = Object.freeze([
  1, 47, 109, 248, 310, 409, 548, 651, 725, 820, 907, 2604
]);
```

For each board:

1. build facts, context, and settlement features once;
2. run the normal evaluator with its 16-20 node pool;
3. call `solveOpeningDraftV3` with all `facts.nodes.map(node => node.nodeId)` for the exact result;
4. derive exact fairness with the same v3 fairness formula;
5. print one concise row plus aggregate metrics;
6. set `process.exitCode = 1` if the three targets fail.

The command must not enable any historical v2 lenses and must not write reports or run-store files.

Add:

```json
"board:lab:oracle-v3": "node scripts/duel-board-lab/oracle-v3.mjs"
```

- [ ] **Step 5: Replace the accidental slow default benchmark with a v3 speed gate**

Modify `benchmark.mjs` so its default rows are:

- `v3-evaluation-only`, 1,000 pre-generated mixed-family candidates;
- `v3-generate-and-evaluate`, 1,000 newly generated mixed-family candidates.

Print the observed boards/sec and peak RSS. Fail when full generate-and-evaluate is below 100 boards/sec. Keep the old exact-v2 benchmark available only when `BOARD_LAB_INCLUDE_EXACT_V2=1`; sample 3 boards, label it `historical-exact-v2`, and do not include it in the default pass/fail gate.

- [ ] **Step 6: Run the focused unit test, benchmark, then oracle in that order**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/oracleCalibrationV3.test.js
pnpm board:lab:benchmark
pnpm board:lab:oracle-v3
```

Expected:

- unit test PASS;
- full v3 generate-and-evaluate at least 100 boards/sec;
- oracle direction at least 10/12, median absolute normalized-advantage error at most 0.03, fairness Spearman at least 0.85.

This is a hard checkpoint. If speed fails, profile the scorer and remove repeated per-leaf allocation before doing any report work. If calibration fails, first increase the normal candidate limit from 16 to 20 and rerun. If it still fails, improve lens coverage or component scaling. Do not make the default path exact and do not proceed to Task 6 until all targets pass.

- [ ] **Step 7: Commit Task 5 after the gate passes**

```bash
git add scripts/duel-board-lab/oracle-v3.mjs scripts/duel-board-lab/analysis/oracleCalibrationV3.mjs scripts/duel-board-lab/__tests__/oracleCalibrationV3.test.js scripts/duel-board-lab/benchmark.mjs package.json
git commit -m "test: calibrate fast duel ranking against oracle"
```

---

## Task 6: Make v3 the streaming default and retain the right shortlist records

**Files:**

- Modify: `scripts/duel-board-lab/lib/runBatch.mjs`
- Modify: `scripts/duel-board-lab/lib/runStore.mjs`
- Modify: `scripts/duel-board-lab/lib/cliOptions.mjs`
- Modify: `scripts/duel-board-lab/generate.mjs`
- Modify: `scripts/duel-board-lab/compare.mjs`
- Modify: `scripts/duel-board-lab/inspect.mjs`
- Modify: `scripts/duel-board-lab/reports/summary.mjs`
- Modify: `scripts/duel-board-lab/__tests__/runStore.test.js`
- Modify: `scripts/duel-board-lab/__tests__/cliOptions.test.js`

- [ ] **Step 1: Change run-store tests first**

Replace v1 pass/reject selection expectations with one bounded union of these ranks:

```js
{
  "overall-high": -record.overallScore,
  "overall-low": record.overallScore,
  "fairness-high": -record.scores.fairness,
  "quality-high": -record.scores.quality,
  "interest-high": -record.scores.interest
}
```

Invalid records use a separate `invalid` group and are excluded from numeric ranks. Assert stable candidate-index tie-breaking, symmetry deduplication, and a maximum of `shortlistSize` entries per rank. Assert that resuming a v1/v2 manifest as v3 fails with a manifest mismatch.

Add CLI tests for `--evaluator duel-fair-v1|duel-fair-v2|duel-fair-v3`, defaulting to v3. Reject unknown evaluator values. Retain `--v2-audit-selections` only when the explicit evaluator is v1 or v2; reject it for v3 so an accidental exact audit cannot enter the normal path. Add `--exact-v3` only to `inspect`; it defaults false, requires `--evaluator duel-fair-v3`, and is the explicit named-board escape hatch for comparing the stored fast result with a 54-node v3 solve.

- [ ] **Step 2: Run the focused tests and observe expectation failures**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/runStore.test.js scripts/duel-board-lab/__tests__/cliOptions.test.js
```

Expected: FAIL because the current store ranks v1 pass/reject groups and the CLI has no evaluator selector.

- [ ] **Step 3: Stream compact v3 records and materialize only selected diagnostics**

In `runBatch.mjs`, choose the evaluator by explicit version and default to `evaluateDuelBoardV3`. The JSONL row for every candidate contains:

```js
{
  candidateIndex,
  family,
  seed,
  generatorVersion,
  evaluatorVersion,
  symmetryHash,
  status,
  invalidCodes,
  overallScore,
  scores,
  tags,
  structuralErrors
}
```

Do not write full root/response diagnostics to JSONL. When a record enters any bounded selection group, materialize its board JSON with the complete v3 evaluation under `diagnosticV3`. This keeps tens of thousands of rows cheap while preserving inspectable top/bottom/interesting boards.

Update the manifest identity with evaluator id/version and all v3 profile values that can affect ranking. Keep existing atomic write/resume behavior.

In `runStore.mjs`, make selection groups a union of the five numeric ranks plus invalid examples. A board appearing in multiple ranks is written once with a sorted `selectionReasons` array. Preserve symmetry deduplication within each rank.

- [ ] **Step 4: Update summary and commands**

Update `summary.mjs` to report:

- generated/ranked/invalid counts;
- min/median/max for all four scores;
- tag counts;
- selection counts by reason;
- measured run throughput.

`generate.mjs` and `compare.mjs` must print `duel-fair-v3` as the default evaluator and never launch exact v2 unless the user explicitly selects a historical evaluator plus its audit flag. `inspect.mjs` normally prints the stored `diagnosticV3` without recomputing. Only `inspect --evaluator duel-fair-v3 --exact-v3` regenerates and raw-hash-verifies the named board, runs the all-node v3 solver, and prints fast-versus-exact advantage/fairness differences. A regeneration or raw-hash mismatch is reported as a stable invalid inspection error; it never mutates the stored run.

- [ ] **Step 5: Run focused and full board-lab tests**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/runStore.test.js scripts/duel-board-lab/__tests__/cliOptions.test.js
pnpm test:board-lab
```

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```bash
git add scripts/duel-board-lab/lib/runBatch.mjs scripts/duel-board-lab/lib/runStore.mjs scripts/duel-board-lab/lib/cliOptions.mjs scripts/duel-board-lab/generate.mjs scripts/duel-board-lab/compare.mjs scripts/duel-board-lab/inspect.mjs scripts/duel-board-lab/reports/summary.mjs scripts/duel-board-lab/__tests__/runStore.test.js scripts/duel-board-lab/__tests__/cliOptions.test.js
git commit -m "feat: make v3 the streaming board ranker"
```

---

## Task 7: Replace grouped reports with one sortable ranked gallery

**Required design references before editing the report:**

- `.agents/skills/catana-design/SKILL.md`
- `docs/agent/UI_CONTEXT.md`
- `docs/agent/skills/catana-brand/SKILL.md`

This is a quiet developer diagnostic, not a product page. Use the Catana references to keep typography and board rendering coherent; do not add production navigation, decorative panels, or a new shared primitive.

**Files:**

- Create: `scripts/duel-board-lab/reports/buildRankedReport.mjs`
- Modify: `scripts/duel-board-lab/reports/renderBoard.mjs`
- Modify: `scripts/duel-board-lab/generate.mjs`
- Modify: `scripts/duel-board-lab/compare.mjs`
- Modify: `scripts/duel-board-lab/__tests__/reports.test.js`

- [ ] **Step 1: Add failing report behavior tests**

Given unsorted selected-board fixtures, assert that generated HTML:

- renders one card per unique candidate even if it has several selection reasons;
- defaults to `overallScore` descending;
- supports `overall`, `fairness`, `quality`, and `interest`, each ascending and descending;
- displays all four numeric scores and concise tags;
- contains no `pass`/`reject` grouping headings;
- includes exactly one placement-overlay control;
- hides `.placement-overlay` by default;
- uses the stored `diagnosticV3.selectedLine` and never imports/calls a solver.

- [ ] **Step 2: Run and observe report expectation failures**

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/reports.test.js
```

Expected: FAIL against the current grouped, lexically ordered report.

- [ ] **Step 3: Build one explicitly sorted, self-contained gallery**

Create `buildRankedReport.mjs` exporting:

```js
export async function buildRankedReport({ runDir, family, summary }) {
  // Read selected board JSON, dedupe by candidateIndex, sort by
  // overallScore descending then candidateIndex ascending, and write report.html.
}
```

Each card must have numeric data attributes:

```html
<article
  class="board-card"
  data-candidate-index="47"
  data-overall="82.4"
  data-fairness="84.1"
  data-quality="75.6"
  data-interest="61.0"
>
```

Use a select for score, a select for direction, and a checkbox for placements. Inline JavaScript sorts the existing card nodes numerically; ties use candidate index ascending. On first render the server-side order is already correct, so the report remains useful with JavaScript disabled.

Show `overallScore` plus `scores.fairness`, `scores.quality`, and `scores.interest` in the card header. Put component bars, chosen line, normalized advantage, candidate-pool size, and selection reasons in a collapsed `<details>` block. Do not label any ranked board pass/reject.

- [ ] **Step 4: Make placement suggestions a hidden SVG layer**

Update `renderBoard.mjs` to accept `diagnosticV3` while retaining the old optional `diagnosticV2` argument for historical reports. Resolve the line as:

```js
const selectedLine = diagnosticV3?.selectedLine
  ?? diagnosticV2?.fairness?.solvedLine
  ?? null;
```

When a line exists, wrap all suggestion markers and labels in:

```html
<g class="placement-overlay" aria-hidden="true">...</g>
```

The report's default CSS uses `.placement-overlay { display: none; }`; the checked control adds `body.show-placements`, whose CSS displays the group. This adds no extra evaluation or render solve.

- [ ] **Step 5: Wire v3 report generation and run tests**

`generate.mjs` and `compare.mjs` call `buildRankedReport` for v3 runs. Preserve the existing `buildReport` only for explicitly selected historical evaluators.

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/reports.test.js
pnpm test:board-lab
```

Expected: PASS.

- [ ] **Step 6: Generate a bounded manual-review report**

```bash
pnpm board:lab:generate --family official-spiral --count 1000 --run-id v3-review --shortlist-size 20
```

Open the emitted `report.html` and verify:

- first card is the highest overall score;
- changing sort score/direction reorders numerically;
- seed 47 is not presented as near-perfect merely for production depth;
- placement markers are absent initially and appear only after checking the control;
- ports remain visible with or without the placement overlay;
- no board is duplicated.

Do not enlarge the corpus during this task.

- [ ] **Step 7: Commit Task 7**

```bash
git add scripts/duel-board-lab/reports/buildRankedReport.mjs scripts/duel-board-lab/reports/renderBoard.mjs scripts/duel-board-lab/generate.mjs scripts/duel-board-lab/compare.mjs scripts/duel-board-lab/__tests__/reports.test.js
git commit -m "feat: render one sortable duel board gallery"
```

---

## Task 8: Document the model, verify the branch, and record measured results

**Files:**

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Modify: `docs/superpowers/specs/2026-07-13-duel-fair-v3-fast-ranking-design.md` only if implementation evidence required a design correction

- [ ] **Step 1: Document the delivered model and evidence**

In `PROGRESS.md`, record:

- v3 is the default lab ranker;
- measured generate-and-evaluate boards/sec from Task 5;
- exact-oracle direction, median advantage error, and fairness Spearman;
- the bounded manual report path and count;
- any profile values changed to pass calibration.

In `NOTES.md`, record:

- `overall = 0.8 fairness + 0.2 quality` and interest is independent;
- the eight component weights and resource weights;
- candidate champion order, normal pool size, fallback maximum;
- the fixed oracle seeds and the fact that exact solving is calibration-only;
- how to run benchmark, oracle, generate, inspect, and historical v1/v2 paths;
- explicit non-goals: no constructive generator, no production integration, no multiplayer fairness, no large corpus in this slice.

- [ ] **Step 2: Run final verification from a clean process**

```bash
pnpm test:board-lab
pnpm board:lab:benchmark
pnpm board:lab:oracle-v3
pnpm lint
pnpm -C game-core test
pnpm -C game-core build
git diff --check
git status --short
```

Expected:

- all board-lab tests pass;
- v3 full generate-and-evaluate remains at least 100 boards/sec;
- all three oracle targets pass;
- lint plus game-core tests/build pass even though v3 does not modify game-core;
- `git diff --check` is silent;
- only the intended docs changes remain uncommitted.

- [ ] **Step 3: Commit documentation**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md docs/superpowers/specs/2026-07-13-duel-fair-v3-fast-ranking-design.md
git commit -m "docs: record duel fair v3 calibration"
```

If the design spec did not change, omit it from `git add` rather than touching it.

- [ ] **Step 4: Inspect the final branch history and working tree**

```bash
git log --oneline --decorate -10
git status --short --branch
```

Expected: the Task 1-8 commits are present and the working tree is clean.

---

## Completion Criteria

- `duel-fair-v3` is the normal evaluator and v1/v2 require explicit selection.
- Every structurally valid standard board has finite `overall`, `fairness`, `quality`, and `interest` scores.
- Resource complementarity, board-relative scarcity, second-placement starting resources, ports, city potential, expansion, denial coverage, and robber resilience influence the opening policy through visible source-controlled values.
- Normal analysis searches only a 16-node strategically covered pool, with deterministic fallback capped at 20.
- Default generation/reporting never runs exact v2 or 54-node v3 search.
- Full v3 generate-and-evaluate is at least 100 boards/sec on the current development Mac.
- The fixed 12-board exact comparison meets all three calibration targets.
- The primary report is one deduplicated numerical ranking, defaults to overall descending, supports the other score sorts, and hides suggested placements by default.
- The bounded 1,000-board manual report has been inspected; no larger corpus has been run.
- Board-lab tests pass, docs record measured evidence, and the worktree is clean.
