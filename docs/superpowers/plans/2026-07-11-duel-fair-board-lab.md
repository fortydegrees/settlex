# Duel Fair Board Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic offline lab that generates, evaluates, ranks, stores, and visually inspects fair SettleHex 1v1 duel boards without changing production board selection.

**Approved design:** `docs/superpowers/specs/2026-07-11-duel-fair-board-lab-design.md`

**Architecture:** The lab lives under `scripts/duel-board-lab` and imports only public raw board primitives from `@settlex/game-core`. It generates official-spiral and freeform candidates, derives immutable board facts, applies the versioned `duel-fair-v1` policy, streams compact JSONL records, and renders only selected boards. `game-core` remains unchanged and never imports the lab.

**Tech Stack:** Node.js 20 ESM (`.mjs`), built-in `node:crypto`, `node:fs`, `node:readline`, and `node:util`, existing `@settlex/game-core`, existing Vitest 1.6, pnpm 9.13.2, dependency-free SVG/HTML reporting.

## Global Constraints

- Do not add dependencies, a workspace package, a database, or build tooling.
- Do not modify live match creation, `standard-balanced`, lobby UI, replay code, or four-player generation.
- Do not copy or adapt the legacy balanced algorithm; use only neutral public board primitives from `@settlex/game-core`.
- Candidate output is controlled by family, version, count, and integer seed range; wall-clock time never controls output.
- Every retry has an explicit finite limit; invalid candidates are recorded and never retried forever.
- Generated run data belongs under ignored `tmp/duel-board-lab/`; source-controlled fixtures belong under `scripts/duel-board-lab/fixtures/`.
- Every candidate includes generator family/version, evaluator version, seed, board hash, canonical symmetry hash, verdict, rejection codes, component metrics, and sortable score.
- Structural gates include standard counts and no adjacent `6`/`8` tokens.
- Low resource abundance is allowed; monopolizable resource access is rejected.
- The `P1, P2, P2, P1` placement audit is diagnostic in `duel-fair-v1` and does not determine pass/reject.
- Render only selected top, bottom, threshold, disagreement, and outlier boards; never render the full corpus.
- Initial single-thread targets exclude rendering: at least 500 boards/second evaluation-only, at least 200 boards/second generate-and-evaluate, and below 256 MB for a 100,000-candidate streaming run.
- Use test-first development for facts, metrics, generators, persistence, and reporting.
- Commit only files belonging to the current task; preserve unrelated worktree changes.

---

## File Structure

### Existing files modified

- `package.json` — add board-lab test, generate, compare, inspect, and benchmark commands.
- `docs/agent/PROGRESS.md` — record the completed offline lab slice and verification evidence.
- `docs/agent/NOTES.md` — document the engine/lab ownership boundary and run-output conventions.

### New runtime files

- `scripts/duel-board-lab/constants.mjs` — stable family names, versions, standard resources, and rejection codes.
- `scripts/duel-board-lab/generators/officialSpiral.mjs` — deterministic wrapper around `standard-official`.
- `scripts/duel-board-lab/generators/freeformRandom.mjs` — deterministic wrapper around `standard-random`.
- `scripts/duel-board-lab/generators/generateCandidate.mjs` — family dispatcher and candidate envelope.
- `scripts/duel-board-lab/analysis/boardFacts.mjs` — immutable node production, topology, counts, red adjacency, and legal pairs.
- `scripts/duel-board-lab/analysis/symmetry.mjs` — raw and dihedral-canonical board hashing.
- `scripts/duel-board-lab/analysis/settlementValue.mjs` — transparent settlement and pair strategy lenses.
- `scripts/duel-board-lab/analysis/resourceAccess.mjs` — resource contestability and independent access routes.
- `scripts/duel-board-lab/analysis/opportunityDepth.mjs` — competitive spots and top-spot cliffs.
- `scripts/duel-board-lab/analysis/openingRoutes.mjs` — legal two-settlement route depth.
- `scripts/duel-board-lab/analysis/pickSensitivity.mjs` — exclusion-aware early-pick counterfactuals.
- `scripts/duel-board-lab/analysis/orderSensitivityAudit.mjs` — diagnostic greedy snake-order audit.
- `scripts/duel-board-lab/analysis/duelFairV1Profile.mjs` — finite versioned gates and weights.
- `scripts/duel-board-lab/analysis/evaluateDuelBoard.mjs` — verdict, rejection reasons, metrics, and score composition.
- `scripts/duel-board-lab/lib/runStore.mjs` — manifest, JSONL append/scan/truncate/resume, and shortlist board storage.
- `scripts/duel-board-lab/lib/runBatch.mjs` — bounded generation/evaluation pipeline and bounded ranking sets.
- `scripts/duel-board-lab/lib/cliOptions.mjs` — dependency-free CLI parsing and validation.
- `scripts/duel-board-lab/reports/summary.mjs` — aggregate counts, distributions, and selected candidate groups.
- `scripts/duel-board-lab/reports/renderBoard.mjs` — dependency-free SVG board renderer.
- `scripts/duel-board-lab/reports/buildReport.mjs` — selected-board HTML report.
- `scripts/duel-board-lab/generate.mjs` — generate one family into a run.
- `scripts/duel-board-lab/compare.mjs` — generate both families into one comparison run.
- `scripts/duel-board-lab/inspect.mjs` — regenerate, hash-check, and render one candidate.
- `scripts/duel-board-lab/benchmark.mjs` — evaluation and full-pipeline throughput/memory probe.

### New source-controlled fixtures

- `scripts/duel-board-lab/fixtures/buildFixtures.mjs` — materialise full board payloads from reviewed seed descriptors.
- `scripts/duel-board-lab/fixtures/scarce-but-fair.json` — official spiral seed `1503`.
- `scripts/duel-board-lab/fixtures/wheat-monopoly.json` — official spiral seed `223`.
- `scripts/duel-board-lab/fixtures/dominant-settlement.json` — freeform seed `6414`.
- `scripts/duel-board-lab/fixtures/varied-openings.json` — official spiral seed `109`.
- `scripts/duel-board-lab/fixtures/first-pick-sensitive.json` — freeform seed `7036`.
- `scripts/duel-board-lab/fixtures/second-pick-sensitive.json` — freeform seed `4300`.

### New tests

- `scripts/duel-board-lab/__tests__/generators.test.js`
- `scripts/duel-board-lab/__tests__/boardFacts.test.js`
- `scripts/duel-board-lab/__tests__/symmetry.test.js`
- `scripts/duel-board-lab/__tests__/fairnessMetrics.test.js`
- `scripts/duel-board-lab/__tests__/evaluator.test.js`
- `scripts/duel-board-lab/__tests__/runStore.test.js`
- `scripts/duel-board-lab/__tests__/reports.test.js`
- `scripts/duel-board-lab/__tests__/cliOptions.test.js`

---

### Task 1: Deterministic Candidate Generators

**Files:**
- Create: `scripts/duel-board-lab/constants.mjs`
- Create: `scripts/duel-board-lab/generators/officialSpiral.mjs`
- Create: `scripts/duel-board-lab/generators/freeformRandom.mjs`
- Create: `scripts/duel-board-lab/generators/generateCandidate.mjs`
- Test: `scripts/duel-board-lab/__tests__/generators.test.js`

**Interfaces:**
- Consumes: `generateBoard(config, rng)`, `resolveBoardConfig(id)`, and `makeDeterministicRng(seed)` from `@settlex/game-core`.
- Produces: `generateCandidate({ family, seed }): Candidate`, where `Candidate` has `{ family, generatorVersion, seed, tiles }`.

- [ ] **Step 1: Write the failing deterministic generator tests**

```js
import { describe, expect, it } from "vitest";
import { ResourceType, TileTypes } from "@settlex/game-core";
import {
  BOARD_FAMILIES,
  generateCandidate
} from "../generators/generateCandidate.mjs";

const landSignature = (candidate) =>
  candidate.tiles
    .filter((tile) => tile.type === TileTypes.LAND)
    .map((tile) => [tile.coordinate, tile.tile.resource, tile.tile.number]);

describe("duel board candidate generators", () => {
  for (const family of Object.values(BOARD_FAMILIES)) {
    it(`${family} is deterministic for a fixed seed`, () => {
      const first = generateCandidate({ family, seed: 42 });
      const second = generateCandidate({ family, seed: 42 });
      expect(landSignature(first)).toEqual(landSignature(second));
      expect(first.generatorVersion).toMatch(/-v1$/);
    });

    it(`${family} preserves standard counts`, () => {
      const candidate = generateCandidate({ family, seed: 7 });
      const land = candidate.tiles.filter((tile) => tile.type === TileTypes.LAND);
      const ports = candidate.tiles.filter((tile) => tile.type === TileTypes.PORT);
      expect(land).toHaveLength(19);
      expect(ports).toHaveLength(9);
      expect(land.filter((tile) => tile.tile.resource === ResourceType.DESERT)).toHaveLength(1);
      expect(land.filter((tile) => tile.tile.number != null)).toHaveLength(18);
    });
  }

  it("rejects unknown families and non-integer seeds", () => {
    expect(() => generateCandidate({ family: "unknown", seed: 1 })).toThrow("Unknown board family");
    expect(() => generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1.5 })).toThrow("seed must be an integer");
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/generators.test.js --reporter=dot
```

Expected: FAIL because `generators/generateCandidate.mjs` does not exist.

- [ ] **Step 3: Implement the generator constants and wrappers**

```js
// constants.mjs
import { ResourceType } from "@settlex/game-core";

export const BOARD_FAMILIES = Object.freeze({
  OFFICIAL_SPIRAL: "official-spiral",
  FREEFORM_RANDOM: "freeform-random"
});

export const GENERATOR_VERSIONS = Object.freeze({
  [BOARD_FAMILIES.OFFICIAL_SPIRAL]: "official-spiral-v1",
  [BOARD_FAMILIES.FREEFORM_RANDOM]: "freeform-random-v1"
});

export const STANDARD_RESOURCES = Object.freeze([
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
]);

export const EVALUATOR_VERSION = "duel-fair-v1";
```

```js
// generators/officialSpiral.mjs
import { generateBoard, makeDeterministicRng, resolveBoardConfig } from "@settlex/game-core";
import { BOARD_FAMILIES, GENERATOR_VERSIONS } from "../constants.mjs";

export function generateOfficialSpiral(seed) {
  return {
    family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
    generatorVersion: GENERATOR_VERSIONS[BOARD_FAMILIES.OFFICIAL_SPIRAL],
    seed,
    tiles: generateBoard(resolveBoardConfig("standard-official"), makeDeterministicRng(seed))
  };
}
```

```js
// generators/freeformRandom.mjs
import { generateBoard, makeDeterministicRng, resolveBoardConfig } from "@settlex/game-core";
import { BOARD_FAMILIES, GENERATOR_VERSIONS } from "../constants.mjs";

export function generateFreeformRandom(seed) {
  return {
    family: BOARD_FAMILIES.FREEFORM_RANDOM,
    generatorVersion: GENERATOR_VERSIONS[BOARD_FAMILIES.FREEFORM_RANDOM],
    seed,
    tiles: generateBoard(resolveBoardConfig("standard-random"), makeDeterministicRng(seed))
  };
}
```

```js
// generators/generateCandidate.mjs
import { BOARD_FAMILIES } from "../constants.mjs";
import { generateOfficialSpiral } from "./officialSpiral.mjs";
import { generateFreeformRandom } from "./freeformRandom.mjs";

export { BOARD_FAMILIES } from "../constants.mjs";

export function generateCandidate({ family, seed }) {
  if (!Number.isInteger(seed)) throw new Error("seed must be an integer");
  if (family === BOARD_FAMILIES.OFFICIAL_SPIRAL) return generateOfficialSpiral(seed);
  if (family === BOARD_FAMILIES.FREEFORM_RANDOM) return generateFreeformRandom(seed);
  throw new Error(`Unknown board family: ${family}`);
}
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/generators.test.js --reporter=dot
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add scripts/duel-board-lab/constants.mjs scripts/duel-board-lab/generators scripts/duel-board-lab/__tests__/generators.test.js
git commit -m "feat: add deterministic duel board candidates"
```

---

### Task 2: Immutable Board Facts

**Files:**
- Create: `scripts/duel-board-lab/analysis/boardFacts.mjs`
- Test: `scripts/duel-board-lab/__tests__/boardFacts.test.js`

**Interfaces:**
- Consumes: `Candidate.tiles` from Task 1 and `buildTopology`, `getNumDots`, `resolveBoardSpec`, `ResourceType`, and `TileTypes` from `@settlex/game-core`.
- Produces: `buildBoardFacts(tiles): BoardFacts` with topology, node facts, standard validity errors, red adjacency pairs, and 1,359 legal non-adjacent settlement pairs.

- [ ] **Step 1: Write failing board-fact tests**

```js
import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";

describe("board facts", () => {
  it("derives the complete standard topology and production totals", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const facts = buildBoardFacts(candidate.tiles);
    expect(facts.validityErrors).toEqual([]);
    expect(facts.nodes).toHaveLength(54);
    expect(facts.legalPairs).toHaveLength(1359);
    expect(facts.nodes.reduce((sum, node) => sum + node.totalPips, 0)).toBe(348);
    expect(facts.redAdjacencyPairs).toEqual([]);
  });

  it("records each node's blocked neighbours and resource vector", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const facts = buildBoardFacts(candidate.tiles);
    const node = facts.nodes.find((entry) => entry.totalPips > 0);
    expect(node.blockedNodeIds).toContain(node.nodeId);
    expect(Object.values(node.resourcePips).reduce((sum, value) => sum + value, 0)).toBe(node.totalPips);
  });

  it("reports structural count failures without throwing", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const facts = buildBoardFacts(candidate.tiles.slice(1));
    expect(facts.validityErrors).toContain("land-count");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/boardFacts.test.js --reporter=dot
```

Expected: FAIL because `analysis/boardFacts.mjs` does not exist.

- [ ] **Step 3: Implement immutable board facts**

Implement these exact exports:

```js
export const CUBE_DIRECTIONS = Object.freeze([
  [1, 0, -1], [-1, 0, 1], [0, 1, -1],
  [0, -1, 1], [1, -1, 0], [-1, 1, 0]
]);

export function buildBoardFacts(tiles) {
  const topology = buildTopology(tiles);
  const landTiles = tiles.filter((tile) => tile.type === TileTypes.LAND);
  const portTiles = tiles.filter((tile) => tile.type === TileTypes.PORT);
  const nodeMap = new Map(topology.landNodeIds.map((nodeId) => [nodeId, {
    nodeId,
    totalPips: 0,
    resourcePips: Object.fromEntries(STANDARD_RESOURCES.map((resource) => [resource, 0])),
    resources: [],
    port: topology.portsByNodeId[nodeId] ?? null,
    blockedNodeIds: [nodeId, ...(topology.nodeNeighbors[nodeId] ?? [])].sort((a, b) => a - b)
  }]));

  for (const tile of landTiles) {
    const resource = tile.tile.resource;
    const number = tile.tile.number;
    if (!STANDARD_RESOURCES.includes(resource) || number == null) continue;
    const pips = getNumDots(number);
    for (const nodeId of Object.values(tile.tile.nodes ?? {})) {
      const node = nodeMap.get(nodeId);
      node.totalPips += pips;
      node.resourcePips[resource] += pips;
      if (!node.resources.includes(resource)) node.resources.push(resource);
    }
  }

  const nodes = [...nodeMap.values()]
    .sort((a, b) => a.nodeId - b.nodeId)
    .map((node) => Object.freeze({
      ...node,
      resourcePips: Object.freeze({ ...node.resourcePips }),
      resources: Object.freeze([...node.resources].sort()),
      blockedNodeIds: Object.freeze([...node.blockedNodeIds])
    }));
  const legalPairs = [];
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      if (!nodes[left].blockedNodeIds.includes(nodes[right].nodeId)) {
        legalPairs.push([nodes[left].nodeId, nodes[right].nodeId]);
      }
    }
  }

  return Object.freeze({
    tiles,
    topology,
    nodes: Object.freeze(nodes),
    legalPairs: Object.freeze(legalPairs.map((pair) => Object.freeze(pair))),
    totalProductionByResource: Object.freeze(sumResourcePips(nodes)),
    redAdjacencyPairs: Object.freeze(findRedAdjacencyPairs(landTiles).map((pair) => Object.freeze(pair))),
    validityErrors: Object.freeze(validateStandardCounts({ landTiles, portTiles }))
  });
}
```

Add private helpers in the same file:

```js
function sumResourcePips(nodes) {
  return Object.fromEntries(STANDARD_RESOURCES.map((resource) => [
    resource,
    nodes.reduce((sum, node) => sum + node.resourcePips[resource], 0) / 6
  ]));
}

function validateStandardCounts({ landTiles, portTiles }) {
  const errors = [];
  const spec = resolveBoardSpec("standard-4p");
  if (landTiles.length !== 19) errors.push("land-count");
  if (portTiles.length !== 9) errors.push("port-count");
  if (landTiles.filter((tile) => tile.tile.number != null).length !== 18) errors.push("number-count");
  const resources = spec.resources();
  for (const resource of new Set(resources)) {
    const expected = resources.filter((value) => value === resource).length;
    const actual = landTiles.filter((tile) => tile.tile.resource === resource).length;
    if (actual !== expected) errors.push(`resource-count:${resource}`);
  }
  if (multisetSignature(landTiles.map((tile) => tile.tile.number).filter((number) => number != null)) !== multisetSignature(spec.rollNumbers())) {
    errors.push("number-multiset");
  }
  if (multisetSignature(portTiles.map((tile) => tile.tile.resource)) !== multisetSignature(spec.portCounts())) {
    errors.push("port-resource-multiset");
  }
  return errors.sort();
}

function multisetSignature(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right))).join("|");
}

function findRedAdjacencyPairs(landTiles) {
  const byCoordinate = new Map(landTiles.map((tile) => [tile.coordinate.join(","), tile]));
  const pairs = [];
  for (const tile of landTiles) {
    if (![6, 8].includes(tile.tile.number)) continue;
    for (const direction of CUBE_DIRECTIONS) {
      const coordinate = tile.coordinate.map((value, index) => value + direction[index]);
      const neighbour = byCoordinate.get(coordinate.join(","));
      if (neighbour && [6, 8].includes(neighbour.tile.number) && tile.tile.id < neighbour.tile.id) {
        pairs.push([tile.tile.id, neighbour.tile.id]);
      }
    }
  }
  return pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
```

- [ ] **Step 4: Run facts and generator tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/generators.test.js scripts/duel-board-lab/__tests__/boardFacts.test.js --reporter=dot
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add scripts/duel-board-lab/analysis/boardFacts.mjs scripts/duel-board-lab/__tests__/boardFacts.test.js
git commit -m "feat: derive immutable duel board facts"
```

---

### Task 3: Symmetry-Canonical Board Identity

**Files:**
- Create: `scripts/duel-board-lab/analysis/symmetry.mjs`
- Test: `scripts/duel-board-lab/__tests__/symmetry.test.js`

**Interfaces:**
- Consumes: completed `BoardTile[]`.
- Produces: `hashBoard(tiles): string`, `canonicalBoardHash(tiles): string`, and `transformCoordinate(coordinate, transformIndex): [number, number, number]`.

- [ ] **Step 1: Write failing symmetry tests**

```js
import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { canonicalBoardHash, hashBoard, transformTiles } from "../analysis/symmetry.mjs";

describe("board symmetry identity", () => {
  it("deduplicates all twelve rotations and reflections", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 9 }).tiles;
    const canonical = canonicalBoardHash(tiles);
    for (let index = 0; index < 12; index += 1) {
      expect(canonicalBoardHash(transformTiles(tiles, index))).toBe(canonical);
    }
  });

  it("keeps raw orientation hashes distinct", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 9 }).tiles;
    expect(hashBoard(transformTiles(tiles, 1))).not.toBe(hashBoard(tiles));
  });

  it("keeps wiring identity in raw hashes but not content-canonical hashes", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 9 }).tiles;
    const rewired = structuredClone(tiles);
    rewired[0].tile.id += 1_000;
    expect(hashBoard(rewired)).not.toBe(hashBoard(tiles));
    expect(canonicalBoardHash(rewired)).toBe(canonicalBoardHash(tiles));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/symmetry.test.js --reporter=dot
```

Expected: FAIL because `analysis/symmetry.mjs` does not exist.

- [ ] **Step 3: Implement canonical serialisation and hashing**

```js
import { createHash } from "node:crypto";

const rotate = ([x, y, z]) => [-z, -x, -y];
const reflect = ([x, y, z]) => [x, z, y];

export function transformCoordinate(coordinate, transformIndex) {
  if (!Number.isInteger(transformIndex) || transformIndex < 0 || transformIndex > 11) {
    throw new Error("transformIndex must be an integer from 0 to 11");
  }
  let result = transformIndex >= 6 ? reflect(coordinate) : [...coordinate];
  for (let turn = 0; turn < transformIndex % 6; turn += 1) result = rotate(result);
  return result;
}

export function transformTiles(tiles, transformIndex) {
  return tiles.map((tile) => ({
    ...tile,
    coordinate: transformCoordinate(tile.coordinate, transformIndex),
    tile: { ...tile.tile }
  }));
}

function sortedEntries(value) {
  if (Array.isArray(value)) return [...value].map(String).sort();
  return Object.entries(value ?? {}).sort(([left], [right]) => left.localeCompare(right));
}

function serialiseRaw(tiles) {
  return JSON.stringify([...tiles]
    .sort((left, right) => left.coordinate.join(",").localeCompare(right.coordinate.join(",")) || left.type.localeCompare(right.type))
    .map((tile) => ({
      coordinate: [...tile.coordinate],
      type: tile.type,
      id: tile.tile.id,
      resource: tile.tile.resource ?? null,
      number: tile.tile.number ?? null,
      direction: tile.tile.direction ?? null,
      nodes: sortedEntries(tile.tile.nodes),
      edges: sortedEntries(tile.tile.edges)
    })));
}

function serialiseCanonicalContent(tiles) {
  return JSON.stringify(tiles
    .map((tile) => ({
      coordinate: [...tile.coordinate],
      type: tile.type,
      resource: tile.tile.resource ?? null,
      number: tile.tile.number ?? null
    }))
    .sort((left, right) => left.coordinate.join(",").localeCompare(right.coordinate.join(",")) || left.type.localeCompare(right.type)));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export const hashBoard = (tiles) => sha256(serialiseRaw(tiles));

export function canonicalBoardHash(tiles) {
  const representations = Array.from({ length: 12 }, (_, index) => serialiseCanonicalContent(transformTiles(tiles, index)));
  representations.sort();
  return sha256(representations[0]);
}
```

- [ ] **Step 4: Run symmetry tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/symmetry.test.js --reporter=dot
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/duel-board-lab/analysis/symmetry.mjs scripts/duel-board-lab/__tests__/symmetry.test.js
git commit -m "feat: add canonical duel board identity"
```

---

### Task 4: Settlement, Opportunity, and Resource Metrics

**Files:**
- Create: `scripts/duel-board-lab/analysis/settlementValue.mjs`
- Create: `scripts/duel-board-lab/analysis/opportunityDepth.mjs`
- Create: `scripts/duel-board-lab/analysis/resourceAccess.mjs`
- Test: `scripts/duel-board-lab/__tests__/fairnessMetrics.test.js`

**Interfaces:**
- Consumes: `BoardFacts.nodes` and a profile with explicit ratios.
- Produces: `valueSettlements(facts)`, `measureOpportunityDepth(valuedNodes, profile)`, and `measureResourceContestability(facts, valuedNodes, profile)`.

- [ ] **Step 1: Write failing metric tests using small synthetic facts**

```js
import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { measureOpportunityDepth } from "../analysis/opportunityDepth.mjs";
import { measureResourceContestability } from "../analysis/resourceAccess.mjs";

const node = (nodeId, generalScore, wheat, blockedNodeIds) => ({
  nodeId,
  generalScore,
  totalPips: Math.max(generalScore - 1, 0),
  diversity: 2,
  blockedNodeIds,
  resourcePips: {
    [ResourceType.WOOD]: 0,
    [ResourceType.BRICK]: 0,
    [ResourceType.SHEEP]: 0,
    [ResourceType.WHEAT]: wheat,
    [ResourceType.ORE]: 0
  }
});

const profile = {
  competitiveSpotRatio: 0.75,
  viableResourceRatio: 0.5
};

describe("duel fairness metrics", () => {
  it("detects a steep top-spot cliff", () => {
    const metrics = measureOpportunityDepth([
      node(1, 12, 0, [1]), node(2, 7, 0, [2]), node(3, 7, 0, [3]), node(4, 7, 0, [4])
    ], profile);
    expect(metrics.topSpotCliff).toBeCloseTo(5 / 12);
    expect(metrics.competitiveSpotCount).toBe(1);
  });

  it("distinguishes scarce fair wheat from a wheat monopoly", () => {
    const fairNodes = [node(1, 8, 3, [1, 2]), node(2, 8, 3, [1, 2]), node(3, 7, 2, [3]), node(4, 7, 2, [4])];
    const monopolyNodes = [node(1, 10, 7, [1, 2, 3]), node(2, 7, 1, [1, 2]), node(3, 7, 1, [1, 3]), node(4, 7, 1, [4])];
    const fair = measureResourceContestability({ nodes: fairNodes }, fairNodes, profile);
    const monopoly = measureResourceContestability({ nodes: monopolyNodes }, monopolyNodes, profile);
    expect(fair.byResource[ResourceType.WHEAT].secondIndependentRatio).toBeCloseTo(2 / 3);
    expect(monopoly.byResource[ResourceType.WHEAT].secondIndependentRatio).toBeCloseTo(1 / 7);
  });
});
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/fairnessMetrics.test.js --reporter=dot
```

Expected: FAIL because the metric modules do not exist.

- [ ] **Step 3: Implement transparent settlement values**

```js
import { ResourceType } from "@settlex/game-core";

export function valueSettlements(facts) {
  return facts.nodes.map((node) => {
    const diversity = node.resources?.length ?? Object.values(node.resourcePips).filter((value) => value > 0).length;
    const expansion = Math.sqrt(node.resourcePips[ResourceType.WOOD] * node.resourcePips[ResourceType.BRICK]);
    const growth = Math.sqrt(node.resourcePips[ResourceType.WHEAT] * node.resourcePips[ResourceType.ORE]);
    const portBonus = node.port === ResourceType.ANY
      ? 1
      : node.port
        ? 0.5 + 0.15 * node.resourcePips[node.port]
        : 0;
    return {
      ...node,
      diversity,
      expansionScore: expansion,
      growthScore: growth,
      portBonus,
      generalScore: node.totalPips + 0.5 * diversity + 0.2 * Math.max(expansion, growth) + portBonus
    };
  }).sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
}

export function valuePair(left, right) {
  const combined = Object.fromEntries(Object.keys(left.resourcePips).map((resource) => [
    resource,
    left.resourcePips[resource] + right.resourcePips[resource]
  ]));
  const diversity = Object.values(combined).filter((pips) => pips > 0).length;
  const scores = {
    expansion: left.totalPips + right.totalPips + Math.sqrt(combined[ResourceType.WOOD] * combined[ResourceType.BRICK]),
    growth: left.totalPips + right.totalPips + Math.sqrt(combined[ResourceType.WHEAT] * combined[ResourceType.ORE]) + 0.2 * combined[ResourceType.SHEEP],
    flexible: left.generalScore + right.generalScore + 0.5 * diversity
  };
  const anchorNodeId = left.generalScore > right.generalScore || (left.generalScore === right.generalScore && left.nodeId < right.nodeId)
    ? left.nodeId
    : right.nodeId;
  return { scores, anchorNodeId };
}
```

- [ ] **Step 4: Implement opportunity and resource contestability metrics**

```js
// opportunityDepth.mjs
export function measureOpportunityDepth(valuedNodes, profile) {
  const ordered = [...valuedNodes].sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
  const bestScore = ordered[0]?.generalScore ?? 0;
  const secondScore = ordered[1]?.generalScore ?? 0;
  return {
    bestScore,
    secondScore,
    topSpotCliff: bestScore === 0 ? 0 : (bestScore - secondScore) / bestScore,
    competitiveThreshold: bestScore * profile.competitiveSpotRatio,
    competitiveSpotCount: ordered.filter((node) => node.generalScore >= bestScore * profile.competitiveSpotRatio).length
  };
}
```

```js
// resourceAccess.mjs
import { STANDARD_RESOURCES } from "../constants.mjs";

export function measureResourceContestability(facts, valuedNodes, profile) {
  const byResource = {};
  for (const resource of STANDARD_RESOURCES) {
    const ordered = [...valuedNodes].sort((left, right) =>
      right.resourcePips[resource] - left.resourcePips[resource] || left.nodeId - right.nodeId
    );
    const best = ordered[0];
    const blocked = new Set(best?.blockedNodeIds ?? []);
    const secondIndependent = ordered.find((node) => !blocked.has(node.nodeId));
    const bestAccess = best?.resourcePips[resource] ?? 0;
    const secondAccess = secondIndependent?.resourcePips[resource] ?? 0;
    const viableThreshold = bestAccess * profile.viableResourceRatio;
    const selected = [];
    const excluded = new Set();
    for (const node of ordered) {
      if (node.resourcePips[resource] < viableThreshold || excluded.has(node.nodeId)) continue;
      selected.push(node.nodeId);
      for (const id of node.blockedNodeIds) excluded.add(id);
    }
    byResource[resource] = {
      totalProduction: facts.totalProductionByResource?.[resource] ?? 0,
      bestAccess,
      secondIndependentAccess: secondAccess,
      secondIndependentRatio: bestAccess === 0 ? 1 : secondAccess / bestAccess,
      independentViableRoutes: selected
    };
  }
  return { byResource };
}
```

- [ ] **Step 5: Run the fairness metric tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/fairnessMetrics.test.js --reporter=dot
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit Task 4**

```bash
git add scripts/duel-board-lab/analysis/settlementValue.mjs scripts/duel-board-lab/analysis/opportunityDepth.mjs scripts/duel-board-lab/analysis/resourceAccess.mjs scripts/duel-board-lab/__tests__/fairnessMetrics.test.js
git commit -m "feat: measure duel opening contestability"
```

---

### Task 5: Opening Routes, Pick Sensitivity, and Evaluator

**Files:**
- Create: `scripts/duel-board-lab/analysis/openingRoutes.mjs`
- Create: `scripts/duel-board-lab/analysis/pickSensitivity.mjs`
- Create: `scripts/duel-board-lab/analysis/orderSensitivityAudit.mjs`
- Create: `scripts/duel-board-lab/analysis/duelFairV1Profile.mjs`
- Create: `scripts/duel-board-lab/analysis/evaluateDuelBoard.mjs`
- Test: `scripts/duel-board-lab/__tests__/evaluator.test.js`

**Interfaces:**
- Consumes: `BoardFacts`, valued nodes, and the versioned profile.
- Produces: `evaluateDuelBoard(tiles, { includeOrderAudit = false }): DuelFairnessReport`.

- [ ] **Step 1: Write failing evaluator tests**

```js
import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { evaluateDuelBoard } from "../analysis/evaluateDuelBoard.mjs";
import { measureOpeningRoutes } from "../analysis/openingRoutes.mjs";

describe("duel-fair-v1 evaluator", () => {
  it("emits stable named metrics and a bounded sortable score", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const report = evaluateDuelBoard(candidate.tiles);
    expect(report.evaluatorVersion).toBe("duel-fair-v1");
    expect(report.verdict).toMatch(/pass|reject/);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.metrics).toHaveProperty("competitiveSpotDepth");
    expect(report.metrics).toHaveProperty("resourceContestability");
    expect(report.metrics).toHaveProperty("openingRouteDepth");
    expect(report.metrics).toHaveProperty("pickSensitivity");
    expect(report.metrics.orderSensitivityAudit).toBeNull();
  });

  it("rejects adjacent red numbers before subjective ranking", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.FREEFORM_RANDOM, seed: 1 });
    const report = evaluateDuelBoard(candidate.tiles);
    expect(report.rejectionReasons).toContain("adjacent-red-numbers");
  });

  it("can add the diagnostic snake audit without changing the verdict", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const normal = evaluateDuelBoard(candidate.tiles);
    const audited = evaluateDuelBoard(candidate.tiles, { includeOrderAudit: true });
    expect(audited.verdict).toBe(normal.verdict);
    expect(audited.metrics.orderSensitivityAudit.picks.map((pick) => pick.player)).toEqual(["P1", "P2", "P2", "P1"]);
  });

  it("does not count many pairs through one dominant anchor as route depth", () => {
    const resourcePips = { Wood: 2, Brick: 2, Sheep: 2, Wheat: 2, Ore: 2 };
    const valuedNodes = [
      { nodeId: 1, totalPips: 10, generalScore: 12, resourcePips, blockedNodeIds: [1, 2] },
      { nodeId: 3, totalPips: 3, generalScore: 4, resourcePips, blockedNodeIds: [3] },
      { nodeId: 4, totalPips: 3, generalScore: 4, resourcePips, blockedNodeIds: [4] },
      { nodeId: 5, totalPips: 3, generalScore: 4, resourcePips, blockedNodeIds: [5] }
    ];
    const metrics = measureOpeningRoutes(
      { legalPairs: [[1, 3], [1, 4], [1, 5]] },
      valuedNodes,
      { competitivePairRatio: 0, routeSearchLimit: 32 }
    );
    expect(metrics.rawCompetitivePairCount).toBe(3);
    expect(metrics.distinctCompetitiveRouteCount).toBe(1);
    expect(metrics.hasCompatibleCompetitiveRouteSet).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluator.test.js --reporter=dot
```

Expected: FAIL because `analysis/evaluateDuelBoard.mjs` does not exist.

- [ ] **Step 3: Add the finite initial profile**

```js
export const DUEL_FAIR_V1_PROFILE = Object.freeze({
  version: "duel-fair-v1",
  competitiveSpotRatio: 0.75,
  minCompetitiveSpots: 8,
  maxTopSpotCliff: 0.2,
  viableResourceRatio: 0.5,
  minSecondIndependentResourceRatio: 0.5,
  minIndependentResourceRoutes: 2,
  competitivePairRatio: 0.82,
  minDistinctOpeningRoutes: 8,
  routeSearchLimit: 32,
  plausiblePickLimit: 12,
  maxPickCollapse: 0.6,
  weights: Object.freeze({
    topSpotCliff: 0.2,
    competitiveSpotDepth: 0.2,
    resourceContestability: 0.35,
    openingRouteDepth: 0.15,
    pickSensitivity: 0.1
  })
});
```

- [ ] **Step 4: Implement opening routes and pick sensitivity**

```js
// openingRoutes.mjs
import { valuePair } from "./settlementValue.mjs";

export function measureOpeningRoutes(facts, valuedNodes, profile) {
  const byId = new Map(valuedNodes.map((node) => [node.nodeId, node]));
  const pairs = facts.legalPairs.map(([leftId, rightId]) => ({
    nodeIds: [leftId, rightId],
    ...valuePair(byId.get(leftId), byId.get(rightId))
  }));
  const strategyNames = ["expansion", "growth", "flexible"];
  const bestByStrategy = Object.fromEntries(strategyNames.map((strategy) => [
    strategy,
    Math.max(0, ...pairs.map((pair) => pair.scores[strategy]))
  ]));
  const competitivePairs = pairs.map((pair) => ({
    ...pair,
    competitiveStrategies: strategyNames.filter((strategy) =>
      pair.scores[strategy] >= bestByStrategy[strategy] * profile.competitivePairRatio)
  })).filter((pair) => pair.competitiveStrategies.length > 0);

  // Collapse variants that depend on the same dominant node, retaining the
  // pair's strongest normalised strategic lens for explainability.
  const distinctByAnchor = new Map();
  for (const pair of competitivePairs) {
    const strategy = [...pair.competitiveStrategies].sort((left, right) =>
      pair.scores[right] / bestByStrategy[right] - pair.scores[left] / bestByStrategy[left] || left.localeCompare(right))[0];
    const route = { ...pair, strategy, score: pair.scores[strategy] / bestByStrategy[strategy] };
    const current = distinctByAnchor.get(pair.anchorNodeId);
    if (!current || route.score > current.score || (route.score === current.score && route.nodeIds.join(",") < current.nodeIds.join(","))) {
      distinctByAnchor.set(pair.anchorNodeId, route);
    }
  }
  const distinctRoutes = [...distinctByAnchor.values()]
    .sort((left, right) => right.score - left.score || left.nodeIds[0] - right.nodeIds[0] || left.nodeIds[1] - right.nodeIds[1]);
  const searchRoutes = distinctRoutes.slice(0, profile.routeSearchLimit);
  const compatibleRouteSet = searchRoutes.some((left, leftIndex) => searchRoutes.slice(leftIndex + 1).some((right) => {
    const rightIds = new Set(right.nodeIds);
    return left.nodeIds.every((nodeId) => {
      const blocked = new Set(byId.get(nodeId).blockedNodeIds);
      return [...rightIds].every((rightId) => !blocked.has(rightId));
    });
  }));
  return {
    bestByStrategy,
    rawCompetitivePairCount: competitivePairs.length,
    distinctCompetitiveRouteCount: distinctRoutes.length,
    strategyDepth: Object.fromEntries(strategyNames.map((strategy) => [strategy, distinctRoutes.filter((route) => route.strategy === strategy).length])),
    hasCompatibleCompetitiveRouteSet: compatibleRouteSet,
    topRoutes: distinctRoutes.slice(0, 12)
  };
}
```

```js
// pickSensitivity.mjs
import { STANDARD_RESOURCES } from "../constants.mjs";

export function measurePickSensitivity(valuedNodes, profile) {
  const ordered = [...valuedNodes].sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
  const baselineBest = ordered[0]?.generalScore ?? 0;
  let worst = { nodeId: null, collapse: 0, resource: null };
  for (const pick of ordered.slice(0, profile.plausiblePickLimit)) {
    const blocked = new Set(pick.blockedNodeIds);
    const remaining = ordered.filter((node) => !blocked.has(node.nodeId));
    const generalCollapse = baselineBest === 0 ? 0 : 1 - (remaining[0]?.generalScore ?? 0) / baselineBest;
    if (generalCollapse > worst.collapse) worst = { nodeId: pick.nodeId, collapse: generalCollapse, resource: null };
    for (const resource of STANDARD_RESOURCES) {
      const before = Math.max(...ordered.map((node) => node.resourcePips[resource]), 0);
      const after = Math.max(...remaining.map((node) => node.resourcePips[resource]), 0);
      const collapse = before === 0 ? 0 : 1 - after / before;
      if (collapse > worst.collapse) worst = { nodeId: pick.nodeId, collapse, resource };
    }
  }
  return { worstPick: worst, maxCollapse: worst.collapse };
}
```

- [ ] **Step 5: Implement the diagnostic placement audit**

```js
export function auditOrderSensitivity(valuedNodes) {
  const ordered = [...valuedNodes].sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
  const blocked = new Set();
  const totals = { P1: 0, P2: 0 };
  const picks = [];
  for (const player of ["P1", "P2", "P2", "P1"]) {
    const pick = ordered.find((node) => !blocked.has(node.nodeId));
    if (!pick) throw new Error("Unable to complete diagnostic placement audit");
    picks.push({ player, nodeId: pick.nodeId, score: pick.generalScore });
    totals[player] += pick.generalScore;
    for (const nodeId of pick.blockedNodeIds) blocked.add(nodeId);
  }
  return {
    picks,
    totals,
    secondToFirstRatio: totals.P1 === 0 ? 1 : totals.P2 / totals.P1
  };
}
```

- [ ] **Step 6: Compose verdicts and the sortable score**

Implement `evaluateDuelBoard` with the following stable rejection codes:

```js
export const REJECTION_CODES = Object.freeze({
  INVALID_BOARD: "invalid-board",
  ADJACENT_RED_NUMBERS: "adjacent-red-numbers",
  DOMINANT_TOP_SPOT: "dominant-top-spot",
  INSUFFICIENT_COMPETITIVE_SPOTS: "insufficient-competitive-spots",
  RESOURCE_MONOPOLY: "resource-monopoly",
  INSUFFICIENT_RESOURCE_ROUTES: "insufficient-resource-routes",
  INSUFFICIENT_OPENING_ROUTES: "insufficient-opening-routes",
  NO_COMPATIBLE_OPENING_ROUTES: "no-compatible-opening-routes",
  PICK_SENSITIVE: "pick-sensitive"
});
```

The evaluator must:

```js
export function evaluateDuelBoard(tiles, { includeOrderAudit = false, profile = DUEL_FAIR_V1_PROFILE } = {}) {
  const facts = buildBoardFacts(tiles);
  const valuedNodes = valueSettlements(facts);
  const competitiveSpotDepth = measureOpportunityDepth(valuedNodes, profile);
  const resourceContestability = measureResourceContestability(facts, valuedNodes, profile);
  const openingRouteDepth = measureOpeningRoutes(facts, valuedNodes, profile);
  const pickSensitivity = measurePickSensitivity(valuedNodes, profile);
  const reasons = collectRejectionReasons({ facts, competitiveSpotDepth, resourceContestability, openingRouteDepth, pickSensitivity, profile });
  const penalties = normalisePenalties({ competitiveSpotDepth, resourceContestability, openingRouteDepth, pickSensitivity, profile });
  const overallScore = Math.max(0, Math.min(100, 100 * (1 - weightedPenalty(penalties, profile.weights))));
  return {
    evaluatorVersion: profile.version,
    verdict: reasons.length === 0 ? "pass" : "reject",
    rejectionReasons: reasons,
    overallScore,
    componentPenalties: penalties,
    metrics: {
      competitiveSpotDepth,
      resourceContestability,
      openingRouteDepth,
      pickSensitivity,
      orderSensitivityAudit: includeOrderAudit ? auditOrderSensitivity(valuedNodes) : null
    }
  };
}
```

Implement the helpers in the same file with these formulas. This deliberately keeps abundance out of the gates: a resource may be globally scarce as long as its viable access is contestable.

```js
const clamp01 = (value) => Math.max(0, Math.min(1, value));

function collectRejectionReasons({
  facts,
  competitiveSpotDepth,
  resourceContestability,
  openingRouteDepth,
  pickSensitivity,
  profile
}) {
  const reasons = [];
  const resourceMetrics = Object.values(resourceContestability.byResource);
  if (facts.validityErrors.length > 0) reasons.push(REJECTION_CODES.INVALID_BOARD);
  if (facts.redAdjacencyPairs.length > 0) reasons.push(REJECTION_CODES.ADJACENT_RED_NUMBERS);
  if (competitiveSpotDepth.topSpotCliff > profile.maxTopSpotCliff) reasons.push(REJECTION_CODES.DOMINANT_TOP_SPOT);
  if (competitiveSpotDepth.competitiveSpotCount < profile.minCompetitiveSpots) reasons.push(REJECTION_CODES.INSUFFICIENT_COMPETITIVE_SPOTS);
  if (resourceMetrics.some((metric) => metric.secondIndependentRatio < profile.minSecondIndependentResourceRatio)) {
    reasons.push(REJECTION_CODES.RESOURCE_MONOPOLY);
  }
  if (resourceMetrics.some((metric) => metric.independentViableRoutes.length < profile.minIndependentResourceRoutes)) {
    reasons.push(REJECTION_CODES.INSUFFICIENT_RESOURCE_ROUTES);
  }
  if (openingRouteDepth.distinctCompetitiveRouteCount < profile.minDistinctOpeningRoutes) reasons.push(REJECTION_CODES.INSUFFICIENT_OPENING_ROUTES);
  if (!openingRouteDepth.hasCompatibleCompetitiveRouteSet) reasons.push(REJECTION_CODES.NO_COMPATIBLE_OPENING_ROUTES);
  if (pickSensitivity.maxCollapse > profile.maxPickCollapse) reasons.push(REJECTION_CODES.PICK_SENSITIVE);
  return [...new Set(reasons)].sort();
}

function normalisePenalties({
  competitiveSpotDepth,
  resourceContestability,
  openingRouteDepth,
  pickSensitivity,
  profile
}) {
  const resourceRatios = Object.values(resourceContestability.byResource).map((metric) => metric.secondIndependentRatio);
  return {
    topSpotCliff: clamp01(competitiveSpotDepth.topSpotCliff / profile.maxTopSpotCliff),
    competitiveSpotDepth: clamp01(1 - competitiveSpotDepth.competitiveSpotCount / profile.minCompetitiveSpots),
    resourceContestability: clamp01(Math.max(0, ...resourceRatios.map((ratio) => 1 - ratio))),
    openingRouteDepth: Math.max(
      clamp01(1 - openingRouteDepth.distinctCompetitiveRouteCount / profile.minDistinctOpeningRoutes),
      openingRouteDepth.hasCompatibleCompetitiveRouteSet ? 0 : 1
    ),
    pickSensitivity: clamp01(pickSensitivity.maxCollapse / profile.maxPickCollapse)
  };
}

function weightedPenalty(penalties, weights) {
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + penalties[key] * weight, 0);
}
```

- [ ] **Step 7: Run evaluator and all analysis tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/boardFacts.test.js scripts/duel-board-lab/__tests__/symmetry.test.js scripts/duel-board-lab/__tests__/fairnessMetrics.test.js scripts/duel-board-lab/__tests__/evaluator.test.js --reporter=dot
```

Expected: all focused analysis tests pass.

- [ ] **Step 8: Commit Task 5**

```bash
git add scripts/duel-board-lab/analysis scripts/duel-board-lab/constants.mjs scripts/duel-board-lab/__tests__/evaluator.test.js
git commit -m "feat: evaluate duel board fairness"
```

---

### Task 6: Source-Controlled Calibration Fixtures

**Files:**
- Create: `scripts/duel-board-lab/fixtures/buildFixtures.mjs`
- Create: the six fixture JSON files listed in File Structure
- Modify: `scripts/duel-board-lab/__tests__/evaluator.test.js`

**Interfaces:**
- Consumes: `generateCandidate`, `hashBoard`, `canonicalBoardHash`, and `evaluateDuelBoard`.
- Produces: full immutable fixture payloads with `{ label, expectation, family, seed, boardHash, canonicalSymmetryHash, tiles }`.

- [ ] **Step 1: Add fixture-loading tests**

```js
import { readFileSync } from "node:fs";

const readFixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));

it("pins reviewed scarce and monopoly boards as full payloads", () => {
  const scarce = readFixture("scarce-but-fair");
  const monopoly = readFixture("wheat-monopoly");
  expect(scarce.family).toBe("official-spiral");
  expect(scarce.seed).toBe(1503);
  expect(scarce.tiles).toHaveLength(28);
  expect(monopoly.seed).toBe(223);
  expect(monopoly.tiles).toHaveLength(28);
});
```

- [ ] **Step 2: Run the test and verify missing fixtures**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluator.test.js --reporter=dot
```

Expected: FAIL with `ENOENT` for `scarce-but-fair.json`.

- [ ] **Step 3: Implement the deterministic fixture builder**

```js
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCandidate } from "../generators/generateCandidate.mjs";
import { canonicalBoardHash, hashBoard } from "../analysis/symmetry.mjs";

const descriptors = [
  ["scarce-but-fair", "scarce resource with multiple independent routes", "official-spiral", 1503],
  ["wheat-monopoly", "wheat access concentrated around one pick", "official-spiral", 223],
  ["dominant-settlement", "large quality cliff after the best node", "freeform-random", 6414],
  ["varied-openings", "many competitive opening locations", "official-spiral", 109],
  ["first-pick-sensitive", "early pick removes disproportionate resource access", "freeform-random", 7036],
  ["second-pick-sensitive", "diagnostic snake audit favours consecutive P2 picks", "freeform-random", 4300]
];

const directory = dirname(fileURLToPath(import.meta.url));
await mkdir(directory, { recursive: true });
for (const [label, expectation, family, seed] of descriptors) {
  const candidate = generateCandidate({ family, seed });
  const fixture = {
    label,
    expectation,
    family,
    generatorVersion: candidate.generatorVersion,
    seed,
    boardHash: hashBoard(candidate.tiles),
    canonicalSymmetryHash: canonicalBoardHash(candidate.tiles),
    tiles: candidate.tiles
  };
  await writeFile(join(directory, `${label}.json`), `${JSON.stringify(fixture, null, 2)}\n`);
}
```

- [ ] **Step 4: Generate fixtures and run evaluator tests**

Run:

```bash
pnpm -C game-core build
node scripts/duel-board-lab/fixtures/buildFixtures.mjs
pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluator.test.js --reporter=dot
```

Expected: fixture builder exits 0 and evaluator tests pass.

- [ ] **Step 5: Record the initial evaluator output for all fixtures**

Add this table-driven test so the snapshot remains a small calibration record rather than serialising whole reports:

```js
const FIXTURE_FILES = [
  "scarce-but-fair.json",
  "wheat-monopoly.json",
  "dominant-settlement.json",
  "varied-openings.json",
  "first-pick-sensitive.json",
  "second-pick-sensitive.json"
];

for (const filename of FIXTURE_FILES) {
  it(`records the initial evaluator output for ${filename}`, async () => {
    const fixture = JSON.parse(await readFile(new URL(`../fixtures/${filename}`, import.meta.url), "utf8"));
    const report = evaluateDuelBoard(fixture.tiles, { includeOrderAudit: true });
    expect({
      verdict: report.verdict,
      rejectionReasons: report.rejectionReasons,
      overallScore: Number(report.overallScore.toFixed(4)),
      orderRatio: Number(report.metrics.orderSensitivityAudit.secondToFirstRatio.toFixed(4))
    }).toMatchSnapshot();
  });
}
```

Run with `pnpm exec vitest run scripts/duel-board-lab/__tests__/evaluator.test.js -u`, inspect the snapshot values, and commit them as the initial calibration record. Do not change the profile merely to force fixture labels into pass/reject; the human corpus review in Task 9 controls profile acceptance.

- [ ] **Step 6: Commit Task 6**

```bash
git add scripts/duel-board-lab/fixtures scripts/duel-board-lab/__tests__/evaluator.test.js scripts/duel-board-lab/__tests__/__snapshots__
git commit -m "test: pin duel board calibration fixtures"
```

---

### Task 7: Streaming Run Store and Resumable Batch Pipeline

**Files:**
- Create: `scripts/duel-board-lab/lib/runStore.mjs`
- Create: `scripts/duel-board-lab/lib/runBatch.mjs`
- Test: `scripts/duel-board-lab/__tests__/runStore.test.js`

**Interfaces:**
- Produces: `createRunStore({ runDir, manifest })`, `scanRun(runDir)`, and `runBatch(options)`.
- `runBatch` accepts `{ runDir, family, startSeed, count, shortlistSize, auditSelections = true }` and returns a summary with counts and bounded selected candidates. The placement-order audit runs only when materialising selected boards, never in the full-corpus loop.

- [ ] **Step 1: Write failing store and resumption tests**

```js
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createRunStore, scanRun } from "../lib/runStore.mjs";

const paths = [];
afterEach(async () => Promise.all(paths.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

describe("duel board run store", () => {
  it("appends complete JSONL records and resumes at the next index", async () => {
    const runDir = await mkdtemp(join(tmpdir(), "duel-board-run-"));
    paths.push(runDir);
    const store = await createRunStore({ runDir, manifest: { family: "official-spiral", generatorVersion: "official-spiral-v1", evaluatorVersion: "duel-fair-v1", startSeed: 10, count: 2 } });
    await store.append({ candidateIndex: 0, seed: 10, verdict: "pass", rejectionCodes: [], overallScore: 80 });
    await store.append({ candidateIndex: 1, seed: 11, verdict: "reject", rejectionCodes: ["resource-monopoly"], overallScore: 40 });
    const scanned = await scanRun(runDir);
    expect(scanned.nextCandidateIndex).toBe(2);
    expect(scanned.lastRecord.seed).toBe(11);
  });

  it("truncates a partial final JSON line before resuming", async () => {
    const runDir = await mkdtemp(join(tmpdir(), "duel-board-run-"));
    paths.push(runDir);
    await writeFile(join(runDir, "manifest.json"), JSON.stringify({ family: "official-spiral", generatorVersion: "official-spiral-v1", evaluatorVersion: "duel-fair-v1", startSeed: 10, count: 2 }));
    await writeFile(join(runDir, "candidates.jsonl"), '{"candidateIndex":0,"seed":10,"verdict":"pass","rejectionCodes":[],"overallScore":80}\n{"candidateIndex":1');
    const scanned = await scanRun(runDir);
    expect(scanned.nextCandidateIndex).toBe(1);
    expect(await readFile(join(runDir, "candidates.jsonl"), "utf8")).toBe('{"candidateIndex":0,"seed":10,"verdict":"pass","rejectionCodes":[],"overallScore":80}\n');
  });
});
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/runStore.test.js --reporter=dot
```

Expected: FAIL because `lib/runStore.mjs` does not exist.

- [ ] **Step 3: Implement manifest and JSONL persistence**

`runStore.mjs` must use `mkdir`, `open`, `readFile`, `truncate`, and `writeFile` from `node:fs/promises`, plus `createReadStream` and `readline.createInterface` for memory-bounded scans.

Implement these exact behaviors:

```js
export async function createRunStore({ runDir, manifest }) {
  await mkdir(join(runDir, "boards"), { recursive: true });
  const manifestPath = join(runDir, "manifest.json");
  const existing = await readJsonIfPresent(manifestPath);
  if (existing) assertCompatibleManifest(existing, manifest);
  const baseManifest = existing ?? { ...manifest, startedAt: new Date().toISOString() };
  if (!existing) await writeFile(manifestPath, `${JSON.stringify({ ...baseManifest, status: "running" }, null, 2)}\n`);
  const candidatesPath = join(runDir, "candidates.jsonl");
  return {
    append: async (record) => {
      const handle = await open(candidatesPath, "a");
      try { await handle.write(`${JSON.stringify(record)}\n`); }
      finally { await handle.close(); }
    },
    writeBoard: async (name, board) => writeFile(join(runDir, "boards", `${name}.json`), `${JSON.stringify(board, null, 2)}\n`),
    complete: async (summary) => writeFile(manifestPath, `${JSON.stringify({ ...baseManifest, status: "complete", completedAt: new Date().toISOString(), summary }, null, 2)}\n`)
  };
}

function assertCompatibleManifest(existing, requested) {
  for (const key of ["family", "generatorVersion", "evaluatorVersion", "startSeed", "count", "shortlistSize"]) {
    if (existing[key] !== requested[key]) {
      throw new Error(`Run manifest mismatch for ${key}: existing=${existing[key]} requested=${requested[key]}`);
    }
  }
}
```

Before scanning, repair a partial tail by byte offset, then stream complete lines. Use this implementation skeleton; `updateBoundedRecordSelections` uses the same score/reason comparators as `runBatch` and retains at most `shortlistSize` entries per bucket.

```js
const TAIL_BYTES = 64 * 1024;

async function truncatePartialLine(candidatesPath) {
  let handle;
  try {
    handle = await open(candidatesPath, "r+");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  try {
    const { size } = await handle.stat();
    if (size === 0) return;
    const length = Math.min(size, TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    if (buffer[length - 1] === 10) return;
    const finalNewline = buffer.lastIndexOf(10);
    const truncateAt = finalNewline === -1 ? size - length : size - length + finalNewline + 1;
    await handle.truncate(truncateAt);
  } finally {
    await handle.close();
  }
}

export async function scanRun(runDir, { shortlistSize = 20 } = {}) {
  const candidatesPath = join(runDir, "candidates.jsonl");
  await truncatePartialLine(candidatesPath);
  const state = {
    nextCandidateIndex: 0,
    lastRecord: null,
    counts: { pass: 0, reject: 0, invalid: 0 },
    selections: createEmptySelections(),
    seenCanonicalHashes: new Set()
  };
  let input;
  try {
    input = createReadStream(candidatesPath, { encoding: "utf8" });
    await once(input, "open");
  } catch (error) {
    if (error.code === "ENOENT") return state;
    throw error;
  }
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line) continue;
    const record = JSON.parse(line);
    if (record.candidateIndex !== state.nextCandidateIndex) {
      throw new Error(`Non-contiguous candidate index: expected ${state.nextCandidateIndex}, found ${record.candidateIndex}`);
    }
    state.nextCandidateIndex += 1;
    state.lastRecord = record;
    state.counts[record.verdict] += 1;
    if (record.canonicalSymmetryHash) state.seenCanonicalHashes.add(record.canonicalSymmetryHash);
    updateBoundedRecordSelections(state.selections, record, shortlistSize);
  }
  return state;
}
```

Import `once` from `node:events`. The scan holds only counts, bounded selection arrays, the last record, and the canonical-hash set; it never materialises the JSONL corpus.

- [ ] **Step 4: Implement bounded batch generation**

`runBatch.mjs` must:

```js
for (let offset = resume.nextCandidateIndex; offset < count; offset += 1) {
  const seed = startSeed + offset;
  try {
    const candidate = generateCandidate({ family, seed });
    const report = evaluateDuelBoard(candidate.tiles);
    const record = {
      candidateIndex: offset,
      seed,
      generatorFamily: family,
      generatorVersion: candidate.generatorVersion,
      evaluatorVersion: report.evaluatorVersion,
      boardHash: hashBoard(candidate.tiles),
      canonicalSymmetryHash: canonicalBoardHash(candidate.tiles),
      verdict: report.verdict,
      rejectionCodes: report.rejectionReasons,
      overallScore: report.overallScore,
      componentPenalties: report.componentPenalties,
      metrics: report.metrics
    };
    await store.append(record);
    updateBoundedRecordSelections(selections, record, shortlistSize);
  } catch (error) {
    await store.append({
      candidateIndex: offset,
      seed,
      generatorFamily: family,
      generatorVersion: GENERATOR_VERSIONS[family],
      evaluatorVersion: EVALUATOR_VERSION,
      boardHash: null,
      canonicalSymmetryHash: null,
      verdict: "invalid",
      rejectionCodes: ["invalid-board"],
      error: error instanceof Error ? error.message : String(error),
      overallScore: null,
      componentPenalties: null,
      metrics: null
    });
  }
}
```

Use the same selector in live generation and `scanRun` so a resumed run reconstructs the identical shortlist:

```js
function selectionRanks(record) {
  if (!record.metrics || !Number.isFinite(record.overallScore)) {
    return record.verdict === "invalid" ? { invalid: record.candidateIndex } : {};
  }
  const resources = Object.values(record.metrics.resourceContestability.byResource);
  const penalties = Object.values(record.componentPenalties ?? {});
  return {
    ...(record.verdict === "pass" ? { top: -record.overallScore } : {}),
    bottom: record.overallScore,
    "near-dominant-top-spot": Math.abs(record.metrics.competitiveSpotDepth.topSpotCliff - DUEL_FAIR_V1_PROFILE.maxTopSpotCliff),
    "near-competitive-spots": Math.abs(record.metrics.competitiveSpotDepth.competitiveSpotCount - DUEL_FAIR_V1_PROFILE.minCompetitiveSpots),
    "near-resource-monopoly": Math.abs(Math.min(...resources.map((metric) => metric.secondIndependentRatio)) - DUEL_FAIR_V1_PROFILE.minSecondIndependentResourceRatio),
    "near-resource-routes": Math.abs(Math.min(...resources.map((metric) => metric.independentViableRoutes.length)) - DUEL_FAIR_V1_PROFILE.minIndependentResourceRoutes),
    "near-opening-routes": Math.abs(record.metrics.openingRouteDepth.distinctCompetitiveRouteCount - DUEL_FAIR_V1_PROFILE.minDistinctOpeningRoutes),
    "near-pick-sensitive": Math.abs(record.metrics.pickSensitivity.maxCollapse - DUEL_FAIR_V1_PROFILE.maxPickCollapse),
    disagreement: penalties.length === 0 ? Infinity : -(Math.max(...penalties) - Math.min(...penalties)),
    ...(record.rejectionCodes.includes("adjacent-red-numbers") ? { "adjacent-red-example": record.candidateIndex } : {}),
    ...(record.rejectionCodes.includes("no-compatible-opening-routes") ? { "incompatible-route-example": record.candidateIndex } : {})
  };
}

export function updateBoundedRecordSelections(selections, record, limit) {
  for (const [group, rank] of Object.entries(selectionRanks(record))) {
    const bucket = selections[group] ??= [];
    const identity = record.canonicalSymmetryHash ?? `invalid:${record.candidateIndex}`;
    if (bucket.some((entry) => entry.identity === identity)) continue;
    bucket.push({ identity, rank, record });
    bucket.sort((left, right) => left.rank - right.rank || left.record.candidateIndex - right.record.candidateIndex);
    if (bucket.length > limit) bucket.length = limit;
  }
}
```

Negative ranks make larger scores/spreads sort first while every bucket still uses one ascending comparator. At completion, merge bucket entries by canonical hash, sort each payload's `selectionGroups`, regenerate it from family/seed, and verify the raw hash. Write:

```js
for (const selected of mergeSelectionGroups(selections)) {
  const candidate = generateCandidate({ family, seed: selected.record.seed });
  if (hashBoard(candidate.tiles) !== selected.record.boardHash) throw new Error(`Candidate hash mismatch for index ${selected.record.candidateIndex}`);
  const diagnostic = auditSelections ? evaluateDuelBoard(candidate.tiles, { includeOrderAudit: true }) : null;
  await store.writeBoard(`candidate-${selected.record.candidateIndex}`, {
    selectionGroups: selected.selectionGroups,
    record: selected.record,
    diagnostic,
    tiles: candidate.tiles
  });
}
```

Then mark the manifest complete. This keeps full board payloads and the `P1, P2, P2, P1` audit bounded to selected candidates.

- [ ] **Step 5: Add batch determinism and resume tests**

Use temporary directories to run `count: 5`, verify exactly five lines, rerun the same options, verify no duplicate lines, and compare the two family/version manifests. Simulate an interrupted run by writing two valid records into a `count: 5` run and verify the next invocation appends indices `2`, `3`, and `4` only.

- [ ] **Step 6: Run persistence tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/runStore.test.js --reporter=dot
```

Expected: persistence, truncation, determinism, and resume tests pass.

- [ ] **Step 7: Commit Task 7**

```bash
git add scripts/duel-board-lab/lib scripts/duel-board-lab/__tests__/runStore.test.js
git commit -m "feat: stream resumable duel board runs"
```

---

### Task 8: Summary, SVG Report, and Candidate Inspection

**Files:**
- Create: `scripts/duel-board-lab/reports/summary.mjs`
- Create: `scripts/duel-board-lab/reports/renderBoard.mjs`
- Create: `scripts/duel-board-lab/reports/buildReport.mjs`
- Test: `scripts/duel-board-lab/__tests__/reports.test.js`

**Interfaces:**
- Produces: `summariseRecords(records)`, `renderBoardSvg({ tiles, record })`, `buildReport(runDir)`, and `inspectCandidate({ runDir, candidateIndex })`.

- [ ] **Step 1: Write failing summary and render tests**

```js
import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { renderBoardSvg } from "../reports/renderBoard.mjs";
import { summariseRecords } from "../reports/summary.mjs";

describe("duel board reports", () => {
  it("summarises verdicts and rejection codes", () => {
    const summary = summariseRecords([
      { verdict: "pass", rejectionCodes: [], overallScore: 88 },
      { verdict: "reject", rejectionCodes: ["resource-monopoly"], overallScore: 41 },
      { verdict: "reject", rejectionCodes: ["resource-monopoly", "pick-sensitive"], overallScore: 27 }
    ]);
    expect(summary.verdicts).toEqual({ pass: 1, reject: 2, invalid: 0 });
    expect(summary.rejectionCodes["resource-monopoly"]).toBe(2);
  });

  it("renders a self-contained SVG for one candidate", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const svg = renderBoardSvg({ tiles: candidate.tiles, record: { seed: 1, overallScore: 88, verdict: "pass" } });
    expect(svg).toContain("<svg");
    expect(svg).toContain("Seed 1");
    expect(svg.match(/<polygon/g)).toHaveLength(19);
  });
});
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/reports.test.js --reporter=dot
```

Expected: FAIL because report modules do not exist.

- [ ] **Step 3: Implement compact aggregation**

```js
export function summariseRecords(records) {
  const summary = {
    count: 0,
    verdicts: { pass: 0, reject: 0, invalid: 0 },
    rejectionCodes: {},
    score: { min: null, max: null, mean: null }
  };
  let scoreTotal = 0;
  let scoreCount = 0;
  for (const record of records) {
    summary.count += 1;
    summary.verdicts[record.verdict] += 1;
    for (const code of record.rejectionCodes ?? []) {
      summary.rejectionCodes[code] = (summary.rejectionCodes[code] ?? 0) + 1;
    }
    if (Number.isFinite(record.overallScore)) {
      summary.score.min = summary.score.min == null ? record.overallScore : Math.min(summary.score.min, record.overallScore);
      summary.score.max = summary.score.max == null ? record.overallScore : Math.max(summary.score.max, record.overallScore);
      scoreTotal += record.overallScore;
      scoreCount += 1;
    }
  }
  summary.score.mean = scoreCount === 0 ? null : scoreTotal / scoreCount;
  return summary;
}
```

- [ ] **Step 4: Implement dependency-free SVG rendering**

Use point-up cube-to-pixel coordinates:

```js
const HEX_SIZE = 46;
const cubeToPixel = ([q, , r]) => ({
  x: Math.sqrt(3) * HEX_SIZE * (q + r / 2) + 250,
  y: 1.5 * HEX_SIZE * r + 210
});
```

Implement the renderer with fixed colours and escaped text. Port details appear in a compact legend below the board rather than as nine extra hexes.

```js
import { TileTypes } from "@settlex/game-core";

const RESOURCE_COLOURS = Object.freeze({
  Wood: "#3f7d52", Brick: "#b85c44", Sheep: "#8dbf67",
  Wheat: "#d8b84a", Ore: "#77808c", Desert: "#d8c49a"
});

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function hexPoints({ x, y }) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return `${x + HEX_SIZE * Math.cos(angle)},${y + HEX_SIZE * Math.sin(angle)}`;
  }).join(" ");
}

export function renderBoardSvg({ tiles, record }) {
  const land = tiles.filter((tile) => tile.type === TileTypes.LAND);
  const ports = tiles.filter((tile) => tile.type === TileTypes.PORT);
  const hexes = land.map((tile) => {
    const point = cubeToPixel(tile.coordinate);
    const resource = tile.tile.resource ?? "desert";
    const number = tile.tile.number;
    return `<g><polygon points="${hexPoints(point)}" fill="${RESOURCE_COLOURS[resource] ?? "#cccccc"}" stroke="#20242b" stroke-width="2"/>${number == null ? "" : `<circle cx="${point.x}" cy="${point.y}" r="16" fill="#f7f0df"/><text x="${point.x}" y="${point.y + 5}" text-anchor="middle" font-size="15" font-weight="700">${escapeHtml(number)}</text>`}</g>`;
  }).join("");
  const portLegend = ports.map((tile) => escapeHtml(tile.tile.resource)).join(" · ");
  const title = `${record.generatorFamily ?? record.family ?? "candidate"} · Seed ${record.seed} · ${record.verdict} · ${Number(record.overallScore).toFixed(2)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img" aria-label="${escapeHtml(title)}"><rect width="500" height="500" fill="#f4f1e8"/><text x="20" y="28" font-family="system-ui" font-size="16">${escapeHtml(title)}</text>${hexes}<text x="20" y="475" font-family="system-ui" font-size="12">Ports: ${portLegend}</text></svg>`;
}
```

- [ ] **Step 5: Implement selected-board HTML reporting and inspection**

`runBatch` stores each selected payload as `{ selectionGroups, record, diagnostic, tiles }`, where `selectionGroups` is a sorted array such as `['top', 'near-resource-monopoly']`. `buildReport(runDir)` must stream `candidates.jsonl` to create `summary.json`, load only JSON boards under `boards/`, render their SVGs, and write a self-contained `report.html` with:

- total/pass/reject/invalid counts;
- rejection-code table;
- score min/mean/max;
- top, bottom, threshold, and outlier sections;
- per-board seed, family, score, reasons, and SVG.

Use these entry-point shapes (small HTML table/card helpers can remain private):

```js
export async function buildReport(runDir) {
  const summary = createEmptySummary();
  for await (const record of readJsonLines(join(runDir, "candidates.jsonl"))) addRecordToSummary(summary, record);
  finaliseSummary(summary);
  await writeFile(join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  const boardFiles = (await readdir(join(runDir, "boards")))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const boards = await Promise.all(boardFiles.map(async (name) =>
    JSON.parse(await readFile(join(runDir, "boards", name), "utf8"))));
  const sections = groupSelectedBoards(boards);
  const html = renderReportDocument({ summary, sections });
  const reportPath = join(runDir, "report.html");
  await writeFile(reportPath, html);
  return { reportPath, summary };
}

export async function inspectCandidate({ runDir, candidateIndex }) {
  let record = null;
  for await (const candidate of readJsonLines(join(runDir, "candidates.jsonl"))) {
    if (candidate.candidateIndex === candidateIndex) { record = candidate; break; }
  }
  if (!record) throw new Error(`Candidate index ${candidateIndex} not found`);
  const generated = generateCandidate({ family: record.generatorFamily, seed: record.seed });
  if (hashBoard(generated.tiles) !== record.boardHash) {
    throw new Error(`Candidate hash mismatch for index ${candidateIndex}`);
  }
  const diagnostic = evaluateDuelBoard(generated.tiles, { includeOrderAudit: true });
  const outputPath = join(runDir, "boards", `inspect-${candidateIndex}.html`);
  await writeFile(outputPath, renderInspectionDocument({ record, diagnostic, tiles: generated.tiles }));
  return outputPath;
}
```

`readJsonLines` uses `createReadStream` plus `readline.createInterface`, as in Task 7. `createEmptySummary`, `addRecordToSummary`, and `finaliseSummary` share the same field names and arithmetic as `summariseRecords`; do not load records into an array. The HTML contains total/pass/reject/invalid counts, the rejection-code table, score min/mean/max, and top, bottom, threshold, disagreement, and outlier sections. Each board card includes seed, family, score, reasons, and `renderBoardSvg(...)`. Escape every record-derived string.

- [ ] **Step 6: Run report tests**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/reports.test.js --reporter=dot
```

Expected: summary and SVG tests pass. Add this temporary-run integration shape (with the same `afterEach` cleanup pattern used by `runStore.test.js`):

```js
it("builds selected-board HTML and rejects inspection hash drift", async () => {
  const runDir = await mkdtemp(join(tmpdir(), "duel-board-report-"));
  paths.push(runDir);
  await mkdir(join(runDir, "boards"), { recursive: true });
  const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
  const record = { candidateIndex: 0, seed: 1, generatorFamily: BOARD_FAMILIES.OFFICIAL_SPIRAL, verdict: "pass", rejectionCodes: [], overallScore: 80, boardHash: "altered" };
  await writeFile(join(runDir, "candidates.jsonl"), `${JSON.stringify(record)}\n`);
  await writeFile(join(runDir, "boards", "top-0.json"), JSON.stringify({ selectionGroups: ["top"], record, tiles: candidate.tiles }));
  const { reportPath } = await buildReport(runDir);
  expect(await readFile(reportPath, "utf8")).toContain("Seed 1");
  await expect(inspectCandidate({ runDir, candidateIndex: 0 })).rejects.toThrow("Candidate hash mismatch for index 0");
});
```

- [ ] **Step 7: Commit Task 8**

```bash
git add scripts/duel-board-lab/reports scripts/duel-board-lab/__tests__/reports.test.js
git commit -m "feat: report and inspect duel board runs"
```

---

### Task 9: CLI Commands, Benchmarks, Verification, and Calibration Gate

**Files:**
- Create: `scripts/duel-board-lab/lib/cliOptions.mjs`
- Create: `scripts/duel-board-lab/generate.mjs`
- Create: `scripts/duel-board-lab/compare.mjs`
- Create: `scripts/duel-board-lab/inspect.mjs`
- Create: `scripts/duel-board-lab/benchmark.mjs`
- Test: `scripts/duel-board-lab/__tests__/cliOptions.test.js`
- Modify: `package.json`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Produces commands `pnpm board:lab:generate`, `pnpm board:lab:compare`, `pnpm board:lab:inspect`, `pnpm board:lab:benchmark`, and `pnpm test:board-lab`.

- [ ] **Step 1: Write failing CLI option tests**

```js
import { describe, expect, it } from "vitest";
import { parseGenerateOptions, parseInspectOptions } from "../lib/cliOptions.mjs";

describe("duel board lab CLI", () => {
  it("parses a bounded deterministic run", () => {
    expect(parseGenerateOptions(["--family", "official-spiral", "--count", "100", "--start-seed", "20", "--run-id", "smoke"]))
      .toEqual({ family: "official-spiral", count: 100, startSeed: 20, runId: "smoke", shortlistSize: 20 });
  });

  it("rejects invalid count and family values", () => {
    expect(() => parseGenerateOptions(["--family", "unknown", "--count", "10", "--run-id", "bad"])).toThrow("family must be official-spiral or freeform-random");
    expect(() => parseGenerateOptions(["--family", "official-spiral", "--count", "0", "--run-id", "bad"])).toThrow("count must be a positive integer");
  });

  it("keeps run identity and candidate family as separate inspect arguments", () => {
    expect(parseInspectOptions(["--run-id", "smoke", "--family", "official-spiral", "--candidate-index", "7"]))
      .toEqual({ runId: "smoke", family: "official-spiral", candidateIndex: 7 });
  });
});
```

- [ ] **Step 2: Run the tests and verify missing-module failure**

Run:

```bash
pnpm exec vitest run scripts/duel-board-lab/__tests__/cliOptions.test.js --reporter=dot
```

Expected: FAIL because `lib/cliOptions.mjs` does not exist.

- [ ] **Step 3: Implement strict dependency-free CLI parsing**

Implement strict parsers with `parseArgs` from `node:util`:

```js
import { parseArgs } from "node:util";
import { BOARD_FAMILIES } from "../constants.mjs";

const FAMILY_VALUES = new Set(Object.values(BOARD_FAMILIES));
const RUN_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const positiveInteger = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};
const nonNegativeInteger = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
};
const validFamily = (family) => {
  if (!FAMILY_VALUES.has(family)) throw new Error("family must be official-spiral or freeform-random");
  return family;
};
const validRunId = (runId) => {
  if (!RUN_ID.test(runId ?? "")) throw new Error("run-id must be 1-64 lowercase letters, numbers, or hyphens");
  return runId;
};

export function parseGenerateOptions(args) {
  const { values } = parseArgs({ args, strict: true, options: {
    family: { type: "string" }, count: { type: "string" },
    "start-seed": { type: "string", default: "1" }, "run-id": { type: "string" },
    "shortlist-size": { type: "string", default: "20" }
  }});
  return {
    family: validFamily(values.family),
    count: positiveInteger(values.count, "count"),
    startSeed: nonNegativeInteger(values["start-seed"], "start-seed"),
    runId: validRunId(values["run-id"]),
    shortlistSize: positiveInteger(values["shortlist-size"], "shortlist-size")
  };
}

export function parseCompareOptions(args) {
  const { values } = parseArgs({ args, strict: true, options: {
    count: { type: "string" }, "start-seed": { type: "string", default: "1" },
    "run-id": { type: "string" }, "shortlist-size": { type: "string", default: "20" }
  }});
  return {
    count: positiveInteger(values.count, "count"),
    startSeed: nonNegativeInteger(values["start-seed"], "start-seed"),
    runId: validRunId(values["run-id"]),
    shortlistSize: positiveInteger(values["shortlist-size"], "shortlist-size")
  };
}

export function parseInspectOptions(args) {
  const { values } = parseArgs({ args, strict: true, options: {
    family: { type: "string" }, "run-id": { type: "string" }, "candidate-index": { type: "string" }
  }});
  return {
    runId: validRunId(values["run-id"]),
    family: validFamily(values.family),
    candidateIndex: nonNegativeInteger(values["candidate-index"], "candidate-index")
  };
}
```

Wire the three entry points without implicit cwd-dependent paths beyond the repository command itself:

```js
// generate.mjs
import { resolve } from "node:path";
import { parseGenerateOptions } from "./lib/cliOptions.mjs";
import { runBatch } from "./lib/runBatch.mjs";
import { buildReport } from "./reports/buildReport.mjs";

const options = parseGenerateOptions(process.argv.slice(2));
const runDir = resolve("tmp", "duel-board-lab", "runs", options.runId, options.family);
const summary = await runBatch({ runDir, ...options, auditSelections: true });
const { reportPath } = await buildReport(runDir);
console.log(JSON.stringify({ runDir, reportPath, summary }, null, 2));
```

```js
// compare.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BOARD_FAMILIES } from "./constants.mjs";
import { parseCompareOptions } from "./lib/cliOptions.mjs";
import { runBatch } from "./lib/runBatch.mjs";
import { buildReport } from "./reports/buildReport.mjs";

const options = parseCompareOptions(process.argv.slice(2));
const rootDir = resolve("tmp", "duel-board-lab", "runs", options.runId);
await mkdir(rootDir, { recursive: true });
const comparison = {};
for (const family of Object.values(BOARD_FAMILIES)) {
  const runDir = join(rootDir, family);
  const summary = await runBatch({ runDir, family, ...options, auditSelections: true });
  const { reportPath } = await buildReport(runDir);
  comparison[family] = {
    ...summary,
    reportPath,
    passRate: summary.counts.pass / summary.counts.total
  };
}
await writeFile(join(rootDir, "comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`);
await writeFile(join(rootDir, "comparison.html"), renderComparisonHtml(comparison));
console.log(JSON.stringify({ rootDir, comparison }, null, 2));
```

```js
// inspect.mjs
import { resolve } from "node:path";
import { parseInspectOptions } from "./lib/cliOptions.mjs";
import { inspectCandidate } from "./reports/buildReport.mjs";

const options = parseInspectOptions(process.argv.slice(2));
const runDir = resolve("tmp", "duel-board-lab", "runs", options.runId, options.family);
console.log(await inspectCandidate({ runDir, candidateIndex: options.candidateIndex }));
```

Keep `renderComparisonHtml` private to `compare.mjs`; it renders one escaped table with family, total, pass rate, min/mean/max score, peak RSS, and links to each sibling `report.html`. For compare, `--count` means **that many candidates per family**, not a total split between families. `inspect.mjs` keeps `--run-id`, `--family`, and `--candidate-index` separate so path validation cannot be bypassed with a slash in the run ID.

- [ ] **Step 4: Implement the benchmark command**

`benchmark.mjs` must:

1. generate 10,000 candidates split evenly between the two families;
2. time evaluation-only over the already generated arrays;
3. time generate-and-evaluate without retaining boards;
4. report boards/second and `process.memoryUsage().rss` peak in MiB;
5. exit non-zero when evaluation is below 500 boards/second or full throughput is below 200 boards/second;
6. print the 256 MiB streaming target but measure the 100,000-candidate memory target only during the calibration run.

Use this timing core; sample RSS every 100 iterations so the reported value is an observed peak rather than merely the final sample:

```js
const families = Object.values(BOARD_FAMILIES);
const candidates = Array.from({ length: 10_000 }, (_, index) =>
  generateCandidate({ family: families[index % families.length], seed: Math.floor(index / families.length) + 1 }));

function timed(label, count, work) {
  let peakRss = process.memoryUsage().rss;
  const started = performance.now();
  for (let index = 0; index < count; index += 1) {
    work(index);
    if (index % 100 === 0) peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  const seconds = (performance.now() - started) / 1000;
  return { label, boardsPerSecond: count / seconds, peakRssMiB: peakRss / 1024 / 1024 };
}

const evaluation = timed("evaluation-only", candidates.length, (index) => evaluateDuelBoard(candidates[index].tiles));
const full = timed("generate-and-evaluate", 10_000, (index) => {
  const candidate = generateCandidate({ family: families[index % families.length], seed: Math.floor(index / families.length) + 20_001 });
  evaluateDuelBoard(candidate.tiles);
});
console.table([evaluation, full]);
console.log("Streaming calibration target: under 256 MiB RSS for 100,000 candidates");
if (evaluation.boardsPerSecond < 500 || full.boardsPerSecond < 200) process.exitCode = 1;
```

Use `performance.now()` solely for benchmark measurement. Benchmark timing never affects candidate selection or output. In `runBatch`, sample RSS every 100 candidates, retain only the maximum number, and write `peakRssMiB` to the completed manifest summary; Task 9's 100,000-per-family evidence run is the actual streaming-memory acceptance measurement.

- [ ] **Step 5: Add package scripts**

Add these exact entries without changing existing scripts:

```json
{
  "test:board-lab": "pnpm exec vitest run scripts/duel-board-lab --reporter=dot",
  "preboard:lab:generate": "pnpm -C game-core build",
  "board:lab:generate": "node scripts/duel-board-lab/generate.mjs",
  "preboard:lab:compare": "pnpm -C game-core build",
  "board:lab:compare": "node scripts/duel-board-lab/compare.mjs",
  "preboard:lab:inspect": "pnpm -C game-core build",
  "board:lab:inspect": "node scripts/duel-board-lab/inspect.mjs",
  "preboard:lab:benchmark": "pnpm -C game-core build",
  "board:lab:benchmark": "node scripts/duel-board-lab/benchmark.mjs"
}
```

- [ ] **Step 6: Run automated verification**

Run:

```bash
pnpm test:board-lab
pnpm -C game-core test
pnpm -C game-core build
pnpm exec eslint scripts/duel-board-lab --ext .js,.mjs
git diff --check
```

Expected: all board-lab and game-core tests pass, game-core builds, eslint reports no errors, and `git diff --check` exits 0.

- [ ] **Step 7: Run smoke and benchmark commands**

Run:

```bash
pnpm board:lab:compare --count 100 --start-seed 1 --run-id smoke-v1
pnpm board:lab:inspect --run-id smoke-v1 --family official-spiral --candidate-index 0
pnpm board:lab:benchmark
```

Expected:

- `tmp/duel-board-lab/runs/smoke-v1/` contains two family subruns and a comparison report;
- candidate index 0 regenerates with a matching hash and produces an inspection HTML file;
- benchmark exits 0 and prints both throughput measurements.

- [ ] **Step 8: Generate the human calibration corpus**

Run:

```bash
pnpm board:lab:compare --count 10000 --start-seed 1 --run-id duel-fair-v1-calibration
```

Expected: 10,000 candidates per family are evaluated; compact JSONL and selected-board reports are written without rendering the full corpus.

Review exactly these report sections for both families:

- top 20;
- bottom 20;
- nearest each active gate;
- component-disagreement outliers;
- placement-order audit warnings.

Stop for user review at this point. `duel-fair-v1` is not frozen and the 100,000-board run is not started until the user approves the calibration gallery.

- [ ] **Step 9: After calibration approval, freeze and run the final evidence corpus**

If the user approves without profile changes, run:

```bash
pnpm board:lab:compare --count 100000 --start-seed 1 --run-id duel-fair-v1-evidence
```

If the user requests profile changes, change only `duelFairV1Profile.mjs` and affected evaluator snapshot expectations, rerun the focused tests and the 10,000-board calibration corpus under a new run ID, and return to the same review gate before the 100,000-board evidence run.

Record the accepted profile values, run IDs, pass rates, throughput, peak memory, and report paths in `docs/agent/PROGRESS.md`. Record the ownership boundary, versioning rules, generated-output location, and calibration requirement in `docs/agent/NOTES.md`.

- [ ] **Step 10: Final verification and commit Task 9**

Run:

```bash
pnpm test:board-lab
pnpm -C game-core test
pnpm -C game-core build
pnpm exec eslint scripts/duel-board-lab --ext .js,.mjs
git diff --check
```

Then commit only lab command, docs, and accepted calibration changes:

```bash
git add package.json scripts/duel-board-lab docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "feat: add duel fair board lab"
```

Expected: the commit excludes `tmp/duel-board-lab/`, production match files, and all unrelated worktree changes.

---

## Final Review Checklist

- `game-core` has no fairness-policy or report changes.
- Both candidate families are deterministic and structurally valid.
- Every result has stable provenance, hashes, metrics, verdict, reasons, and score.
- Scarcity and monopolisation are measured separately.
- Placement order remains a diagnostic audit only.
- JSONL output resumes safely after partial writes.
- Symmetric boards deduplicate under twelve rotations/reflections.
- Only selected boards render into HTML/SVG.
- The calibration corpus is human-reviewed before `duel-fair-v1` is frozen.
- The 100,000-board evidence run meets the stated memory target.
- Production board behavior remains unchanged.
