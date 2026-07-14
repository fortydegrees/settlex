# Explicit Board Source Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the provisional duel `standard-balanced` sentinel with explicit product-owned board sources, truthful generator configuration/provenance, and archive persistence.

**Architecture:** `game-core` retains deterministic board construction and neutral rulesets/configurations. A shared SettleHex mode registry selects a `boardSourceId`; Catana materialises that source through either the fixed duel catalog or direct generation and stores the actual `boardConfigId` plus `boardProvenance`. Archives copy those resolved values from initial game state rather than inferring them from requested setup metadata.

**Tech Stack:** TypeScript game core, JavaScript/ES modules, boardgame.io injected RNG, Vitest, PostgreSQL SQL migrations, Node.js catalog publisher, pnpm.

## Global Constraints

- Work only in `/Users/david/coding/settlex/.worktrees/duel-fair-board-lab` on `codex/duel-fair-board-lab`.
- Use pnpm and add no dependencies or build-tool changes.
- Use test-first cycles for every logic, state-flow, and archive change.
- Keep fairness evaluation, weights, reports, and catalogs outside `game-core`.
- Keep `duel-fair-official-v1` as the default duel source and do not change its 1,000 seeds, ranks, scores, tags, or board hashes.
- Rename the engine configuration `standard-official` to `standard-official-spiral`; keep generator version `official-spiral-v1` unchanged.
- Remove `standard-balanced`, `BalancedBoard`, and the elapsed-time-dependent runtime balanced generation path.
- Normal product setup uses `boardSourceId`; `setupData.boardConfigId` is rejected rather than treated as a second source-selection API.
- Preserve explicit `setupData.boardConfig` only for dev/test custom generation and reject it when an explicit `boardSourceId` is also present.
- Never silently fall back for unknown modes, sources, configurations, or catalog selections.
- Use boardgame.io's injected RNG for live source selection; never call the evaluator during live match setup.
- Add a forward archive migration; do not rewrite an already-applied historical migration or reinterpret old rows.
- Do not deploy production in this plan.

---

### Task 1: Make The Official-Spiral Generator Identity Literal

**Files:**
- Modify: `game-core/src/board/boardConfigs.ts`
- Modify: `game-core/src/board/boardInvariants.test.ts`
- Modify: `game-core/src/gameModes.ts`
- Modify: `scripts/duel-board-lab/generators/officialSpiral.mjs`
- Modify: `scripts/duel-board-lab/lib/catalog.mjs`
- Modify: `scripts/duel-board-lab/__tests__/catalog.test.js`
- Modify: `scripts/duel-board-lab/__tests__/catalogArtifacts.test.js`
- Modify: `app/catana/gameSetup/duelFairBoardCatalog.js`
- Modify: `app/catana/__tests__/duelFairBoardCatalog.test.js`
- Modify: `app/catana/__tests__/initialState.test.js`
- Modify: `app/catana/__tests__/Game.boardConfig.test.js`
- Modify: `server/bots/pufferStateAdapter.js`
- Modify: `ai/pufferlib/js/engine_host.cjs`
- Modify: `ai/pufferlib/js/settlexEnv.cjs`
- Modify: `ai/pufferlib/python/settlex_puffer/train.py`
- Modify: `ai/pufferlib/python/settlex_puffer/evaluate.py`
- Modify: `ai/pufferlib/python/settlex_puffer/eval_curve.py`
- Regenerate: `data/board-catalogs/duel-fair-official-v1.json`
- Regenerate: `app/catana/gameSetup/catalogs/duelFairOfficialV1.generated.js`

**Interfaces:**
- Consumes: existing `BoardConfig`, `generateBoard`, official-spiral source run, and catalog publisher.
- Produces: `BoardConfigId` value `standard-official-spiral`; catalog `generator.boardConfigId`; runtime catalog `boardConfigId`.

- [ ] **Step 1: Change focused tests to demand the explicit identity**

In `game-core/src/board/boardInvariants.test.ts`, change the official config lookup to:

```ts
const baseConfig = resolveBoardConfig("standard-official-spiral");
```

In `scripts/duel-board-lab/__tests__/catalog.test.js`, extend the expected generator and rendered runtime assertions:

```js
generator: {
  boardConfigId: "standard-official-spiral",
  family: "official-spiral",
  version: "official-spiral-v1"
}
```

```js
expect(rendered).toContain('boardConfigId: "standard-official-spiral"');
```

In `scripts/duel-board-lab/__tests__/catalogArtifacts.test.js`, require both artifacts to agree:

```js
expect(fullCatalog.generator).toMatchObject({
  boardConfigId: "standard-official-spiral",
  family: "official-spiral",
  version: "official-spiral-v1"
});
expect(runtimeCatalog.boardConfigId).toBe(fullCatalog.generator.boardConfigId);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm exec vitest run game-core/src/board/boardInvariants.test.ts scripts/duel-board-lab/__tests__/catalog.test.js scripts/duel-board-lab/__tests__/catalogArtifacts.test.js --reporter=dot
```

Expected: FAIL because `standard-official-spiral` is not a registered config and the catalog artifacts do not contain `boardConfigId`.

- [ ] **Step 3: Rename the engine configuration and every direct consumer**

Change `BoardConfigId` and `BOARD_CONFIGS` in `game-core/src/board/boardConfigs.ts` to use this key while leaving its configuration body unchanged:

```ts
export type BoardConfigId =
  | "standard-official-spiral"
  | "standard-random"
  | "standard-balanced";

export const BOARD_CONFIGS: Record<BoardConfigId, BoardConfig> = {
  "standard-official-spiral": {
    specId: "standard-4p",
    generation: {
      terrain: "random",
      numbers: "official",
      ports: "random",
      options: { official: { startCorner: "random" } }
    }
  },
  "standard-random": {
    specId: "standard-4p",
    generation: { terrain: "random", numbers: "random", ports: "random" }
  },
  "standard-balanced": {
    specId: "standard-4p",
    generation: { terrain: "balanced", numbers: "balanced", ports: "random" }
  }
};
```

Replace every runtime/default occurrence of the exact old value `standard-official` in the files listed above with `standard-official-spiral`. Do not rename generator family/version strings.

- [ ] **Step 4: Bind catalog publication to the engine configuration**

Add this constant near `EXPECTED_MANIFEST` in `scripts/duel-board-lab/lib/catalog.mjs`:

```js
const OFFICIAL_BOARD_CONFIG_ID = "standard-official-spiral";
```

Return it in `buildCatalog`:

```js
generator: {
  boardConfigId: OFFICIAL_BOARD_CONFIG_ID,
  family: manifest.family,
  version: manifest.generatorVersion
},
```

Render it in `renderRuntimeCatalog` immediately after the catalog id:

```js
`  boardConfigId: ${quote(catalog.generator.boardConfigId)},`,
```

- [ ] **Step 5: Republish the catalog artifacts without regenerating the corpus**

Run:

```bash
pnpm board:lab:catalog --run-id duel-fair-official-v1-source --family official-spiral --catalog-id duel-fair-official-v1 --size 1000 --data-output data/board-catalogs/duel-fair-official-v1.json --runtime-output app/catana/gameSetup/catalogs/duelFairOfficialV1.generated.js
```

Expected: JSON reports 1,000 published entries. Only generator-configuration metadata changes; the entries remain identical.

Prove the entries are byte-for-byte JSON-equivalent to the committed catalog:

```bash
node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { execFileSync } from "node:child_process";
  const path = "data/board-catalogs/duel-fair-official-v1.json";
  const before = JSON.parse(execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" }));
  const after = JSON.parse(readFileSync(path, "utf8"));
  if (JSON.stringify(before.entries) !== JSON.stringify(after.entries)) {
    throw new Error("Catalog entries changed while adding generator metadata");
  }
  console.log(`verified ${after.entries.length} unchanged catalog entries`);
'
```

Expected: `verified 1000 unchanged catalog entries`.

- [ ] **Step 6: Verify the renamed identity and catalog integrity**

Run:

```bash
pnpm -C game-core build
pnpm exec vitest run game-core/src/board/boardInvariants.test.ts scripts/duel-board-lab/__tests__/catalog.test.js scripts/duel-board-lab/__tests__/catalogArtifacts.test.js app/catana/__tests__/duelFairBoardCatalog.test.js --reporter=dot
if rg -n '"standard-official"' ai app game-core lib server scripts data/board-catalogs; then exit 1; fi
```

Expected: build and tests exit 0; the exact obsolete quoted identifier is absent. The artifact test regenerates and hash-checks all 1,000 boards.

- [ ] **Step 7: Commit the explicit generator identity**

```bash
git add game-core/src/board/boardConfigs.ts game-core/src/board/boardInvariants.test.ts game-core/src/gameModes.ts scripts/duel-board-lab/generators/officialSpiral.mjs scripts/duel-board-lab/lib/catalog.mjs scripts/duel-board-lab/__tests__/catalog.test.js scripts/duel-board-lab/__tests__/catalogArtifacts.test.js app/catana/gameSetup/duelFairBoardCatalog.js app/catana/gameSetup/catalogs/duelFairOfficialV1.generated.js app/catana/__tests__/duelFairBoardCatalog.test.js app/catana/__tests__/initialState.test.js app/catana/__tests__/Game.boardConfig.test.js server/bots/pufferStateAdapter.js ai/pufferlib/js/engine_host.cjs ai/pufferlib/js/settlexEnv.cjs ai/pufferlib/python/settlex_puffer/train.py ai/pufferlib/python/settlex_puffer/evaluate.py ai/pufferlib/python/settlex_puffer/eval_curve.py data/board-catalogs/duel-fair-official-v1.json
git commit -m "refactor: name official spiral board config"
```

---

### Task 2: Introduce Product Modes And Explicit Board Sources

**Files:**
- Create: `lib/shared/catanaGameModes.js`
- Create: `lib/shared/catanaGameModes.test.js`
- Create: `app/catana/gameSetup/boardSources.js`
- Create: `app/catana/__tests__/boardSources.test.js`
- Modify: `app/catana/gameSetup/initialState.js`
- Modify: `app/catana/__tests__/initialState.test.js`
- Modify: `app/catana/__tests__/Game.boardConfig.test.js`
- Modify: `lib/server/matches/gameModeSetupData.js`
- Modify: `lib/server/matches/friendChallenge.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Modify: `app/__tests__/api/challengeRoutes.test.js`
- Modify: `game-core/src/index.ts`
- Delete: `game-core/src/gameModes.ts`
- Delete: `game-core/src/gameModes.test.ts`
- Delete: `app/catana/gameSetup/duelFairBoardCatalog.js`
- Delete: `app/catana/__tests__/duelFairBoardCatalog.test.js`

**Interfaces:**
- Produces: `BOARD_SOURCE_IDS`, `GAME_MODES`, `resolveGameMode(id)`, `resolveDefaultGameModeId(numPlayers)` from `lib/shared/catanaGameModes.js`.
- Produces: `BOARD_SOURCES`, `resolveBoardSource(id)`, `materializeBoardSource({ boardSourceId, rng })`, and `materializeCustomBoard({ boardConfig, rng })` from `boardSources.js`.
- Produces in game state: `boardSourceId`, actual `boardConfigId`, and `boardProvenance`.

- [ ] **Step 1: Write the product-mode tests**

Create `lib/shared/catanaGameModes.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  BOARD_SOURCE_IDS,
  resolveDefaultGameModeId,
  resolveGameMode
} from "./catanaGameModes.js";

describe("Catana product modes", () => {
  it("maps duel to the fair catalog source", () => {
    expect(resolveGameMode("duel")).toEqual({
      id: "duel",
      numPlayers: 2,
      rulesetId: "duel",
      boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1
    });
  });

  it.each([
    [3, "standard-3p"],
    [4, "standard-4p"]
  ])("maps %i players to generated official spiral", (numPlayers, modeId) => {
    expect(resolveGameMode(modeId)).toMatchObject({
      numPlayers,
      rulesetId: "standard",
      boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1
    });
  });

  it.each([[2, "duel"], [3, "standard-3p"], [4, "standard-4p"]])(
    "resolves the default for %i players",
    (numPlayers, modeId) => {
      expect(resolveDefaultGameModeId(numPlayers)).toBe(modeId);
    }
  );

  it("rejects unknown modes", () => {
    expect(() => resolveGameMode("turbo")).toThrow("Unknown game mode: turbo");
  });
});
```

- [ ] **Step 2: Replace the catalog-helper tests with board-source tests**

Create `app/catana/__tests__/boardSources.test.js`:

```js
import { describe, expect, it } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import { BOARD_SOURCE_IDS } from "../../../lib/shared/catanaGameModes.js";
import { DUEL_FAIR_BOARD_CATALOG } from "../gameSetup/catalogs/duelFairOfficialV1.generated.js";
import {
  materializeBoardSource,
  materializeCustomBoard,
  resolveBoardSource
} from "../gameSetup/boardSources.js";

describe("Catana board sources", () => {
  it("materialises the first catalog entry at the lower boundary", () => {
    const result = materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
      rng: () => 0
    });

    expect(result.boardConfigId).toBe("standard-official-spiral");
    expect(result.boardProvenance).toEqual({
      sourceKind: "catalog",
      catalogId: "duel-fair-official-v1",
      catalogRank: 1,
      seed: DUEL_FAIR_BOARD_CATALOG.seeds[0],
      generatorFamily: "official-spiral",
      generatorVersion: "official-spiral-v1",
      evaluatorVersion: "duel-fair-v3",
      evaluatorIdentity: DUEL_FAIR_BOARD_CATALOG.evaluatorIdentity
    });
  });

  it("materialises the last catalog entry below the upper boundary", () => {
    const result = materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
      rng: () => 1 - Number.EPSILON
    });

    expect(result.boardProvenance).toMatchObject({
      catalogRank: DUEL_FAIR_BOARD_CATALOG.seeds.length,
      seed: DUEL_FAIR_BOARD_CATALOG.seeds.at(-1)
    });
  });

  it.each([-0.01, 1, Number.NaN])(
    "rejects invalid catalog random value %s",
    (randomValue) => {
      expect(() => materializeBoardSource({
        boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
        rng: () => randomValue
      })).toThrow("catalog random value");
    }
  );

  it("materialises generated official boards deterministically", () => {
    const generate = () => materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1,
      rng: makeDeterministicRng(42)
    });
    const first = generate();
    const second = generate();

    expect(first.tiles).toEqual(second.tiles);
    expect(first.boardConfigId).toBe("standard-official-spiral");
    expect(first.boardProvenance).toEqual({
      sourceKind: "generated",
      generatorFamily: "official-spiral",
      generatorVersion: "official-spiral-v1"
    });
  });

  it("rejects unknown sources", () => {
    expect(() => resolveBoardSource("missing-source")).toThrow(
      "Unknown board source: missing-source"
    );
  });

  it("materialises explicit custom configs without pretending they are catalogued", () => {
    const result = materializeCustomBoard({
      boardConfig: resolveBoardSource(
        BOARD_SOURCE_IDS.GENERATED_RANDOM_V1
      ).boardConfig,
      rng: makeDeterministicRng(9)
    });

    expect(result).toMatchObject({
      boardSourceId: "custom",
      boardConfigId: "custom",
      boardProvenance: { sourceKind: "custom" }
    });
  });
});
```

The source registry returned by `resolveBoardSource` must expose its resolved immutable `boardConfig` so the custom test does not duplicate config data.

- [ ] **Step 3: Update setup and API tests to demand source semantics**

Change the default duel assertions in `app/catana/__tests__/initialState.test.js` and `app/catana/__tests__/Game.boardConfig.test.js` to require:

```js
expect(G.boardSourceId).toBe("duel-fair-official-v1");
expect(G.boardConfigId).toBe("standard-official-spiral");
expect(G.boardProvenance).toMatchObject({
  sourceKind: "catalog",
  catalogId: "duel-fair-official-v1",
  catalogRank: 1,
  generatorVersion: "official-spiral-v1"
});
```

Replace the explicit random setup with:

```js
setupData: { boardSourceId: "generated-random-v1" }
```

and require:

```js
expect(G.boardSourceId).toBe("generated-random-v1");
expect(G.boardConfigId).toBe("standard-random");
expect(G.boardProvenance).toEqual({
  sourceKind: "generated",
  generatorFamily: "freeform-random",
  generatorVersion: "freeform-random-v1"
});
```

Add conflict and obsolete-input cases to `initialState.test.js`:

```js
expect(() => resolveModeSetup({
  numPlayers: 2,
  setupData: {
    boardSourceId: "generated-random-v1",
    boardConfig: { specId: "standard-4p" }
  }
})).toThrow("boardConfig and boardSourceId are mutually exclusive");

expect(() => resolveModeSetup({
  numPlayers: 2,
  setupData: { boardConfigId: "standard-random" }
})).toThrow("setupData.boardConfigId is not supported; use boardSourceId");
```

In `app/__tests__/api/matchRoutes.test.js` and `app/__tests__/api/challengeRoutes.test.js`, replace expected `boardConfigId: "standard-balanced"` with:

```js
boardSourceId: "duel-fair-official-v1"
```

- [ ] **Step 4: Run the new behavior tests and verify RED**

Run:

```bash
pnpm exec vitest run lib/shared/catanaGameModes.test.js app/catana/__tests__/boardSources.test.js app/catana/__tests__/initialState.test.js app/catana/__tests__/Game.boardConfig.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js --reporter=dot
```

Expected: FAIL because the shared registry and board-source materialiser do not exist and current setup still emits the provisional fields.

- [ ] **Step 5: Implement the shared product mode registry**

Create `lib/shared/catanaGameModes.js`:

```js
export const BOARD_SOURCE_IDS = Object.freeze({
  DUEL_FAIR_OFFICIAL_V1: "duel-fair-official-v1",
  GENERATED_OFFICIAL_SPIRAL_V1: "generated-official-spiral-v1",
  GENERATED_RANDOM_V1: "generated-random-v1"
});

export const GAME_MODES = Object.freeze({
  duel: Object.freeze({
    id: "duel",
    numPlayers: 2,
    rulesetId: "duel",
    boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1
  }),
  "standard-3p": Object.freeze({
    id: "standard-3p",
    numPlayers: 3,
    rulesetId: "standard",
    boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1
  }),
  "standard-4p": Object.freeze({
    id: "standard-4p",
    numPlayers: 4,
    rulesetId: "standard",
    boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1
  })
});

export const resolveGameMode = (id) => {
  const mode = GAME_MODES[id];
  if (!mode) throw new Error(`Unknown game mode: ${id}`);
  return mode;
};

export const resolveDefaultGameModeId = (numPlayers) => {
  if (numPlayers === 2) return "duel";
  if (numPlayers === 3) return "standard-3p";
  return "standard-4p";
};
```

- [ ] **Step 6: Implement the board-source registry and materialiser**

Create `app/catana/gameSetup/boardSources.js`:

```js
import {
  generateBoard,
  makeDeterministicRng,
  resolveBoardConfig
} from "@settlex/game-core";
import { BOARD_SOURCE_IDS } from "../../../lib/shared/catanaGameModes.js";
import { DUEL_FAIR_BOARD_CATALOG } from "./catalogs/duelFairOfficialV1.generated.js";

const createGeneratedSource = ({ id, boardConfigId, generatorFamily, generatorVersion }) =>
  Object.freeze({
    id,
    kind: "generated",
    boardConfigId,
    boardConfig: resolveBoardConfig(boardConfigId),
    generatorFamily,
    generatorVersion
  });

export const BOARD_SOURCES = Object.freeze({
  [BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1]: Object.freeze({
    id: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
    kind: "catalog",
    boardConfigId: DUEL_FAIR_BOARD_CATALOG.boardConfigId,
    boardConfig: resolveBoardConfig(DUEL_FAIR_BOARD_CATALOG.boardConfigId),
    catalog: DUEL_FAIR_BOARD_CATALOG
  }),
  [BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1]: createGeneratedSource({
    id: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1,
    boardConfigId: "standard-official-spiral",
    generatorFamily: "official-spiral",
    generatorVersion: "official-spiral-v1"
  }),
  [BOARD_SOURCE_IDS.GENERATED_RANDOM_V1]: createGeneratedSource({
    id: BOARD_SOURCE_IDS.GENERATED_RANDOM_V1,
    boardConfigId: "standard-random",
    generatorFamily: "freeform-random",
    generatorVersion: "freeform-random-v1"
  })
});

export const resolveBoardSource = (id) => {
  const source = BOARD_SOURCES[id];
  if (!source) throw new Error(`Unknown board source: ${id}`);
  return source;
};

const assertRng = (rng) => {
  if (typeof rng !== "function") throw new Error("rng must be a function");
};

const selectCatalogIndex = (randomValue, size) => {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error(
      "catalog random value must be finite from 0 up to, but not including, 1"
    );
  }
  return Math.floor(randomValue * size);
};

export const materializeBoardSource = ({ boardSourceId, rng }) => {
  assertRng(rng);
  const source = resolveBoardSource(boardSourceId);

  if (source.kind === "catalog") {
    const index = selectCatalogIndex(rng(), source.catalog.seeds.length);
    const seed = source.catalog.seeds[index];
    return {
      boardSourceId: source.id,
      boardConfigId: source.boardConfigId,
      boardProvenance: Object.freeze({
        sourceKind: "catalog",
        catalogId: source.catalog.id,
        catalogRank: index + 1,
        seed,
        generatorFamily: source.catalog.generatorFamily,
        generatorVersion: source.catalog.generatorVersion,
        evaluatorVersion: source.catalog.evaluatorVersion,
        evaluatorIdentity: source.catalog.evaluatorIdentity
      }),
      tiles: generateBoard(source.boardConfig, makeDeterministicRng(seed))
    };
  }

  return {
    boardSourceId: source.id,
    boardConfigId: source.boardConfigId,
    boardProvenance: Object.freeze({
      sourceKind: "generated",
      generatorFamily: source.generatorFamily,
      generatorVersion: source.generatorVersion
    }),
    tiles: generateBoard(source.boardConfig, rng)
  };
};

export const materializeCustomBoard = ({ boardConfig, rng }) => {
  assertRng(rng);
  if (boardConfig == null || typeof boardConfig !== "object") {
    throw new Error("boardConfig must be an object");
  }
  return {
    boardSourceId: "custom",
    boardConfigId: "custom",
    boardProvenance: Object.freeze({ sourceKind: "custom" }),
    tiles: generateBoard(boardConfig, rng)
  };
};
```

- [ ] **Step 7: Replace setup's implicit interception with source resolution**

In `app/catana/gameSetup/initialState.js`, import mode helpers from `lib/shared/catanaGameModes.js`, retain rules/topology imports from `@settlex/game-core`, and import both materialisers from `./boardSources.js`.

Replace `resolveModeSetup` with:

```js
export const resolveModeSetup = ({ numPlayers, setupData }) => {
  if (setupData?.boardConfigId != null) {
    throw new Error("setupData.boardConfigId is not supported; use boardSourceId");
  }
  if (setupData?.boardConfig != null && setupData?.boardSourceId != null) {
    throw new Error("boardConfig and boardSourceId are mutually exclusive");
  }

  const modeId = setupData?.modeId ?? resolveDefaultGameModeId(numPlayers);
  const mode = resolveGameMode(modeId);
  const rulesetId = setupData?.rulesetId ?? mode.rulesetId;
  return {
    modeId: mode.id,
    rulesetId,
    rulesetSpec: resolveRuleset(rulesetId),
    boardSourceId:
      setupData?.boardConfig != null
        ? "custom"
        : setupData?.boardSourceId ?? mode.boardSourceId
  };
};
```

After resolving mode settings in `createInitialGameState`, replace the catalog/config conditional with:

```js
const materializedBoard =
  setupData?.boardConfig != null
    ? materializeCustomBoard({ boardConfig: setupData.boardConfig, rng })
    : materializeBoardSource({ boardSourceId, rng });
const {
  boardSourceId: resolvedBoardSourceId,
  boardConfigId,
  boardProvenance,
  tiles
} = materializedBoard;
```

Return these exact state fields and remove `boardCatalog`:

```js
boardSourceId: resolvedBoardSourceId,
boardConfigId,
boardProvenance,
```

- [ ] **Step 8: Move server callers to the shared product mode registry**

In both `lib/server/matches/gameModeSetupData.js` and `lib/server/matches/friendChallenge.js`, import `resolveGameMode` from:

```js
import { resolveGameMode } from "../../shared/catanaGameModes.js";
```

Use this body in `resolveMatchCreationMode`:

```js
export const resolveMatchCreationMode = ({
  modeId,
  numPlayers,
  setupData
} = {}) => {
  const requestedModeId = modeId ?? setupData?.modeId;
  if (!requestedModeId) return { numPlayers, setupData };
  if (setupData?.boardConfig != null && setupData?.boardSourceId != null) {
    throw new Error("boardConfig and boardSourceId are mutually exclusive");
  }

  const mode = resolveGameMode(requestedModeId);
  const resolvedBoardSourceId =
    setupData?.boardConfig != null
      ? null
      : setupData?.boardSourceId ?? mode.boardSourceId;
  return {
    numPlayers: mode.numPlayers,
    setupData: {
      ...(setupData ?? {}),
      modeId: mode.id,
      rulesetId: setupData?.rulesetId ?? mode.rulesetId,
      ...(resolvedBoardSourceId == null
        ? {}
        : { boardSourceId: resolvedBoardSourceId })
    }
  };
};
```

In `buildFriendChallengeSetupData`, emit:

```js
boardSourceId: FRIEND_CHALLENGE_MODE.boardSourceId,
```

and remove `boardConfigId`.

- [ ] **Step 9: Remove superseded modules and engine exports**

Delete:

```text
game-core/src/gameModes.ts
game-core/src/gameModes.test.ts
app/catana/gameSetup/duelFairBoardCatalog.js
app/catana/__tests__/duelFairBoardCatalog.test.js
```

Remove this export from `game-core/src/index.ts`:

```ts
export * from "./gameModes";
```

- [ ] **Step 10: Run the source architecture tests and verify GREEN**

Run:

```bash
pnpm -C game-core build
pnpm exec vitest run lib/shared/catanaGameModes.test.js app/catana/__tests__/boardSources.test.js app/catana/__tests__/initialState.test.js app/catana/__tests__/Game.boardConfig.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js --reporter=dot
```

Expected: all listed tests pass and the core builds without exporting product modes.

- [ ] **Step 11: Commit explicit product board sources**

```bash
git add lib/shared/catanaGameModes.js lib/shared/catanaGameModes.test.js app/catana/gameSetup/boardSources.js app/catana/__tests__/boardSources.test.js app/catana/gameSetup/initialState.js app/catana/__tests__/initialState.test.js app/catana/__tests__/Game.boardConfig.test.js lib/server/matches/gameModeSetupData.js lib/server/matches/friendChallenge.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js game-core/src/index.ts game-core/src/gameModes.ts game-core/src/gameModes.test.ts app/catana/gameSetup/duelFairBoardCatalog.js app/catana/__tests__/duelFairBoardCatalog.test.js
git commit -m "refactor: add explicit Catana board sources"
```

---

### Task 3: Remove The Legacy Runtime Balanced Generator

**Files:**
- Create: `game-core/src/board/boardConfigs.test.ts`
- Modify: `game-core/src/board/boardConfigs.ts`
- Modify: `game-core/src/board/generateBoard.ts`
- Modify: `game-core/src/board/boardInvariants.test.ts`
- Modify: `game-core/src/index.ts`
- Modify: `game-core/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `app/catana/Game.js`
- Delete: `game-core/src/board/generateBalancedBoard.ts`
- Delete: `game-core/src/board/generateBoardClass.ts`

**Interfaces:**
- Produces: an engine board registry containing only `standard-official-spiral` and `standard-random`.
- Removes: balanced generation types, time-based selection, `BalancedBoard`, and its support `Board` class.

- [ ] **Step 1: Add a failing registry-boundary test**

Create `game-core/src/board/boardConfigs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BOARD_CONFIGS, resolveBoardConfig } from "./boardConfigs";

describe("board config registry", () => {
  it("contains only deterministic runtime configurations", () => {
    expect(Object.keys(BOARD_CONFIGS).sort()).toEqual([
      "standard-official-spiral",
      "standard-random"
    ]);
  });

  it("resolves the explicit official spiral configuration", () => {
    expect(resolveBoardConfig("standard-official-spiral")).toMatchObject({
      specId: "standard-4p",
      generation: {
        terrain: "random",
        numbers: "official",
        ports: "random"
      }
    });
  });
});
```

- [ ] **Step 2: Run the registry test and verify RED**

Run:

```bash
pnpm -C game-core exec vitest run src/board/boardConfigs.test.ts --reporter=dot
```

Expected: FAIL because `standard-balanced` remains in `BOARD_CONFIGS`.

- [ ] **Step 3: Remove balanced generation from board types and dispatch**

Change `BoardGenerationConfig` in `game-core/src/board/boardConfigs.ts` to:

```ts
export type BoardGenerationConfig = {
  terrain: "random" | "official";
  numbers: "random" | "official";
  ports: "random";
  options?: { official?: { startCorner?: "random" | "fixed" } };
};
```

Change `BoardConfigId` and `BOARD_CONFIGS` to contain only:

```ts
export type BoardConfigId =
  | "standard-official-spiral"
  | "standard-random";
```

Delete the `BalancedBoard` import and the complete `wantsBalanced` branch from `game-core/src/board/generateBoard.ts`. The remaining function must proceed directly from the resolved board spec into standard tile construction.

- [ ] **Step 4: Delete legacy code, exports, tests, and comments**

Delete:

```text
game-core/src/board/generateBalancedBoard.ts
game-core/src/board/generateBoardClass.ts
```

Remove these exports from `game-core/src/index.ts`:

```ts
export * from "./board/generateBoardClass";
export * from "./board/generateBalancedBoard";
```

Remove the two balanced diagnostics tests and their `vi`, `BalancedBoard`, and `balancedConfig` imports from `boardInvariants.test.ts`. Remove the obsolete commented `new BalancedBoard` block from `app/catana/Game.js`.

Remove the now-unused `lodash` and `react-hexgrid` dependencies from
`game-core/package.json`, then update only the workspace importer in the lockfile:

```bash
pnpm install --lockfile-only
```

Expected: the `game-core` importer in `pnpm-lock.yaml` no longer lists either dependency. The root application may retain its own `lodash` and `react-hexgrid` dependencies.

- [ ] **Step 5: Verify the engine and absence of the legacy runtime path**

Run:

```bash
pnpm -C game-core test
pnpm -C game-core build
if rg -n 'standard-balanced|BalancedBoard|generateBalancedBoard|generateBoardClass' app game-core/src lib server ai scripts; then exit 1; fi
```

Expected: all core tests pass, the core builds, and the reference sweep prints nothing.

- [ ] **Step 6: Commit the legacy generator removal**

```bash
git add game-core/src/board/boardConfigs.test.ts game-core/src/board/boardConfigs.ts game-core/src/board/generateBoard.ts game-core/src/board/boardInvariants.test.ts game-core/src/index.ts game-core/package.json pnpm-lock.yaml app/catana/Game.js game-core/src/board/generateBalancedBoard.ts game-core/src/board/generateBoardClass.ts
git commit -m "refactor: remove legacy balanced board generator"
```

---

### Task 4: Persist Resolved Board Provenance In Archives

**Files:**
- Create: `lib/server/db/sql/0005_archived_board_provenance.sql`
- Modify: `lib/server/__tests__/dbMigrations.test.js`
- Modify: `server/archive/archiveFinishedMatch.js`
- Modify: `server/__tests__/ArchiveManager.test.js`

**Interfaces:**
- Consumes: `liveRecord.initialState.G.rulesetId`, `boardSourceId`, `boardConfigId`, and `boardProvenance`.
- Produces: nullable `archived_matches.board_source_id` and `archived_matches.board_provenance_json`; truthful existing `board_config_id`.

- [ ] **Step 1: Write the failing migration assertion**

Extend the migration inventory test in `lib/server/__tests__/dbMigrations.test.js`:

```js
const fifthMigrationPath = path.join(
  sqlRoot,
  "0005_archived_board_provenance.sql"
);
expect(fs.existsSync(fifthMigrationPath)).toBe(true);
const fifthMigration = fs.readFileSync(fifthMigrationPath, "utf8").toLowerCase();
expect(fifthMigration).toContain("add column if not exists board_source_id text");
expect(fifthMigration).toContain(
  "add column if not exists board_provenance_json jsonb"
);
```

Update the existing recorded-migrations case so a database that already has
`0001` through `0003` applies both remaining migrations in order:

```js
expect(result.appliedMigrations).toEqual([
  "0004_better_auth_legacy_profile_reset.sql",
  "0005_archived_board_provenance.sql"
]);
expect(
  executed.some(({ params }) =>
    params?.includes("0005_archived_board_provenance.sql")
  )
).toBe(true);
```

- [ ] **Step 2: Update the archive fixture to demand resolved provenance**

In `server/__tests__/ArchiveManager.test.js`, change the fetched initial state fixture to:

```js
initialState: {
  G: {
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
      evaluatorVersion: "duel-fair-v3"
    }
  },
  ctx: { phase: "preGame" }
},
```

Extend the archived match assertion:

```js
expect(state.archivedMatches[0]).toMatchObject({
  rulesetId: "duel",
  boardSourceId: "duel-fair-official-v1",
  boardConfigId: "standard-official-spiral",
  boardProvenanceJson: {
    sourceKind: "catalog",
    catalogId: "duel-fair-official-v1",
    catalogRank: 37,
    seed: 12345
  }
});
```

Update the fake `insert into archived_matches` mapper to the final parameter order:

```js
const row = {
  id: params[0],
  bgioMatchId: params[1],
  replayId: params[2],
  gameName: params[3],
  rulesetId: params[4],
  boardSourceId: params[5],
  boardConfigId: params[6],
  boardProvenanceJson: parseJsonbParam(params[7]),
  startedAt: params[8],
  finishedAt: params[9],
  winnerAccountId: params[10],
  winnerSeatId: params[11],
  playerCount: params[12],
  summaryJson: parseJsonbParam(params[13])
};
```

- [ ] **Step 3: Run archive tests and verify RED**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js server/__tests__/ArchiveManager.test.js --reporter=dot
```

Expected: FAIL because migration 0005 does not exist and the archive insert lacks source/provenance parameters.

- [ ] **Step 4: Add the forward migration**

Create `lib/server/db/sql/0005_archived_board_provenance.sql`:

```sql
ALTER TABLE archived_matches
  ADD COLUMN IF NOT EXISTS board_source_id TEXT;

ALTER TABLE archived_matches
  ADD COLUMN IF NOT EXISTS board_provenance_json JSONB;
```

- [ ] **Step 5: Read actual identifiers from initial game state**

In `server/archive/archiveFinishedMatch.js`, after loading the live record, derive:

```js
const initialGameState = liveRecord.initialState?.G ?? {};
const resolvedRulesetId =
  initialGameState.rulesetId ?? liveRecord.metadata.setupData?.rulesetId ?? null;
const resolvedBoardSourceId = initialGameState.boardSourceId ?? null;
const resolvedBoardConfigId =
  initialGameState.boardConfigId ??
  liveRecord.metadata.setupData?.boardConfigId ??
  null;
const resolvedBoardProvenance = initialGameState.boardProvenance ?? null;
```

Change the archive insert column order to:

```sql
id,
bgio_match_id,
replay_id,
game_name,
ruleset_id,
board_source_id,
board_config_id,
board_provenance_json,
started_at,
finished_at,
winner_account_id,
winner_seat_id,
player_count,
summary_json
```

Use `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)` and pass:

```js
[
  archivedMatchId,
  matchID,
  replayId,
  liveRecord.metadata.gameName ?? "catan",
  resolvedRulesetId,
  resolvedBoardSourceId,
  resolvedBoardConfigId,
  toJsonbParam(resolvedBoardProvenance),
  startedAt,
  finishedAt,
  winnerParticipant?.accountId ?? null,
  winnerSeatId == null ? null : String(winnerSeatId),
  participantRows.length,
  toJsonbParam(summaryJson)
]
```

- [ ] **Step 6: Verify archive migration and persistence**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js server/__tests__/ArchiveManager.test.js --reporter=dot
```

Expected: both files pass, including duplicate-archive idempotency and rollback behavior.

- [ ] **Step 7: Commit archive provenance**

```bash
git add lib/server/db/sql/0005_archived_board_provenance.sql lib/server/__tests__/dbMigrations.test.js server/archive/archiveFinishedMatch.js server/__tests__/ArchiveManager.test.js
git commit -m "feat: archive board source provenance"
```

---

### Task 5: Remove Stale Guidance And Run The Release-Grade Verification Lane

**Files:**
- Modify: `docs/superpowers/specs/2026-07-14-duel-fair-live-catalog-design.md`
- Modify: `docs/superpowers/plans/2026-07-14-duel-fair-live-catalog.md`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Verify only: all changed runtime, catalog, archive, AI, and test files.

**Interfaces:**
- Consumes: completed explicit source implementation and fresh verification output.
- Produces: one current architecture note, historical documents marked as superseded where appropriate, and a clean verified branch ready for integration choice.

- [ ] **Step 1: Sweep runtime code for provisional terminology**

Run:

```bash
if rg -n 'standard-balanced|BalancedBoard|generateBalancedBoard|generateBoardClass|boardCatalog' app game-core/src lib server ai scripts; then exit 1; fi
if rg -n 'from "@settlex/game-core"' lib/server/matches app/catana/gameSetup | rg 'resolveGameMode|resolveDefaultGameModeId'; then exit 1; fi
```

Expected: both sweeps print nothing and exit 0.

- [ ] **Step 2: Mark historical runtime guidance as superseded**

Add this directly below the status in `docs/superpowers/specs/2026-07-14-duel-fair-live-catalog-design.md`:

```markdown
> Runtime setup and ownership in this document were superseded before launch by
> `2026-07-14-explicit-board-source-architecture-design.md`. Catalog corpus,
> publication, ranking, and integrity decisions remain authoritative.
```

Add this beneath the title in `docs/superpowers/plans/2026-07-14-duel-fair-live-catalog.md`:

```markdown
> Historical implementation plan. Its catalog publication tasks remain useful;
> its provisional `standard-balanced` runtime sentinel was replaced by the
> explicit board-source architecture before launch.
```

Replace the provisional live-catalog guidance at the top of `docs/agent/NOTES.md` with the implemented source model. It must state:

```markdown
- Explicit board-source implementation note:
- Default duel mode selects `duel-fair-official-v1`; standard 3p/4p select
  `generated-official-spiral-v1`.
- Both official sources construct tiles with `standard-official-spiral` and
  generator `official-spiral-v1`; fairness comes from catalog selection, not
  the generator configuration.
- `game-core` owns no mode or catalog policy. Product modes live in
  `lib/shared/catanaGameModes.js`; Catana materialises sources in
  `app/catana/gameSetup/boardSources.js`.
- Saved games use `boardSourceId`, truthful `boardConfigId`, and
  `boardProvenance`. Archives persist source and provenance separately.
```

- [ ] **Step 3: Run focused subsystem suites**

Run:

```bash
pnpm test:board-lab
pnpm test:catana
pnpm test:server
pnpm -C game-core test
pnpm -C game-core build
```

Expected: every command exits 0. Record exact fresh file/test counts in `docs/agent/PROGRESS.md`.

- [ ] **Step 4: Run repository verification and production build**

Invoke `superpowers:verification-before-completion`, then run:

```bash
pnpm verify
SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS=1 pnpm build
git diff --check
```

Expected: verification, build, and whitespace check exit 0. Do not claim the ordinary production build works without the documented placeholder environment variable.

- [ ] **Step 5: Record the completed implementation evidence**

Prepend a dated status to `docs/agent/PROGRESS.md` containing:

```markdown
## Status (2026-07-14, explicit board sources implemented)
- Replaced the provisional duel `standard-balanced` sentinel with explicit
  product-owned board sources and truthful generator provenance.
- Default duel remains `duel-fair-official-v1`; changing the shared mode preset
  to `generated-official-spiral-v1` switches it to direct generation without
  changing setup code.
- Removed the legacy elapsed-time-dependent balanced generator from runtime
  `game-core` and moved product game modes out of the engine.
- Added nullable archive source/provenance fields through migration 0005 and
  archive resolved initial-state values.
- Catalog seed/rank/score/hash entries remain unchanged; only explicit
  generator-configuration metadata changed.
```

Append the exact commands and pass counts observed in Steps 3 and 4. Do not copy historical counts.

- [ ] **Step 6: Commit documentation and verification evidence**

```bash
git add docs/superpowers/specs/2026-07-14-duel-fair-live-catalog-design.md docs/superpowers/plans/2026-07-14-duel-fair-live-catalog.md docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record explicit board source migration"
```

- [ ] **Step 7: Confirm the branch is clean and preserve the release boundary**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: the worktree is clean on `codex/duel-fair-board-lab`. Stop before merge, push, PR creation, or production deployment and offer the branch-integration choices.
