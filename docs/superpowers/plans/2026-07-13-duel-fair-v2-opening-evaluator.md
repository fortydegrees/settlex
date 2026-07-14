# Duel Fair v2 Opening Evaluator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the greedy duel-board diagnostic with an exact, explainable `P1 -> P2 -> P2 -> P1` opening evaluator that values usable resource portfolios, starting cards, ports, fairness, board quality, and placement depth.

**Architecture:** Keep the existing generators and v1 streamed corpus intact. Add rule-derived opening features, a versioned tunable policy, and an exact backward-induction solver under `scripts/duel-board-lab/analysis`; use v1 for cheap corpus selection while exact v2 audits selected boards and calibration fixtures. V2 reports remain offline and cannot affect live match generation.

**Tech Stack:** Node.js ESM, JavaScript `.mjs`, Vitest, `@settlex/game-core` topology and resource enums, existing JSONL run store and self-contained SVG/HTML reports; no new dependencies.

## Global Constraints

- Work only in `/Users/david/coding/settlex/.worktrees/duel-fair-board-lab` on `codex/duel-fair-board-lab`.
- Keep `game-core` free of fairness weights, verdicts, search, ranking, and reporting.
- Preserve deterministic output; do not use `Math.random`, time-based output, or unordered tie-breaking.
- Preserve existing `duel-fair-v1` APIs, snapshots, run manifests, and calibration outputs.
- Feature identity starts at `duel-opening-features-v1`; policy identity starts at `duel-fair-v2`.
- Model only opening placement, starting cards, build-cost viability, owned ports, and bounded expansion geography; do not simulate complete games.
- Resource scarcity, clumping, and unequal global pips are descriptive, not universal hard failures.
- Adjacent red numbers remain a hard gate only in the default v2 profile.
- A static screen pass is not a final v2 pass; only an exact audited board may receive a final v2 verdict and score.
- Add no package, dependency, workspace, database, or build-tool changes.
- Follow red-green-refactor for every shared logic change and commit after every task.
- Stop after the bounded human-calibration report; do not start the 100,000-per-family evidence run.

---

## File Map

### New analysis units

- `scripts/duel-board-lab/analysis/startingResources.mjs` — derive the exact second-settlement starting-card multiset.
- `scripts/duel-board-lab/analysis/recipeCapacity.mjs` — direct and bank/port-adjusted build-recipe capacity.
- `scripts/duel-board-lab/analysis/openingPortfolio.mjs` — construct ordered two-settlement portfolio features and bounded expansion geography.
- `scripts/duel-board-lab/analysis/openingPolicy.mjs` — profile hashing, feature flattening, and tunable portfolio value.
- `scripts/duel-board-lab/analysis/duelFairV2Profile.mjs` — finite v2 thresholds, weights, diagnostic lenses, and ranking weights.
- `scripts/duel-board-lab/analysis/openingDraftSolver.mjs` — exact deterministic backward induction.
- `scripts/duel-board-lab/analysis/placementDepth.mjs` — greedy regret, meaningful choices, forced defence, and line sensitivity.
- `scripts/duel-board-lab/analysis/evaluateDuelBoardV2.mjs` — structural screen plus fairness, quality, depth, tags, and score.

### New tests and fixtures

- `scripts/duel-board-lab/__tests__/openingFeatures.test.js`
- `scripts/duel-board-lab/__tests__/openingPortfolio.test.js`
- `scripts/duel-board-lab/__tests__/openingDraftSolver.test.js`
- `scripts/duel-board-lab/__tests__/evaluatorV2.test.js`
- `scripts/duel-board-lab/fixtures/official-seed-47-p1-dominance.json`
- `scripts/duel-board-lab/fixtures/official-seed-2604-strategic-denial.json`

### Existing integration points

- `scripts/duel-board-lab/constants.mjs` — expose v1 and v2 evaluator identities without changing the v1 default.
- `scripts/duel-board-lab/fixtures/buildFixtures.mjs` — generate the two durable official-seed fixtures.
- `scripts/duel-board-lab/lib/cliOptions.mjs` — opt into exact v2 audits of bounded selected boards.
- `scripts/duel-board-lab/lib/runBatch.mjs` — attach v2 diagnostics to selected payloads, not every streamed v1 row.
- `scripts/duel-board-lab/lib/runStore.mjs` — persist v2 audit identity in compatible manifests and selection summaries.
- `scripts/duel-board-lab/reports/renderBoard.mjs` — geographic ports and solved-pick markers.
- `scripts/duel-board-lab/reports/buildReport.mjs` — starting hands, portfolios, capacities, fairness, quality, and depth.
- `scripts/duel-board-lab/benchmark.mjs` — measure v1 screening and exact v2 auditing separately.
- `scripts/duel-board-lab/__tests__/cliOptions.test.js`
- `scripts/duel-board-lab/__tests__/runStore.test.js`
- `scripts/duel-board-lab/__tests__/reports.test.js`
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

---

### Task 1: Starting Cards and Recipe Capacity

**Files:**
- Create: `scripts/duel-board-lab/analysis/startingResources.mjs`
- Create: `scripts/duel-board-lab/analysis/recipeCapacity.mjs`
- Create: `scripts/duel-board-lab/__tests__/openingFeatures.test.js`

**Interfaces:**
- Consumes: `buildBoardFacts(tiles)` and `ResourceType` from `@settlex/game-core`.
- Produces: `startingResourcesForNode(facts, nodeId)`, `DIRECT_RECIPES`, `directRecipeCapacities(productionPips)`, `directRecipeSurpluses(productionPips)`, and `tradeAdjustedRecipeCapacities(productionPips, ports, { precision })`.

- [ ] **Step 1: Write failing starting-card tests**

```js
import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { startingResourcesForNode } from "../analysis/startingResources.mjs";
import { generateCandidate, BOARD_FAMILIES } from "../generators/generateCandidate.mjs";

describe("duel opening feature primitives", () => {
  it("returns the exact seed-47 second-settlement cards", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    expect(startingResourcesForNode(facts, 23)).toEqual([
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WHEAT
    ]);
  });

  it("preserves duplicate adjacent resources as duplicate cards", () => {
    const facts = {
      tiles: [
        { type: "Land", tile: { id: 1, resource: ResourceType.WOOD, nodes: { A: 4 } } },
        { type: "Land", tile: { id: 2, resource: ResourceType.WOOD, nodes: { A: 4 } } },
        { type: "Land", tile: { id: 3, resource: ResourceType.DESERT, nodes: { A: 4 } } }
      ]
    };
    expect(startingResourcesForNode(facts, 4)).toEqual([ResourceType.WOOD, ResourceType.WOOD]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingFeatures.test.js --reporter=dot
```

Expected: FAIL because `startingResources.mjs` does not exist.

- [ ] **Step 3: Implement exact starting-resource extraction**

```js
import { ResourceType, TileTypes } from "@settlex/game-core";

const NON_STARTING_RESOURCES = new Set([ResourceType.DESERT, ResourceType.EMPTY]);

export function startingResourcesForNode(facts, nodeId) {
  return facts.tiles
    .filter((tile) => tile.type === TileTypes.LAND)
    .filter((tile) => Object.values(tile.tile.nodes ?? {}).includes(nodeId))
    .filter((tile) => tile.tile.resource && !NON_STARTING_RESOURCES.has(tile.tile.resource))
    .sort((left, right) => left.tile.id - right.tile.id)
    .map((tile) => tile.tile.resource);
}
```

Do not deduplicate the result. Keep tile-ID order as the deterministic contract.

- [ ] **Step 4: Run the starting-card tests and verify they pass**

Run the command from Step 2.

Expected: 2 tests PASS.

- [ ] **Step 5: Add failing direct and trade-adjusted capacity tests**

Append:

```js
import {
  directRecipeCapacities,
  directRecipeSurpluses,
  tradeAdjustedRecipeCapacities
} from "../analysis/recipeCapacity.mjs";

it("makes missing complementary production a zero direct capacity", () => {
  const pips = { Wood: 8, Brick: 0, Sheep: 7, Wheat: 8, Ore: 0 };
  expect(directRecipeCapacities(pips)).toEqual({
    road: 0,
    settlement: 0,
    devCard: 0,
    city: 0
  });
});

it("normalises city capacity by the two-wheat three-ore cost", () => {
  const pips = { Wood: 0, Brick: 0, Sheep: 0, Wheat: 8, Ore: 9 };
  expect(directRecipeCapacities(pips).city).toBe(3);
});

it("keeps non-bottleneck recipe surplus separate from direct capacity", () => {
  const pips = { Wood: 8, Brick: 0, Sheep: 0, Wheat: 0, Ore: 0 };
  expect(directRecipeCapacities(pips).road).toBe(0);
  expect(directRecipeSurpluses(pips).road).toBe(8);
});

it("uses owned ports without hiding direct capacity", () => {
  const pips = { Wood: 8, Brick: 0, Sheep: 0, Wheat: 0, Ore: 0 };
  expect(tradeAdjustedRecipeCapacities(pips, [], { precision: 1e-6 }).road).toBeCloseTo(1.6, 5);
  expect(tradeAdjustedRecipeCapacities(pips, [ResourceType.WOOD], { precision: 1e-6 }).road)
    .toBeCloseTo(8 / 3, 5);
  expect(directRecipeCapacities(pips).road).toBe(0);
});
```

- [ ] **Step 6: Run the test and verify the second missing-module failure**

Run the command from Step 2.

Expected: FAIL because `recipeCapacity.mjs` does not exist.

- [ ] **Step 7: Implement recipe definitions and deterministic capacity search**

```js
import { ResourceType } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";

export const DIRECT_RECIPES = Object.freeze({
  road: Object.freeze({ [ResourceType.WOOD]: 1, [ResourceType.BRICK]: 1 }),
  settlement: Object.freeze({
    [ResourceType.WOOD]: 1,
    [ResourceType.BRICK]: 1,
    [ResourceType.SHEEP]: 1,
    [ResourceType.WHEAT]: 1
  }),
  devCard: Object.freeze({
    [ResourceType.SHEEP]: 1,
    [ResourceType.WHEAT]: 1,
    [ResourceType.ORE]: 1
  }),
  city: Object.freeze({ [ResourceType.WHEAT]: 2, [ResourceType.ORE]: 3 })
});

export function directRecipeCapacities(productionPips) {
  return Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, cost]) => [
    name,
    Math.min(...Object.entries(cost).map(([resource, amount]) =>
      (productionPips[resource] ?? 0) / amount))
  ]));
}

export function directRecipeSurpluses(productionPips) {
  const capacities = directRecipeCapacities(productionPips);
  return Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, cost]) => [
    name,
    Object.entries(cost).reduce((sum, [resource, amount]) => (
      sum + Math.max((productionPips[resource] ?? 0) - capacities[name] * amount, 0)
    ), 0)
  ]));
}

function tradeRate(resource, ports) {
  if (ports.includes(resource)) return 2;
  if (ports.includes(ResourceType.ANY)) return 3;
  return 4;
}

function feasibleCapacity(productionPips, recipe, ports, capacity) {
  let exports = 0;
  let deficits = 0;
  for (const resource of STANDARD_RESOURCES) {
    const balance = (productionPips[resource] ?? 0) - capacity * (recipe[resource] ?? 0);
    if (balance >= 0) exports += balance / tradeRate(resource, ports);
    else deficits += -balance;
  }
  return exports >= deficits;
}

function tradeAdjustedCapacity(productionPips, recipe, ports, precision) {
  const total = Object.values(productionPips).reduce((sum, value) => sum + value, 0);
  const recipeCards = Object.values(recipe).reduce((sum, value) => sum + value, 0);
  let low = 0;
  let high = recipeCards === 0 ? 0 : total / recipeCards;
  while (high - low > precision) {
    const middle = (low + high) / 2;
    if (feasibleCapacity(productionPips, recipe, ports, middle)) low = middle;
    else high = middle;
  }
  return low;
}

export function tradeAdjustedRecipeCapacities(productionPips, ports, { precision }) {
  if (!Number.isFinite(precision) || precision <= 0) throw new Error("precision must be positive");
  return Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, recipe]) => [
    name,
    tradeAdjustedCapacity(productionPips, recipe, ports, precision)
  ]));
}
```

- [ ] **Step 8: Run focused and board-facts tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingFeatures.test.js scripts/duel-board-lab/__tests__/boardFacts.test.js --reporter=dot
```

Expected: all tests PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add scripts/duel-board-lab/analysis/startingResources.mjs scripts/duel-board-lab/analysis/recipeCapacity.mjs scripts/duel-board-lab/__tests__/openingFeatures.test.js
git commit -m "feat: add duel opening resource features"
```

---

### Task 2: Ordered Opening Portfolios and Versioned Policy

**Files:**
- Create: `scripts/duel-board-lab/analysis/openingPortfolio.mjs`
- Create: `scripts/duel-board-lab/analysis/openingPolicy.mjs`
- Create: `scripts/duel-board-lab/analysis/duelFairV2Profile.mjs`
- Create: `scripts/duel-board-lab/__tests__/openingPortfolio.test.js`

**Interfaces:**
- Consumes: Task 1 feature functions and immutable `buildBoardFacts` output.
- Produces: `compileExpansionPaths(facts, orderedNodeIds)`, `measureExpansionReach(facts, orderedNodeIds, occupiedNodeIds, compiledPaths)`, `buildOpeningPortfolio(facts, orderedNodeIds, options)`, `flattenPolicyFeatures(portfolio)`, `valueOpeningPortfolio(portfolio, policy)`, `hashOpeningProfile(profile)`, `DUEL_FAIR_V2_PROFILE`, and `DUEL_FAIR_V2_LENSES`.

- [ ] **Step 1: Write failing ordered-portfolio tests**

```js
import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { buildOpeningPortfolio } from "../analysis/openingPortfolio.mjs";
import { DUEL_FAIR_V2_PROFILE } from "../analysis/duelFairV2Profile.mjs";
import { generateCandidate, BOARD_FAMILIES } from "../generators/generateCandidate.mjs";

describe("ordered duel opening portfolios", () => {
  it("uses only the second node for starting cards", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    const portfolio = buildOpeningPortfolio(facts, [0, 23], {
      occupiedNodeIds: [0, 6, 44, 23],
      precision: DUEL_FAIR_V2_PROFILE.tradePrecision
    });

    expect(portfolio.productionPips).toEqual({ Wood: 7, Brick: 3, Sheep: 3, Wheat: 5, Ore: 4 });
    expect(portfolio.startingCards).toEqual([
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WHEAT
    ]);
    expect(portfolio.startingReadiness.road.canBuyNow).toBe(true);
    expect(portfolio.producedResourceCount).toBe(5);
  });

  it("keeps the same production but changes tempo when pair order changes", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    const forward = buildOpeningPortfolio(facts, [0, 23], { occupiedNodeIds: [0, 23], precision: 1e-6 });
    const reverse = buildOpeningPortfolio(facts, [23, 0], { occupiedNodeIds: [0, 23], precision: 1e-6 });
    expect(reverse.productionPips).toEqual(forward.productionPips);
    expect(reverse.startingCards).not.toEqual(forward.startingCards);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because the portfolio modules are absent**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingPortfolio.test.js --reporter=dot
```

Expected: FAIL with an import error.

- [ ] **Step 3: Implement ordered portfolio construction**

Import `ResourceType` from `@settlex/game-core`, `STANDARD_RESOURCES` from `../constants.mjs`, and the Task 1 helpers from their analysis modules. The implementation must:

```js
export function buildOpeningPortfolio(
  facts,
  [firstNodeId, secondNodeId],
  { occupiedNodeIds, precision }
) {
  const byId = new Map(facts.nodes.map((node) => [node.nodeId, node]));
  const first = byId.get(firstNodeId);
  const second = byId.get(secondNodeId);
  if (!first || !second) throw new Error("unknown opening node");
  if (first.blockedNodeIds.includes(secondNodeId)) throw new Error("illegal opening pair");

  const productionPips = Object.fromEntries(STANDARD_RESOURCES.map((resource) => [
    resource,
    first.resourcePips[resource] + second.resourcePips[resource]
  ]));
  const ownedPorts = [...new Set([first.port, second.port].filter(Boolean))].sort();
  const startingCards = startingResourcesForNode(facts, secondNodeId);
  const startingReadiness = readinessByRecipe(startingCards);

  return Object.freeze({
    settlementNodeIds: Object.freeze([firstNodeId, secondNodeId]),
    productionPips: Object.freeze(productionPips),
    totalProductionPips: Object.values(productionPips).reduce((sum, value) => sum + value, 0),
    producedResourceCount: Object.values(productionPips).filter((value) => value > 0).length,
    missingProducedResources: Object.freeze(STANDARD_RESOURCES.filter((resource) => productionPips[resource] === 0)),
    startingCards: Object.freeze(startingCards),
    ownedPorts: Object.freeze(ownedPorts),
    directRecipeCapacity: Object.freeze(directRecipeCapacities(productionPips)),
    directRecipeSurplus: Object.freeze(directRecipeSurpluses(productionPips)),
    tradeAdjustedRecipeCapacity: Object.freeze(
      tradeAdjustedRecipeCapacities(productionPips, ownedPorts, { precision })
    ),
    startingReadiness: Object.freeze(startingReadiness),
    expansion: Object.freeze(measureExpansionReach(facts, [firstNodeId, secondNodeId], occupiedNodeIds))
  });
}
```

Implement `readinessByRecipe(cards)` by consuming a copied multiset for each `DIRECT_RECIPES` entry and returning `{ canBuyNow, missingCardCount, missingResources, remainingCards }`.

For geography, `compileExpansionPaths(facts, orderedNodeIds)` enumerates deterministic one-edge and two-edge paths from either owned settlement. `measureExpansionReach(facts, orderedNodeIds, occupiedNodeIds, compiledPaths)` resolves those paths against the terminal setup: an opponent settlement blocks transit, any occupied node is excluded as an endpoint, and a two-road destination is excluded when it appears in any occupied settlement's `blockedNodeIds`. Return sorted unique `oneRoadNodeIds` (unoccupied road-frontier intersections) and `twoRoadNodeIds` (settlement-legal two-road destinations). Keep the compiled path descriptors and each node's blocked set as `BigInt` masks so Task 3 can count reachability without rebuilding a breadth-first search at every terminal. The ordinary `buildOpeningPortfolio` call materialises the sorted node arrays for reports; the solver may request counts only.

- [ ] **Step 4: Add failing policy identity and value tests**

Append:

```js
import {
  hashOpeningProfile,
  valueOpeningPortfolio
} from "../analysis/openingPolicy.mjs";

it("keeps feature identity separate from the profile hash", () => {
  expect(DUEL_FAIR_V2_PROFILE.featureVersion).toBe("duel-opening-features-v1");
  expect(DUEL_FAIR_V2_PROFILE.policyVersion).toBe("duel-fair-v2");
  expect(hashOpeningProfile(DUEL_FAIR_V2_PROFILE)).toMatch(/^[a-f0-9]{64}$/);
});

it("values a viable all-resource portfolio above a dead equal-production portfolio", () => {
  const viable = {
    totalProductionPips: 22,
    producedResourceCount: 5,
    missingProducedResources: [],
    directRecipeCapacity: { road: 3, settlement: 3, devCard: 3, city: 4 / 3 },
    directRecipeSurplus: { road: 4, settlement: 6, devCard: 3, city: 7 / 3 },
    tradeAdjustedRecipeCapacity: { road: 3, settlement: 3, devCard: 3, city: 4 / 3 },
    startingReadiness: { road: { canBuyNow: true }, settlement: { canBuyNow: false }, devCard: { canBuyNow: false }, city: { canBuyNow: false } },
    ownedPorts: [],
    expansion: { oneRoadNodeIds: [1], twoRoadNodeIds: [2, 3] },
    productionPips: { Wood: 7, Brick: 3, Sheep: 3, Wheat: 5, Ore: 4 }
  };
  const dead = {
    ...viable,
    totalProductionPips: 23,
    producedResourceCount: 3,
    missingProducedResources: [ResourceType.WOOD, ResourceType.ORE],
    directRecipeCapacity: { road: 0, settlement: 0, devCard: 0, city: 0 },
    directRecipeSurplus: { road: 8, settlement: 23, devCard: 15, city: 8 },
    tradeAdjustedRecipeCapacity: { road: 1, settlement: 1, devCard: 1, city: 1 },
    startingReadiness: { road: { canBuyNow: false }, settlement: { canBuyNow: false }, devCard: { canBuyNow: false }, city: { canBuyNow: false } },
    productionPips: { Wood: 0, Brick: 8, Sheep: 7, Wheat: 8, Ore: 0 }
  };
  expect(valueOpeningPortfolio(viable, DUEL_FAIR_V2_PROFILE.officialPolicy))
    .toBeGreaterThan(valueOpeningPortfolio(dead, DUEL_FAIR_V2_PROFILE.officialPolicy));
});
```

- [ ] **Step 5: Define the finite initial v2 profile**

Create `duelFairV2Profile.mjs` with these explicit initial values:

```js
const OFFICIAL_WEIGHTS = Object.freeze({
  totalProductionPips: 1,
  producedResourceCount: 0.8,
  missingProducedResourceCount: -1.2,
  directRoad: 0.55,
  directSettlement: 0.8,
  directDevCard: 0.8,
  directCity: 0.55,
  surplusRoad: 0.03,
  surplusSettlement: 0.02,
  surplusDevCard: 0.02,
  surplusCity: 0.02,
  tradeRoad: 0.12,
  tradeSettlement: 0.12,
  tradeDevCard: 0.12,
  tradeCity: 0.08,
  immediateRoad: 1.5,
  immediateSettlement: 2,
  immediateDevCard: 1.75,
  immediateCity: 2.5,
  ownedPortCount: 0.35,
  oneRoadExpansionCount: 0.08,
  twoRoadExpansionCount: 0.03,
  productionConcentration: -0.75
});

export const DUEL_FAIR_V2_PROFILE = Object.freeze({
  featureVersion: "duel-opening-features-v1",
  policyVersion: "duel-fair-v2",
  allowAdjacentReds: false,
  tradePrecision: 1e-6,
  maxNormalisedSeatAdvantage: 0.08,
  dominanceTolerance: 0.02,
  dominanceMargin: 0.08,
  lensDisagreementThreshold: 0.08,
  meaningfulLineTolerance: 0.05,
  forcedDefenceThreshold: 0.08,
  portDependenceThreshold: 0.25,
  minViableRecipeCapacity: 1,
  qualityTarget: 30,
  scarcityPipsThreshold: 7,
  resourceClusterShareThreshold: 0.67,
  strategyLeanRatio: 1.2,
  strategicMinFirstPicks: 2,
  strategicMinResponses: 2,
  strategicMinLineSensitivity: 0.08,
  knifeEdgeRegretThreshold: 0.08,
  lowCounterplayMaxResponses: 1,
  rankWeights: Object.freeze({ fairness: 0.6, quality: 0.3, placementDepth: 0.1 }),
  officialPolicy: Object.freeze({ name: "official", weights: OFFICIAL_WEIGHTS })
});

export const DUEL_FAIR_V2_LENSES = Object.freeze([
  Object.freeze({
    name: "expansion",
    weights: Object.freeze({ ...OFFICIAL_WEIGHTS, directRoad: 0.9, directSettlement: 1.1, directDevCard: 0.4, directCity: 0.3 })
  }),
  Object.freeze({
    name: "development",
    weights: Object.freeze({ ...OFFICIAL_WEIGHTS, directRoad: 0.3, directSettlement: 0.55, directDevCard: 1.1, directCity: 0.9 })
  })
]);
```

These are finite calibration starting values, not claims of final empirical truth. Later Task 5 adjusts only these explicit values if the approved fixtures fail their intended classification.

- [ ] **Step 6: Implement policy flattening, scoring, and hashing**

`flattenPolicyFeatures(portfolio)` must return exactly the keys in `OFFICIAL_WEIGHTS`. Map the four `surplus*` keys from `portfolio.directRecipeSurplus`. Define concentration as `max(resource pips) / totalProductionPips`, or zero when total is zero. `valueOpeningPortfolio` is the dot product of flattened features and policy weights and must reject missing/non-finite weights. `hashOpeningProfile` is SHA-256 over `JSON.stringify(profile)`.

```js
import { createHash } from "node:crypto";

export const hashOpeningProfile = (profile) => createHash("sha256")
  .update(JSON.stringify(profile))
  .digest("hex");
```

- [ ] **Step 7: Run Task 2 tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingFeatures.test.js scripts/duel-board-lab/__tests__/openingPortfolio.test.js --reporter=dot
```

Expected: all tests PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add scripts/duel-board-lab/analysis/openingPortfolio.mjs scripts/duel-board-lab/analysis/openingPolicy.mjs scripts/duel-board-lab/analysis/duelFairV2Profile.mjs scripts/duel-board-lab/__tests__/openingPortfolio.test.js
git commit -m "feat: value ordered duel opening portfolios"
```

---

### Task 3: Exact Opening Draft Solver

**Files:**
- Create: `scripts/duel-board-lab/analysis/openingDraftSolver.mjs`
- Create: `scripts/duel-board-lab/__tests__/openingDraftSolver.test.js`

**Interfaces:**
- Consumes: `buildOpeningPortfolio`, compiled expansion paths, `flattenPolicyFeatures`, immutable board facts, and one policy.
- Produces: `solveOpeningDraft(facts, { policy, precision })` with `line`, ordered portfolios, values, normalised seat advantage, root options, and selected-root response options.

- [ ] **Step 1: Write a failing synthetic denial test**

Use a complete six-node synthetic facts object. Node 1 has the highest individual production, but taking the scarce brick at node 4 lets P1 complete a road-producing pair while denying that complement to P2. The helper includes every field consumed by the portfolio and solver modules:

```js
import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { solveOpeningDraft } from "../analysis/openingDraftSolver.mjs";

const FEATURE_KEYS = Object.freeze([
  "totalProductionPips", "producedResourceCount", "missingProducedResourceCount",
  "directRoad", "directSettlement", "directDevCard", "directCity",
  "surplusRoad", "surplusSettlement", "surplusDevCard", "surplusCity",
  "tradeRoad", "tradeSettlement", "tradeDevCard", "tradeCity",
  "immediateRoad", "immediateSettlement", "immediateDevCard", "immediateCity",
  "ownedPortCount", "oneRoadExpansionCount", "twoRoadExpansionCount",
  "productionConcentration"
]);

const TEST_POLICY = Object.freeze({
  name: "synthetic-denial",
  weights: Object.freeze(Object.fromEntries(FEATURE_KEYS.map((key) => [key, ({
    totalProductionPips: 0.1,
    directRoad: 5,
    directSettlement: 5,
    directDevCard: 5,
    directCity: 3
  })[key] ?? 0])))
});

const zeroPips = () => ({ Wood: 0, Brick: 0, Sheep: 0, Wheat: 0, Ore: 0 });

function factsFromNodeSpecs(specs, blockedByNodeId) {
  const nodes = specs.map(({ nodeId, resource, pips }) => ({
    nodeId,
    totalPips: pips,
    resourcePips: { ...zeroPips(), [resource]: pips },
    resources: [resource],
    port: null,
    blockedNodeIds: [...blockedByNodeId[nodeId]].sort((left, right) => left - right)
  }));
  return {
    tiles: [],
    nodes,
    legalPairs: nodes.flatMap((left, leftIndex) => nodes.slice(leftIndex + 1)
      .filter((right) => !left.blockedNodeIds.includes(right.nodeId))
      .map((right) => [left.nodeId, right.nodeId])),
    topology: {
      nodeNeighbors: Object.fromEntries(nodes.map((node) => [
        node.nodeId,
        node.blockedNodeIds.filter((nodeId) => nodeId !== node.nodeId)
      ]))
    },
    validityErrors: [],
    redAdjacencyPairs: []
  };
}

function syntheticDenialFacts() {
  const specs = [
    { nodeId: 1, resource: ResourceType.WOOD, pips: 10 },
    { nodeId: 2, resource: ResourceType.WOOD, pips: 9 },
    { nodeId: 3, resource: ResourceType.WOOD, pips: 8 },
    { nodeId: 4, resource: ResourceType.BRICK, pips: 7 },
    { nodeId: 5, resource: ResourceType.SHEEP, pips: 6 },
    { nodeId: 6, resource: ResourceType.WHEAT, pips: 5 }
  ];
  return factsFromNodeSpecs(specs, Object.fromEntries(specs.map(({ nodeId }) => [nodeId, [nodeId]])));
}

function symmetricTieFacts() {
  const specs = Array.from({ length: 8 }, (_, index) => ({
    nodeId: index + 1,
    resource: ResourceType.WOOD,
    pips: 1
  }));
  const blockedByNodeId = Object.fromEntries(specs.map(({ nodeId }) => {
    const pairedNodeId = nodeId % 2 === 0 ? nodeId - 1 : nodeId + 1;
    return [nodeId, [nodeId, pairedNodeId]];
  }));
  return factsFromNodeSpecs(specs, blockedByNodeId);
}

it("chooses a lower raw-production first pick when denial improves P1's final result", () => {
  const facts = syntheticDenialFacts();
  const result = solveOpeningDraft(facts, {
    policy: TEST_POLICY,
    precision: 1e-6
  });
  expect(result.line.map(({ player, nodeId }) => ({ player, nodeId }))).toEqual([
    { player: "P1", nodeId: 4 },
    { player: "P2", nodeId: 1 },
    { player: "P2", nodeId: 2 },
    { player: "P1", nodeId: 3 }
  ]);
  expect(result.p1Portfolio.settlementNodeIds).toEqual([4, 3]);
  expect(result.p2Portfolio.settlementNodeIds).toEqual([1, 2]);
  expect(result.rootOptions).toEqual(expect.arrayContaining([
    expect.objectContaining({ nodeId: 1 }),
    expect.objectContaining({ nodeId: 4 })
  ]));
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingDraftSolver.test.js --reporter=dot
```

Expected: FAIL because `openingDraftSolver.mjs` does not exist.

- [ ] **Step 3: Implement deterministic backward induction**

Use the exact player order, numeric sequence comparison, and precomputed blocker masks:

```js
const PLAYERS = Object.freeze(["P1", "P2", "P2", "P1"]);

function compareNodeIdSequences(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function normaliseSeatAdvantage(p1Value, p2Value) {
  return (p1Value - p2Value) / Math.max(Math.abs(p1Value), Math.abs(p2Value), 1);
}

function materialiseTerminal(facts, nodeIds, policy, precision) {
  const [p1First, p2First, p2Second, p1Second] = nodeIds;
  const p1Portfolio = buildOpeningPortfolio(
    facts,
    [p1First, p1Second],
    { occupiedNodeIds: nodeIds, precision }
  );
  const p2Portfolio = buildOpeningPortfolio(
    facts,
    [p2First, p2Second],
    { occupiedNodeIds: nodeIds, precision }
  );
  const p1Value = valueOpeningPortfolio(p1Portfolio, policy);
  const p2Value = valueOpeningPortfolio(p2Portfolio, policy);
  return {
    line: nodeIds.map((nodeId, index) => ({ player: PLAYERS[index], nodeId })),
    p1Portfolio,
    p2Portfolio,
    p1Value,
    p2Value,
    seatAdvantage: p1Value - p2Value,
    normalisedSeatAdvantage: normaliseSeatAdvantage(p1Value, p2Value)
  };
}
```

Before recursion, build an ordered-pair index for both directions of every `facts.legalPairs` entry. Each entry stores the static portfolio features, compiled expansion paths, the policy value with expansion counts zeroed, and the pair's starting-card order. At a terminal sequence `[p1First, p2First, p2Second, p1Second]`, calculate only two expansion counts per player against the four-settlement blocker mask, add the two configured expansion-weight contributions to the precomputed pair value, and return the scalar values plus node-ID sequence. Do not allocate full portfolios at each of the roughly 5.5 million legal terminal sequences on a standard board.

Implement recursive search where P1 steps select the maximum terminal `seatAdvantage` and P2 steps select the minimum. Apply every picked node's complete blocker mask to a copied `BigInt` exclusion mask. Treat values within `precision` as equal, then choose the numerically lexicographically smaller node-ID sequence. After selecting the line, call `materialiseTerminal` once and assert that both materialised policy values match the selected scalar values within `precision`; throw `opening-solver-precompute-drift` on disagreement. This makes the optimisation testable without weakening exactness.

The public result additionally returns:

```js
{
  ...selectedTerminal,
  rootOptions: [{ nodeId, seatAdvantage, normalisedSeatAdvantage, line }],
  responseOptions: [{ nodeIds: [p2First, p2Second], seatAdvantage, normalisedSeatAdvantage, line }]
}
```

Collect root options during the root search. Re-run only the chosen P1-first branch while grouping terminal scalars by the ordered P2 pair to produce response summaries; sort them by `seatAdvantage` and then node IDs, retain the best 32, and do not retain the complete search tree.

- [ ] **Step 4: Add distance and deterministic-tie tests**

```js
it("never emits adjacent settlement picks", () => {
  const facts = symmetricTieFacts();
  const result = solveOpeningDraft(facts, { policy: TEST_POLICY, precision: 1e-6 });
  for (const pick of result.line) {
    const node = facts.nodes.find((entry) => entry.nodeId === pick.nodeId);
    const otherIds = result.line.filter((entry) => entry !== pick).map((entry) => entry.nodeId);
    expect(otherIds.some((nodeId) => node.blockedNodeIds.includes(nodeId))).toBe(false);
  }
});

it("uses node-id sequence as the final tie breaker", () => {
  const result = solveOpeningDraft(symmetricTieFacts(), { policy: TEST_POLICY, precision: 1e-6 });
  expect(result.line.map((pick) => pick.nodeId)).toEqual([1, 3, 5, 7]);
});
```

- [ ] **Step 5: Run solver and feature tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/openingDraftSolver.test.js scripts/duel-board-lab/__tests__/openingPortfolio.test.js scripts/duel-board-lab/__tests__/openingFeatures.test.js --reporter=dot
```

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add scripts/duel-board-lab/analysis/openingDraftSolver.mjs scripts/duel-board-lab/__tests__/openingDraftSolver.test.js
git commit -m "feat: solve duel opening placement order"
```

---

### Task 4: Fairness, Quality, and Placement Depth

**Files:**
- Create: `scripts/duel-board-lab/analysis/placementDepth.mjs`
- Create: `scripts/duel-board-lab/analysis/evaluateDuelBoardV2.mjs`
- Create: `scripts/duel-board-lab/__tests__/evaluatorV2.test.js`
- Modify: `scripts/duel-board-lab/constants.mjs`

**Interfaces:**
- Consumes: v2 profile, exact solver, v1 board facts, and v1 settlement values only for the explicitly named greedy baseline.
- Produces: `evaluateDuelBoardV2(tiles, { profile, includeDiagnosticLenses })`, `measurePlacementDepth({ facts, solved, policy, profile })`, pure `classifySolvedOpening({ solved, diagnosticLensResults, placementDepth, profile })` and `buildDuelTags({ facts, fairness, quality, placementDepth, profile })` helpers, `EVALUATOR_VERSIONS`, and `EVALUATOR_VERSION` remaining aliased to v1.

- [ ] **Step 1: Write the failing complete-report contract test**

```js
import { describe, expect, it } from "vitest";
import { evaluateDuelBoardV2 } from "../analysis/evaluateDuelBoardV2.mjs";
import { generateCandidate, BOARD_FAMILIES } from "../generators/generateCandidate.mjs";

it("returns separate exact-audit fairness, quality, and placement-depth results", () => {
  const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
  const report = evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: false });
  expect(report).toEqual(expect.objectContaining({
    evaluatorIdentity: {
      featureVersion: "duel-opening-features-v1",
      policyVersion: "duel-fair-v2",
      profileHash: expect.stringMatching(/^[a-f0-9]{64}$/)
    },
    screenVerdict: "pass",
    screenRejectionCodes: [],
    fairness: expect.objectContaining({
      verdict: expect.stringMatching(/pass|reject|review/),
      favouredSeat: expect.stringMatching(/P1|P2/),
      solvedLine: expect.arrayContaining([expect.objectContaining({ player: "P1", nodeId: expect.any(Number) })]),
      portfolios: {
        P1: expect.objectContaining({ policyFeatures: expect.any(Object) }),
        P2: expect.objectContaining({ policyFeatures: expect.any(Object) })
      }
    }),
    quality: expect.objectContaining({ weakerPortfolioValue: expect.any(Number), viableRecipeCounts: expect.any(Object) }),
    placementDepth: expect.objectContaining({
      greedyRegret: expect.any(Number),
      meaningfulFirstPickCount: expect.any(Number),
      meaningfulResponseCount: expect.any(Number),
      forcedDefence: expect.any(Boolean)
    }),
    rankingComponents: expect.objectContaining({
      fairnessScore: expect.any(Number),
      qualityScore: expect.any(Number),
      depthScore: expect.any(Number)
    }),
    tags: expect.any(Array)
  }));
  expect(report.overallScore === null || Number.isFinite(report.overallScore)).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluatorV2.test.js --reporter=dot
```

Expected: FAIL because `evaluateDuelBoardV2.mjs` does not exist.

- [ ] **Step 3: Implement placement-depth metrics**

`measurePlacementDepth({ facts, solved, policy, profile })` must:

1. Produce a greedy line by sorting `valueSettlements(facts)` by current `generalScore` and taking the next legal node in `P1, P2, P2, P1` order.
2. Build and value the two ordered greedy portfolios with the v2 policy.
3. Return:

```js
{
  greedyLine,
  greedyPortfolios: { P1: greedyP1Portfolio, P2: greedyP2Portfolio },
  greedySeatAdvantage,
  greedyNormalisedSeatAdvantage,
  greedyRegret: Math.abs(solved.normalisedSeatAdvantage - greedyNormalisedSeatAdvantage),
  meaningfulFirstPickCount: solved.rootOptions.filter((option) =>
    solved.normalisedSeatAdvantage - option.normalisedSeatAdvantage <= profile.meaningfulLineTolerance
  ).length,
  meaningfulResponseCount: solved.responseOptions.filter((option) =>
    option.normalisedSeatAdvantage
      - Math.min(...solved.responseOptions.map((entry) => entry.normalisedSeatAdvantage))
      <= profile.meaningfulLineTolerance
  ).length,
  forcedDefence,
  lineSensitivity
}
```

`forcedDefence` is true when exactly one root option has `normalisedSeatAdvantage >= -profile.maxNormalisedSeatAdvantage` and every other root option is below `-profile.forcedDefenceThreshold`. `lineSensitivity` is the maximum minus minimum normalised root-option advantage.

- [ ] **Step 4: Implement structural screening and v2 report composition**

`evaluateDuelBoardV2` must:

1. Build immutable facts.
2. Validate standard counts, all nine port resources/endpoints, finite node features, and enough legal nodes for a complete draft. Return `screenVerdict: "reject"`, the sorted stable code(s) from `invalid-counts`, `incomplete-port-topology`, `non-finite-features`, `adjacent-red-numbers`, and `no-legal-complete-draft`, plus `fairness: null`, `quality: null`, `placementDepth: null`, `rankingComponents: null`, and `overallScore: null` on failure.
3. Solve the official policy exactly.
4. Optionally solve both diagnostic lenses.
5. Calculate portfolio dominance over this vector:

```js
[
  totalProductionPips,
  producedResourceCount,
  directRecipeCapacity.road,
  directRecipeCapacity.settlement,
  directRecipeCapacity.devCard,
  directRecipeCapacity.city,
  Object.values(startingReadiness).filter((entry) => entry.canBuyNow).length
]
```

Normalise each left-versus-right component as `(left - right) / Math.max(Math.abs(left), Math.abs(right), 1)`. One portfolio dominates when every normalised component is at least `-dominanceTolerance` and at least one reaches `dominanceMargin`. Test both directions and report the dominating seat; equal vectors do not dominate.

6. Set `reject` for excessive official normalised seat advantage or material dominance.
7. Set `review` for diagnostic-lens disagreement, forced defence, or trade-adjusted capacity exceeding direct capacity by the configured port-dependence threshold. Lens disagreement means two of the official/expansion/development results have opposite signs and both absolute normalised advantages reach `lensDisagreementThreshold`. Port dependence uses the largest per-recipe `(tradeAdjusted - direct) / Math.max(tradeAdjusted, 1)` value across both portfolios.
8. Otherwise set `pass`.
9. Calculate quality from the weaker official portfolio, per-player direct viable recipe counts, per-player trade-adjusted viable recipe counts, no-credible-recipe lists, and port dependence.
10. Add deterministic tags from the explicit profile thresholds:
    - `<resource>-scarce` when board-wide pips are at or below `scarcityPipsThreshold`;
    - `resource-clustered` when any same-resource connected tile component contains at least `resourceClusterShareThreshold` of that resource's pips;
    - `port-dependent` when either portfolio's largest `(trade - direct) / max(trade, 1)` recipe ratio reaches `portDependenceThreshold`;
    - `expansion-leaning` or `development-leaning` when the corresponding sum of official direct recipe capacities exceeds the other by `strategyLeanRatio` for both solved portfolios combined;
    - `strategic` when meaningful first picks, meaningful responses, and line sensitivity all reach their `strategic*` thresholds;
    - `knife-edge` when `forcedDefence` is true or normalised greedy regret reaches `knifeEdgeRegretThreshold` while only one first pick is meaningful;
    - `low-counterplay` when meaningful responses are at or below `lowCounterplayMaxResponses`;
    - `starting-tempo-asymmetry` when the players' immediate-ready recipe counts differ.

The non-null fairness payload must expose:

```js
{
  verdict,
  favouredSeat: Math.abs(seatAdvantage) <= profile.tradePrecision
    ? null
    : seatAdvantage > 0 ? "P1" : "P2",
  seatAdvantage,
  normalisedSeatAdvantage,
  solvedLine,
  portfolios: {
    P1: { ...p1Portfolio, policyFeatures: flattenPolicyFeatures(p1Portfolio) },
    P2: { ...p2Portfolio, policyFeatures: flattenPolicyFeatures(p2Portfolio) }
  },
  rejectionCodes,
  reviewCodes,
  diagnosticLensResults
}
```

Use these explicit diagnostic component scores for every completed exact audit:

```js
const fairnessScore = 100 * (1 - Math.min(
  Math.abs(normalisedSeatAdvantage) / profile.maxNormalisedSeatAdvantage,
  1
));
const qualityScore = 100 * Math.min(Math.max(weakerPortfolioValue / profile.qualityTarget, 0), 1);
const depthScore = 100 * Math.min(placementDepth.meaningfulFirstPickCount / 4, 1);
const overallScore = fairnessScore * profile.rankWeights.fairness
  + qualityScore * profile.rankWeights.quality
  + depthScore * profile.rankWeights.placementDepth;
```

Expose `{ fairnessScore, qualityScore, depthScore }` as `rankingComponents`. Set `overallScore` to the weighted value only when `fairness.verdict === "pass"`; review, rejected, screen-rejected, and unaudited boards have `overallScore: null` and are ineligible for an automatic catalog.

- [ ] **Step 5: Preserve the v1 evaluator identity while exporting v2**

Update `constants.mjs`:

```js
export const EVALUATOR_VERSIONS = Object.freeze({
  V1: "duel-fair-v1",
  V2: "duel-fair-v2"
});

export const EVALUATOR_VERSION = EVALUATOR_VERSIONS.V1;
```

Do not change any existing v1 import or manifest output.

- [ ] **Step 6: Add screen rejection and diagnostic-lens tests**

```js
it("keeps adjacent reds as a default-profile screen rejection", () => {
  const candidate = generateCandidate({ family: BOARD_FAMILIES.FREEFORM_RANDOM, seed: 1 });
  const report = evaluateDuelBoardV2(candidate.tiles);
  expect(report.screenVerdict).toBe("reject");
  expect(report.screenRejectionCodes).toContain("adjacent-red-numbers");
  expect(report.fairness).toBeNull();
});

it("records diagnostic lenses without letting them replace the official solved line", () => {
  const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
  const withoutLenses = evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: false });
  const withLenses = evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: true });
  expect(withLenses.fairness.solvedLine).toEqual(withoutLenses.fairness.solvedLine);
  expect(withLenses.fairness.diagnosticLensResults.map((entry) => entry.name))
    .toEqual(["expansion", "development"]);
});
```

In the same test file, exercise the pure classification/tag helpers with finite synthetic solved summaries:

- equal total production where P1 materially dominates direct recipe viability returns `reject` with `portfolio-dominance`;
- equal official value where viability exists only through trade adjustment returns `review` with `port-dependent`;
- two meaningful first picks, two meaningful responses, and sufficient line sensitivity produce `strategic` on an otherwise passing case;
- one safe first pick, all other roots below the forced-defence threshold, and high greedy regret produce `review` plus `knife-edge`;
- board-wide resource pips at the scarcity threshold add the resource scarcity tag but do not add a rejection code.

Construct every synthetic portfolio with all five production keys, all four direct and trade-adjusted capacities, four readiness entries, expansion arrays, and finite official values. Assert the complete `{ verdict, rejectionCodes, reviewCodes }` classification and the complete sorted tag array for each case; do not use partial objects that bypass a production branch.

- [ ] **Step 7: Run v2 and v1 evaluator tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluatorV2.test.js scripts/duel-board-lab/__tests__/evaluator.test.js --reporter=dot
```

Expected: all tests PASS and v1 snapshots remain unchanged.

- [ ] **Step 8: Commit Task 4**

```bash
git add scripts/duel-board-lab/analysis/placementDepth.mjs scripts/duel-board-lab/analysis/evaluateDuelBoardV2.mjs scripts/duel-board-lab/__tests__/evaluatorV2.test.js scripts/duel-board-lab/constants.mjs
git commit -m "feat: evaluate duel opening fairness and depth"
```

---

### Task 5: Seed 47 and Seed 2604 Calibration Fixtures

**Files:**
- Modify: `scripts/duel-board-lab/fixtures/buildFixtures.mjs`
- Create by deterministic script: `scripts/duel-board-lab/fixtures/official-seed-47-p1-dominance.json`
- Create by deterministic script: `scripts/duel-board-lab/fixtures/official-seed-2604-strategic-denial.json`
- Modify: `scripts/duel-board-lab/__tests__/evaluatorV2.test.js`
- Modify only if fixture expectations require calibration: `scripts/duel-board-lab/analysis/duelFairV2Profile.mjs`

**Interfaces:**
- Consumes: official-spiral generator v1 and exact v2 report.
- Produces: durable full-tile calibration fixtures and stable full-contract expectations.

- [ ] **Step 1: Add both durable fixture descriptors**

Append to `descriptors`:

```js
["official-seed-47-p1-dominance", "P1 takes the premium ore/wood/sheep spot and retains a viable all-resource response", "official-spiral", 47],
["official-seed-2604-strategic-denial", "P1 may need a lower raw-value brick/sheep/wood denial opening", "official-spiral", 2604]
```

- [ ] **Step 2: Generate fixtures and verify provenance**

Run:

```bash
node scripts/duel-board-lab/fixtures/buildFixtures.mjs
jq '{label,family,generatorVersion,seed,boardHash,canonicalSymmetryHash}' scripts/duel-board-lab/fixtures/official-seed-47-p1-dominance.json scripts/duel-board-lab/fixtures/official-seed-2604-strategic-denial.json
```

Expected: seeds `47` and `2604`, family `official-spiral`, generator version `official-spiral-v1`, and non-empty hashes.

- [ ] **Step 3: Add failing calibration expectations**

```js
import { ResourceType } from "@settlex/game-core";
import { readFileSync } from "node:fs";

const readFixture = (name) => JSON.parse(readFileSync(
  new URL(`../fixtures/${name}.json`, import.meta.url),
  "utf8"
));

it("does not allow seed 47 to remain a top automatic pass", () => {
  const report = evaluateDuelBoardV2(readFixture("official-seed-47-p1-dominance").tiles);
  expect(report.fairness.verdict).not.toBe("pass");
  expect(report.fairness.favouredSeat).toBe("P1");
  expect(report.fairness.solvedLine).toHaveLength(4);
  expect(report.placementDepth.greedyLine.map((pick) => pick.nodeId)).toEqual([0, 6, 44, 23]);
  expect(report.placementDepth.greedyPortfolios.P1.producedResourceCount).toBe(5);
  expect(report.placementDepth.greedyPortfolios.P1.startingReadiness.road.canBuyNow).toBe(true);
  expect(report.placementDepth.greedyPortfolios.P2.missingProducedResources)
    .toEqual([ResourceType.WOOD, ResourceType.ORE]);
});

it("sends seed 2604 to review and exposes starting dev-card tempo", () => {
  const report = evaluateDuelBoardV2(
    readFixture("official-seed-2604-strategic-denial").tiles,
    { includeDiagnosticLenses: true }
  );
  expect(report.fairness.verdict).toBe("review");
  expect(report.fairness.solvedLine[0]).toEqual({ player: "P1", nodeId: 31 });
  const p2 = report.fairness.portfolios.P2;
  expect(p2.settlementNodeIds[1]).toBe(0);
  expect(p2.startingCards).toEqual([
    ResourceType.ORE,
    ResourceType.SHEEP,
    ResourceType.WHEAT
  ]);
  expect(p2.startingReadiness.devCard.canBuyNow).toBe(true);
  expect(report.tags).toContain("strategic");
});
```

The Task 4 report contract exposes the asserted `fairness.portfolios.P1` and `fairness.portfolios.P2` aliases.

- [ ] **Step 4: Run the fixture tests and record the actual disagreement**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluatorV2.test.js --reporter=verbose
```

Expected initial result: at least one calibration assertion may FAIL because the finite Task 2 weights are provisional. Record the actual solved lines, portfolios, and component values before changing weights.

- [ ] **Step 5: Calibrate only policy values, not feature algorithms**

Adjust finite values in `DUEL_FAIR_V2_PROFILE` and its lenses until:

- seed 47 is `reject` or review-blocked with P1 favoured;
- seed 2604 is `review`, starts with the defensive node `31`, and exposes P2's dev-ready node-`0` starting hand;
- Task 1-4 synthetic logic tests remain unchanged;
- v1 snapshots remain unchanged.

Do not special-case either seed, board hash, node ID, or generator family in production evaluator code.

- [ ] **Step 6: Assert complete stable calibration summaries**

For each new fixture, snapshot this complete subset:

```js
{
  evaluatorIdentity: report.evaluatorIdentity,
  screenVerdict: report.screenVerdict,
  fairness: {
    verdict: report.fairness.verdict,
    favouredSeat: report.fairness.favouredSeat,
    normalisedSeatAdvantage: Number(report.fairness.normalisedSeatAdvantage.toFixed(6)),
    solvedLine: report.fairness.solvedLine,
    portfolios: report.fairness.portfolios
  },
  quality: report.quality,
  placementDepth: report.placementDepth,
  rankingComponents: report.rankingComponents,
  tags: report.tags,
  overallScore: report.overallScore == null ? null : Number(report.overallScore.toFixed(4))
}
```

Run the same complete-subset snapshot over the six existing fixtures (`scarce-but-fair`, `wheat-monopoly`, `dominant-settlement`, `varied-openings`, `first-pick-sensitive`, and `second-pick-sensitive`). These are observation locks, not instructions to preserve their v1 verdicts under v2. Keep every existing v1 snapshot unchanged.

Also add one rotation and one reflection invariance test using `transformTiles` with indices `1` and `6`. Compare evaluator identity, structural and fairness verdicts, favoured seat, normalised seat advantage rounded to six decimals, quality, the scalar placement-depth fields, tags, and nullable overall score against the untransformed seed-2604 report. Do not compare raw node IDs across a future topology implementation that may renumber transformed boards; instead assert that every transformed solved line is legal and has the same four player labels.

- [ ] **Step 7: Run all board-lab tests**

Run:

```bash
pnpm test:board-lab
```

Expected: all board-lab tests PASS, including unchanged v1 snapshots.

- [ ] **Step 8: Commit Task 5**

```bash
git add scripts/duel-board-lab/fixtures/buildFixtures.mjs scripts/duel-board-lab/fixtures/official-seed-47-p1-dominance.json scripts/duel-board-lab/fixtures/official-seed-2604-strategic-denial.json scripts/duel-board-lab/__tests__/evaluatorV2.test.js scripts/duel-board-lab/__tests__/__snapshots__ scripts/duel-board-lab/analysis/duelFairV2Profile.mjs
git commit -m "test: calibrate duel fair v2 example boards"
```

---

### Task 6: Geographic Ports and Explainable V2 Reports

**Files:**
- Modify: `scripts/duel-board-lab/reports/renderBoard.mjs`
- Modify: `scripts/duel-board-lab/reports/buildReport.mjs`
- Modify: `scripts/duel-board-lab/__tests__/reports.test.js`

**Interfaces:**
- Consumes: selected board payloads with `diagnosticV2` and solved lines.
- Produces: `renderBoardSvg({ tiles, record, diagnosticV2 })` with geographic ports and placements, plus HTML portfolio summaries.

- [ ] **Step 1: Write failing SVG geography tests**

```js
it("renders geographic ports and solved placement markers", () => {
  const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
  const diagnosticV2 = evaluateDuelBoardV2(candidate.tiles);
  const svg = renderBoardSvg({
    tiles: candidate.tiles,
    record: { seed: 47, generatorFamily: "official-spiral", overallScore: 80, verdict: "pass" },
    diagnosticV2
  });
  expect(svg.match(/data-port-resource=/g)).toHaveLength(9);
  expect(svg.match(/data-placement-pick=/g)).toHaveLength(4);
  expect(svg).not.toContain("Ports:");
});
```

- [ ] **Step 2: Run report tests and verify the failure**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/reports.test.js --reporter=dot
```

Expected: FAIL because ports are still a text legend and placement markers are absent.

- [ ] **Step 3: Add reusable node and port positions**

In `renderBoard.mjs`, define the pointy-hex vertex angles:

```js
const NODE_ANGLES = Object.freeze({
  NORTH: -90,
  NORTHEAST: -30,
  SOUTHEAST: 30,
  SOUTH: 90,
  SOUTHWEST: 150,
  NORTHWEST: 210
});
```

Build `nodePixelPositions(tiles)` by projecting every land tile's named node at `HEX_SIZE` from its centre and averaging duplicate observations per node ID. Render each port at the midpoint of its two endpoint nodes, shifted 55% toward `cubeToPixel(port.coordinate)`, with a connector line back to the endpoint midpoint. Add escaped `data-port-resource` and `data-port-node-ids` attributes.

Render solved line markers at the averaged node positions:

```html
<g data-placement-pick="1" data-player="P1">
  <circle cx="${point.x}" cy="${point.y}" r="14" fill="#2563eb" stroke="#ffffff" stroke-width="2" />
  <text x="${point.x}" y="${point.y + 4}" text-anchor="middle" fill="#ffffff" font-size="9">P1 · 1</text>
</g>
```

Use blue for P1 and red for P2. The SVG remains self-contained and accessible.

- [ ] **Step 4: Add failing HTML explanation tests**

```js
expect(html).toContain("Starting hand");
expect(html).toContain("Direct recipe capacity");
expect(html).toContain("Trade-adjusted capacity");
expect(html).toContain("Placement depth");
expect(html).toContain("Official seat advantage");
expect(html).toContain("Material alternative lines");
```

- [ ] **Step 5: Render structured v2 diagnostics**

Update `renderBoardCard` to accept and pass `diagnosticV2`. Add escaped tables for:

- separately labelled v1 screen verdict/score and v2 audit verdict/nullable score;
- P1 and P2 ordered node IDs;
- full production vectors;
- starting-card multisets;
- direct and trade-adjusted capacities;
- immediate recipe readiness;
- fairness verdict, favoured seat, official advantage, and diagnostic lenses;
- quality values, placement depth, and tags.
- root or response alternatives whose normalised advantage differs from the solved line by at least `profile.meaningfulLineTolerance`, capped at eight rows and sorted by absolute outcome change then node IDs.

Do not interpolate raw JSON into HTML without `escapeHtml`. Keep the full JSON diagnostic in a collapsible `<details>` block rather than making it the primary explanation.

- [ ] **Step 6: Run report and evaluator tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/reports.test.js scripts/duel-board-lab/__tests__/evaluatorV2.test.js --reporter=dot
```

Expected: all tests PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add scripts/duel-board-lab/reports/renderBoard.mjs scripts/duel-board-lab/reports/buildReport.mjs scripts/duel-board-lab/__tests__/reports.test.js
git commit -m "feat: explain duel v2 board audits"
```

---

### Task 7: Bounded V2 Audit Integration

**Files:**
- Modify: `scripts/duel-board-lab/constants.mjs`
- Modify: `scripts/duel-board-lab/lib/cliOptions.mjs`
- Modify: `scripts/duel-board-lab/lib/runBatch.mjs`
- Modify: `scripts/duel-board-lab/lib/runStore.mjs`
- Modify: `scripts/duel-board-lab/generate.mjs`
- Modify: `scripts/duel-board-lab/compare.mjs`
- Modify: `scripts/duel-board-lab/reports/buildReport.mjs`
- Modify: `scripts/duel-board-lab/__tests__/cliOptions.test.js`
- Modify: `scripts/duel-board-lab/__tests__/runStore.test.js`
- Modify: `scripts/duel-board-lab/__tests__/reports.test.js`

**Interfaces:**
- Consumes: exact `evaluateDuelBoardV2` and existing bounded v1 selected candidates.
- Produces: `--v2-audit-selections`, compatible manifest identity, `diagnosticV2` selected payloads, and v2 audited verdict counts.

- [ ] **Step 1: Add failing CLI option tests**

```js
expect(parseGenerateOptions([
  "--family", "official-spiral",
  "--count", "10",
  "--run-id", "v2-smoke",
  "--v2-audit-selections"
])).toEqual(expect.objectContaining({ v2AuditSelections: true }));

expect(parseGenerateOptions([
  "--family", "official-spiral",
  "--count", "10",
  "--run-id", "v1-compatible"
])).toEqual(expect.objectContaining({ v2AuditSelections: false }));
```

- [ ] **Step 2: Run CLI tests and verify the unknown-option failure**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/cliOptions.test.js --reporter=dot
```

Expected: FAIL because the boolean option is not declared.

- [ ] **Step 3: Parse and propagate the explicit audit flag**

Add this option to generate and compare parsing:

```js
"v2-audit-selections": { type: "boolean", default: false }
```

Return `v2AuditSelections: values["v2-audit-selections"]`. Pass it through `generate.mjs`, `compare.mjs`, and `runBatch` arguments without changing the default.

- [ ] **Step 4: Add failing selected-payload and manifest tests**

Extend the batch runner test:

```js
const options = {
  family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
  startSeed: 45,
  count: 4,
  shortlistSize: 1,
  auditSelections: true,
  v2AuditSelections: true
};
const summary = await runBatch({ runDir, ...options });
expect(summary.v2Audited.total).toBeGreaterThan(0);
expect(summary.v2Audited).toEqual(expect.objectContaining({ pass: expect.any(Number), review: expect.any(Number), reject: expect.any(Number) }));

const payload = JSON.parse(await readFile(join(runDir, "boards", boardFiles[0]), "utf8"));
expect(payload.diagnosticV2.evaluatorIdentity.policyVersion).toBe("duel-fair-v2");
expect(payload.diagnosticV2.fairness?.solvedLine ?? []).toHaveLength(4);

const manifest = JSON.parse(await readFile(join(runDir, "manifest.json"), "utf8"));
expect(manifest.v2AuditSelections).toBe(true);
expect(manifest.v2FeatureVersion).toBe("duel-opening-features-v1");
expect(manifest.v2PolicyVersion).toBe("duel-fair-v2");
expect(manifest.v2ProfileHash).toMatch(/^[a-f0-9]{64}$/);
```

- [ ] **Step 5: Add compatible manifest identity**

Append these keys to `MANIFEST_KEYS`:

```js
"v2AuditSelections",
"v2FeatureVersion",
"v2PolicyVersion",
"v2ProfileHash"
```

When `v2AuditSelections` is false, set all three v2 identity values to `null`, not `undefined`, so old and new manifests compare predictably. Add a compatibility test showing an existing v1 manifest resumes with the default false/null values after normalising missing keys to null in `assertCompatibleManifest`.

Use this exact compatibility normaliser before the `MANIFEST_KEYS` loop:

```js
const MANIFEST_DEFAULTS = Object.freeze({
  v2AuditSelections: false,
  v2FeatureVersion: null,
  v2PolicyVersion: null,
  v2ProfileHash: null
});

function manifestValue(manifest, key) {
  return manifest[key] === undefined && Object.hasOwn(MANIFEST_DEFAULTS, key)
    ? MANIFEST_DEFAULTS[key]
    : manifest[key];
}
```

Compare `manifestValue(existing, key)` with `manifestValue(requested, key)`. When creating a new manifest, write all four keys explicitly. Do not rewrite an already-compatible historical manifest merely to add defaults; its next completed write inherits the existing file body while compatibility remains stable.

- [ ] **Step 6: Evaluate only bounded selected boards with v2**

Keep streamed `candidates.jsonl` rows and v1 selection ranks unchanged. Inside the existing selected-board materialisation loop:

```js
const diagnosticV2 = v2AuditSelections
  ? evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: true })
  : null;

await store.writeBoard(`candidate-${selectedCandidate.record.candidateIndex}`, {
  selectionGroups: selectedCandidate.selectionGroups,
  record: selectedCandidate.record,
  diagnostic,
  diagnosticV2,
  tiles: candidate.tiles
});
```

Accumulate `summary.v2Audited` from exact diagnostics with keys `total`, `pass`, `review`, `reject`, and `screenReject`. A v1 candidate record must never be relabelled as a v2 pass.

`buildReport` must read the completed manifest's `summary.v2Audited` and render a separate “Exact v2 selected-board audits” count block. Keep `summary.json` as the v1 streamed-corpus summary and add `v2Audited` only as a sibling field; do not merge v1 and v2 verdict counts.

- [ ] **Step 7: Make inspection always show both evaluators**

Update `inspectCandidate` to calculate v1 diagnostic plus exact v2 diagnostic and pass both to `renderInspectionDocument`. Preserve hash-drift rejection before either evaluator runs.

- [ ] **Step 8: Run run-store, CLI, and report tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/cliOptions.test.js scripts/duel-board-lab/__tests__/runStore.test.js scripts/duel-board-lab/__tests__/reports.test.js --reporter=dot
```

Expected: all tests PASS, including v1-only resume cases.

- [ ] **Step 9: Commit Task 7**

```bash
git add scripts/duel-board-lab/constants.mjs scripts/duel-board-lab/lib/cliOptions.mjs scripts/duel-board-lab/lib/runBatch.mjs scripts/duel-board-lab/lib/runStore.mjs scripts/duel-board-lab/reports/buildReport.mjs scripts/duel-board-lab/generate.mjs scripts/duel-board-lab/compare.mjs scripts/duel-board-lab/__tests__/cliOptions.test.js scripts/duel-board-lab/__tests__/runStore.test.js scripts/duel-board-lab/__tests__/reports.test.js
git commit -m "feat: audit selected duel boards with v2"
```

---

### Task 8: Benchmark, Documentation, and Human Calibration Gate

**Files:**
- Modify: `scripts/duel-board-lab/benchmark.mjs`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: v1 screen evaluator, exact v2 evaluator, and opt-in selected audits.
- Produces: separate benchmark evidence, verified docs, and a bounded calibration report for human approval.

- [ ] **Step 1: Add separate exact-v2 benchmark output**

Retain existing v1 gates. Import `buildBoardFacts` and `evaluateDuelBoardV2`, then add a bounded exact-v2 measurement over 100 pre-generated structurally valid official-spiral boards:

```js
const exactV2Candidates = [];
for (let seed = 1; exactV2Candidates.length < 100; seed += 1) {
  const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed });
  const facts = buildBoardFacts(candidate.tiles);
  if (facts.validityErrors.length === 0 && facts.redAdjacencyPairs.length === 0) {
    exactV2Candidates.push(candidate);
  }
}

const exactV2 = timed("exact-v2-audit", exactV2Candidates.length, (index) => {
  evaluateDuelBoardV2(exactV2Candidates[index].tiles, { includeDiagnosticLenses: true });
});

console.table([evaluation, full, exactV2]);
```

Do not introduce an unmeasured v2 pass/fail speed gate. Record its measured throughput and RSS first.

- [ ] **Step 2: Run focused automated verification**

Run:

```bash
pnpm test:board-lab
pnpm -C game-core test
pnpm -C game-core build
pnpm exec eslint 'scripts/duel-board-lab/**/*.{js,mjs}'
git diff --check
```

Expected:

- all board-lab tests PASS;
- all game-core tests PASS;
- game-core build exits 0;
- ESLint exits 0;
- `git diff --check` emits no output.

- [ ] **Step 3: Run and record the benchmark**

Run:

```bash
pnpm board:lab:benchmark
```

Expected: existing v1 gates still pass; output includes `exact-v2-audit` boards/second and peak RSS. Record the actual machine-specific numbers in `docs/agent/PROGRESS.md`; do not convert them into a universal promise.

- [ ] **Step 4: Generate a bounded v2 human-review run**

Run:

```bash
pnpm board:lab:compare -- --count 1000 --start-seed 1 --run-id duel-fair-v2-calibration-smoke --shortlist-size 20 --v2-audit-selections
```

Expected:

- 1,000 candidates per family in the v1 screen corpus;
- exact v2 diagnostics only for bounded selected boards;
- report and summary paths printed;
- no 100,000-per-family run starts.

- [ ] **Step 5: Inspect the two named fixtures directly**

Use the evaluator fixture test output and the generated report to record:

- seed 47 solved line, favoured seat, portfolios, starting hands, and rejection/review reason;
- seed 2604 solved line, P2 dev-ready starting hand, diagnostic lens disagreement, and review reason;
- any mismatch between rendered ports and topology.

If the rendered or numeric evidence disagrees with the stored fixture contract, stop and fix the smallest owning task before continuing.

- [ ] **Step 6: Update agent documentation**

Prepend a dated `PROGRESS.md` entry with:

- implemented v2 feature and policy versions;
- exact fixture classifications;
- board-lab, engine, build, lint, and benchmark evidence;
- bounded run ID and report path;
- explicit statement that the workflow stopped before the large evidence run.

Add `NOTES.md` entries for:

- ordered portfolio and starting-hand invariants;
- direct versus trade-adjusted capacity separation;
- exact-audit eligibility rule;
- v1 screen versus selected v2 audit file contract;
- human-calibration stop boundary.

- [ ] **Step 7: Run final verification after documentation changes**

Run:

```bash
pnpm test:board-lab
pnpm -C game-core test
pnpm -C game-core build
pnpm exec eslint 'scripts/duel-board-lab/**/*.{js,mjs}'
git diff --check
git status --short
```

Expected: all commands pass and status lists only the intended Task 8 files before commit.

- [ ] **Step 8: Commit Task 8**

```bash
git add scripts/duel-board-lab/benchmark.mjs docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record duel fair v2 calibration gate"
```

- [ ] **Step 9: Stop for human review**

Report the exact bounded calibration report path, seed 47/2604 outcomes, test counts, benchmark throughput, peak RSS, branch, and final commit. Do not run the 100,000-per-family evidence corpus, change production board generation, or begin a Settlers Setup-inspired generator without explicit approval.

---

## Plan Completion Criteria

- All eight task commits exist in order and contain only their intended scope.
- Existing v1 snapshots, manifests, generators, and benchmark gates remain valid.
- Exact v2 analysis models ordered starting hands, recipe bottlenecks, owned ports, and placement denial.
- Seed 47 is not an automatic top pass; seed 2604 is visibly review-gated with the discussed tempo.
- Reports display geographic ports and the solved opening rather than a text-only port legend.
- Only bounded v1-selected candidates receive exact v2 audits in this slice.
- The final response stops at the human calibration gate with no live or production mutation.
