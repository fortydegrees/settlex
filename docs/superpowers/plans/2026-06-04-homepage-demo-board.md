# Homepage Demo Board Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dev homepage table as a proper curated demo board with a four-colour legal-ish attract loop, demo-owned committed piece state, and existing GSAP/audio placement effects.

**Architecture:** Add a focused `app/catana/homeDemo/` module that owns preset data, event sequencing, committed demo piece state, board-only rendering, and effect bridging. Keep the shared game effects unchanged: placement effects animate temporary DOM, while the demo state owns the lasting road/settlement/city pieces. Wire the dev `/catana/dev/home-table` ready-table variant to this module and verify visually before any production homepage promotion.

**Tech Stack:** React/Next.js App Router, Catana board renderer primitives, `GameEffects`, `createEffectBus`, `createPiecePlacementRunner`, GSAP/Howler through existing effect stack, Vitest for pure helper/source guard tests, browser screenshots for visual QA.

---

## File Structure

Create:

- `app/catana/homeDemo/homeDemoPreset.js` — curated static board preset.
- `app/catana/homeDemo/homeDemoSequence.js` — authored event list, tunable config, pure state transition helpers.
- `app/catana/homeDemo/HomeDemoPieceLayer.js` — committed roads/settlements/cities rendered from demo state.
- `app/catana/homeDemo/HomeDemoBoard.js` — board-only visual surface plus placement layers.
- `app/catana/homeDemo/HomeDemoEffectBridge.js` — timer loop, semi-random event delays, effect emission, and commit handoff.
- `app/catana/__tests__/homeDemoSequence.test.js` — pure sequencing/state tests.
- `app/catana/__tests__/HomeDemoBoard.source.test.js` — source guard tests for dev route wiring and no sandbox-game dependency.

Modify:

- `app/catana/dev/home-table/HomeTablePrototypeClient.js` — replace the ready-table boardgame.io sandbox board path with `HomeDemoBoard` and `HomeDemoEffectBridge`; keep current prototype shell/CTA components.
- `app/catana/dev/home-table/HomeTableAttractLoop.js` — delete after replacement, or leave unused only if a later comparison path explicitly needs it.
- `docs/agent/PROGRESS.md` — record implementation and verification.
- `docs/agent/NOTES.md` — record the durable implementation boundary.

Do not modify:

- `app/catana/effects/placePiece.js`
- `app/catana/effects/GameEffects.js`
- `app/catana/Board.js`
- production `app/catana/lobby/LobbyPageClient.js` in this pass

## Task 1: Sequence Helpers And Demo State

**Files:**
- Create: `app/catana/homeDemo/homeDemoSequence.js`
- Create: `app/catana/__tests__/homeDemoSequence.test.js`

- [ ] **Step 1: Write the failing helper tests**

Create `app/catana/__tests__/homeDemoSequence.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  HOME_DEMO_EVENTS,
  HOME_DEMO_PLAYERS,
  applyHomeDemoEvent,
  createHomeDemoPieceState,
  getHomeDemoReducedMotionPieceState,
  getHomeDemoVisiblePlayerIds,
  sampleHomeDemoDelay
} from "../homeDemo/homeDemoSequence";

describe("home demo sequence", () => {
  it("uses four authored demo players", () => {
    expect(HOME_DEMO_PLAYERS.map((player) => player.id)).toEqual([
      "home-blue",
      "home-red",
      "home-green",
      "home-orange"
    ]);
    expect(getHomeDemoVisiblePlayerIds(HOME_DEMO_EVENTS)).toEqual([
      "home-blue",
      "home-red",
      "home-green",
      "home-orange"
    ]);
  });

  it("commits roads, settlements, and city upgrades into demo state", () => {
    let state = createHomeDemoPieceState();
    state = applyHomeDemoEvent(state, {
      id: "blue-road-1",
      type: "place-road",
      playerId: "home-blue",
      target: { edgeId: "29,32" }
    });
    state = applyHomeDemoEvent(state, {
      id: "blue-settlement-1",
      type: "place-settlement",
      playerId: "home-blue",
      target: { nodeId: 32 }
    });
    state = applyHomeDemoEvent(state, {
      id: "blue-city-1",
      type: "place-city",
      playerId: "home-blue",
      target: { nodeId: 32 }
    });

    expect(state.roadsByEdgeId["29,32"]).toEqual({
      edgeId: "29,32",
      playerId: "home-blue"
    });
    expect(state.buildingsByNodeId[32]).toEqual({
      nodeId: 32,
      playerId: "home-blue",
      type: "city"
    });
  });

  it("samples delay inside the configured range", () => {
    const delay = sampleHomeDemoDelay([800, 1400], () => 0.25);
    expect(delay).toBe(950);
  });

  it("provides a stable reduced-motion board state", () => {
    const state = getHomeDemoReducedMotionPieceState();
    expect(Object.keys(state.roadsByEdgeId).length).toBeGreaterThan(0);
    expect(Object.keys(state.buildingsByNodeId).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoSequence.test.js
```

Expected: FAIL because `app/catana/homeDemo/homeDemoSequence.js` does not exist.

- [ ] **Step 3: Implement sequence helpers**

Create `app/catana/homeDemo/homeDemoSequence.js`:

```js
export const HOME_DEMO_PLAYERS = Object.freeze([
  { id: "home-blue", color: "royal" },
  { id: "home-red", color: "red" },
  { id: "home-green", color: "green" },
  { id: "home-orange", color: "orange" }
]);

export const HOME_DEMO_PLAYER_COLORS = Object.freeze(
  Object.fromEntries(HOME_DEMO_PLAYERS.map((player) => [player.id, player.color]))
);

export const HOME_DEMO_CONFIG = Object.freeze({
  playerCount: 4,
  maxCommittedPieces: 8,
  resetHoldMs: 2600,
  commitLeadMs: 90,
  sequenceMode: "authored",
  allowHeroCityDrop: true
});

export const HOME_DEMO_EVENTS = Object.freeze([
  {
    id: "blue-road-1",
    type: "place-road",
    playerId: "home-blue",
    target: { edgeId: "29,32" },
    delayMs: [700, 1100]
  },
  {
    id: "blue-settlement-1",
    type: "place-settlement",
    playerId: "home-blue",
    target: { nodeId: 32 },
    delayMs: [900, 1400]
  },
  {
    id: "red-road-1",
    type: "place-road",
    playerId: "home-red",
    target: { edgeId: "20,31" },
    delayMs: [1000, 1500]
  },
  {
    id: "red-settlement-1",
    type: "place-settlement",
    playerId: "home-red",
    target: { nodeId: 31 },
    delayMs: [900, 1400]
  },
  {
    id: "green-road-1",
    type: "place-road",
    playerId: "home-green",
    target: { edgeId: "10,20" },
    delayMs: [1000, 1600]
  },
  {
    id: "green-settlement-1",
    type: "place-settlement",
    playerId: "home-green",
    target: { nodeId: 20 },
    delayMs: [900, 1400]
  },
  {
    id: "orange-road-1",
    type: "place-road",
    playerId: "home-orange",
    target: { edgeId: "37,38" },
    delayMs: [1000, 1600]
  },
  {
    id: "orange-city-1",
    type: "place-city",
    playerId: "home-orange",
    target: { nodeId: 38 },
    delayMs: [1200, 1800]
  }
]);

export function createHomeDemoPieceState() {
  return {
    roadsByEdgeId: {},
    buildingsByNodeId: {}
  };
}

export function getHomeDemoVisiblePlayerIds(events = HOME_DEMO_EVENTS) {
  return Array.from(new Set(events.map((event) => event.playerId)));
}

export function sampleHomeDemoDelay([min, max], random = Math.random) {
  return Math.round(min + (max - min) * random());
}

export function applyHomeDemoEvent(state, event) {
  if (!event) return state;

  if (event.type === "place-road") {
    const edgeId = event.target?.edgeId;
    if (!edgeId) return state;
    return {
      ...state,
      roadsByEdgeId: {
        ...state.roadsByEdgeId,
        [edgeId]: { edgeId, playerId: event.playerId }
      }
    };
  }

  const nodeId = event.target?.nodeId;
  if (nodeId == null) return state;

  const type = event.type === "place-city" ? "city" : "settlement";
  return {
    ...state,
    buildingsByNodeId: {
      ...state.buildingsByNodeId,
      [nodeId]: { nodeId, playerId: event.playerId, type }
    }
  };
}

export function getHomeDemoReducedMotionPieceState() {
  return HOME_DEMO_EVENTS.reduce(applyHomeDemoEvent, createHomeDemoPieceState());
}
```

The concrete node/edge ids above are first-pass targets. During implementation, verify they exist in the curated preset with `buildRenderMaps`; if any target reads badly or is missing, choose nearby valid ids and update the tests.

- [ ] **Step 4: Run helper test to verify it passes**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoSequence.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Only if the worktree is clean enough to commit this slice safely:

```bash
git add app/catana/homeDemo/homeDemoSequence.js app/catana/__tests__/homeDemoSequence.test.js
git commit -m "feat: add homepage demo board sequence"
```

If unrelated dirty files are present, skip the commit and continue with exact staging later.

## Task 2: Curated Board Preset

**Files:**
- Create: `app/catana/homeDemo/homeDemoPreset.js`
- Modify: `app/catana/__tests__/homeDemoSequence.test.js`

- [ ] **Step 1: Add failing preset assertions**

Add these imports at the top of `app/catana/__tests__/homeDemoSequence.test.js`:

```js
import { HOME_DEMO_BOARD_PRESET } from "../homeDemo/homeDemoPreset";
import { buildRenderMaps } from "../utils/renderMaps";
```

Then add these tests inside the existing `describe("home demo sequence", ...)` block:

```js
it("uses a curated board preset with no pre-existing demo pieces", () => {
  expect(HOME_DEMO_BOARD_PRESET.tiles.length).toBeGreaterThan(0);
  expect(HOME_DEMO_BOARD_PRESET.initialPieces).toEqual({
    roadsByEdgeId: {},
    buildingsByNodeId: {}
  });
});

it("all authored event targets exist on the curated board", () => {
  const renderMaps = buildRenderMaps(HOME_DEMO_BOARD_PRESET.tiles);

  HOME_DEMO_EVENTS.forEach((event) => {
    if ("edgeId" in event.target) {
      expect(renderMaps.edgeRenderById[event.target.edgeId]).toBeTruthy();
    } else {
      expect(renderMaps.nodeRenderById[String(event.target.nodeId)]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoSequence.test.js
```

Expected: FAIL because `homeDemoPreset.js` does not exist.

- [ ] **Step 3: Implement curated preset**

Create `app/catana/homeDemo/homeDemoPreset.js`:

```js
import scenario from "../scenarios/new_dev_game.json";

const scenarioState = scenario.G;

export const HOME_DEMO_BOARD_PRESET = Object.freeze({
  id: "homepage-demo-standard",
  tiles: scenarioState.tiles,
  coreTopology: scenarioState.coreTopology,
  robberTileId: scenarioState.core?.robberTileId ?? null,
  initialPieces: Object.freeze({
    roadsByEdgeId: Object.freeze({}),
    buildingsByNodeId: Object.freeze({})
  })
});
```

This imports static data only. It must not expose `scenarioState.core.buildingsByNodeId` or `scenarioState.core.roadsByEdgeId`.

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoSequence.test.js
```

Expected: PASS. If target ids fail, inspect `buildRenderMaps(HOME_DEMO_BOARD_PRESET.tiles)` and update `HOME_DEMO_EVENTS` to valid, visually pleasing ids.

- [ ] **Step 5: Commit**

```bash
git add app/catana/homeDemo/homeDemoPreset.js app/catana/homeDemo/homeDemoSequence.js app/catana/__tests__/homeDemoSequence.test.js
git commit -m "feat: add homepage demo board preset"
```

Skip if the worktree cannot be committed safely yet.

## Task 3: Committed Piece Layer

**Files:**
- Create: `app/catana/homeDemo/HomeDemoPieceLayer.js`
- Create: `app/catana/__tests__/HomeDemoBoard.source.test.js`

- [ ] **Step 1: Write source guard test for canonical piece layer**

Create `app/catana/__tests__/HomeDemoBoard.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readAppFile = (...parts) =>
  fs.readFileSync(path.resolve(__dirname, "..", ...parts), "utf8");

describe("Home demo board source", () => {
  it("has a committed piece layer for demo-owned final state", () => {
    const source = readAppFile("homeDemo", "HomeDemoPieceLayer.js");
    expect(source).toContain("export function HomeDemoPieceLayer");
    expect(source).toContain("roadsByEdgeId");
    expect(source).toContain("buildingsByNodeId");
    expect(source).toContain("<Edge");
    expect(source).toContain("<Node");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: FAIL because `HomeDemoPieceLayer.js` does not exist.

- [ ] **Step 3: Implement committed piece layer**

Create `app/catana/homeDemo/HomeDemoPieceLayer.js`:

```js
import React from "react";
import { Edge } from "../Edge";
import { Node } from "../Node";

export function HomeDemoPieceLayer({
  pieceState,
  renderMaps,
  playerColorMap,
  center,
  size,
  themeId
}) {
  const roads = Object.values(pieceState?.roadsByEdgeId ?? {}).map((road) => {
    const renderEdge = renderMaps.edgeRenderById[road.edgeId];
    const color = playerColorMap[road.playerId];
    if (!renderEdge || !color) return null;

    return (
      <Edge
        key={`demo-road-${road.edgeId}`}
        id={`demo-road-${road.edgeId}`}
        center={center}
        size={size}
        coordinate={renderEdge.tile_coordinate}
        direction={renderEdge.direction}
        color={color}
        themeId={themeId}
      />
    );
  });

  const buildings = Object.values(pieceState?.buildingsByNodeId ?? {}).map(
    (building) => {
      const renderNode = renderMaps.nodeRenderById[String(building.nodeId)];
      const color = playerColorMap[building.playerId];
      if (!renderNode || !color) return null;

      return (
        <Node
          key={`demo-building-${building.nodeId}`}
          nodeId={building.nodeId}
          tileId={renderNode.tileId}
          center={center}
          size={size}
          coordinate={renderNode.tile_coordinate}
          direction={renderNode.direction}
          buildingType={building.type}
          buildingColor={color}
          themeId={themeId}
        />
      );
    }
  );

  return (
    <div
      aria-hidden="true"
      data-testid="home-demo-piece-layer"
      className="pointer-events-none absolute inset-0 z-20"
    >
      {roads}
      {buildings}
    </div>
  );
}
```

- [ ] **Step 4: Run source guard test**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/catana/homeDemo/HomeDemoPieceLayer.js app/catana/__tests__/HomeDemoBoard.source.test.js
git commit -m "feat: render homepage demo pieces"
```

Skip if exact staging is not safe yet.

## Task 4: Board-Only Demo Surface

**Files:**
- Create: `app/catana/homeDemo/HomeDemoBoard.js`
- Modify: `app/catana/__tests__/HomeDemoBoard.source.test.js`

- [ ] **Step 1: Add failing source guard for board-only rendering**

Append to `HomeDemoBoard.source.test.js`:

```js
it("renders a board-only home demo surface without game moves", () => {
  const source = readAppFile("homeDemo", "HomeDemoBoard.js");
  expect(source).toContain("export function HomeDemoBoard");
  expect(source).toContain("<BoardUnderlay");
  expect(source).toContain("<BoardPortChannels");
  expect(source).toContain("<Tile");
  expect(source).toContain("<Port");
  expect(source).toContain("<HomeDemoPieceLayer");
  expect(source).not.toContain("moves.");
  expect(source).not.toContain("EffectsBoardWrapper");
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: FAIL because `HomeDemoBoard.js` does not exist.

- [ ] **Step 3: Implement board-only renderer**

Create `app/catana/homeDemo/HomeDemoBoard.js`.

Implementation outline:

```js
"use client";

import React, { useMemo, useRef } from "react";
import { BoardPortChannels } from "../BoardPortChannels";
import { BoardUnderlay } from "../BoardUnderlay";
import { Port } from "../Port";
import { Tile } from "../Tile";
import { TileTypes } from "../types";
import { DEFAULT_THEME_ID } from "../theme/themes";
import { getBoardLayout } from "../utils/boardLayout";
import { buildRenderMaps } from "../utils/renderMaps";
import useWindowSize from "../utils/useWindowSize";
import { HOME_DEMO_BOARD_PRESET } from "./homeDemoPreset";
import { HOME_DEMO_PLAYER_COLORS } from "./homeDemoSequence";
import { HomeDemoPieceLayer } from "./HomeDemoPieceLayer";

export function HomeDemoBoard({
  pieceState,
  reservedHeight,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  themeId = DEFAULT_THEME_ID
}) {
  const fallbackBoardRef = useRef(null);
  const { width, height } = useWindowSize();
  const layout = useMemo(
    () =>
      getBoardLayout({
        width,
        height,
        reservedUiHeight: reservedHeight
      }),
    [height, reservedHeight, width]
  );
  const renderMaps = useMemo(
    () => buildRenderMaps(HOME_DEMO_BOARD_PRESET.tiles),
    []
  );
  const { center, size, containerWidth, containerHeight } = layout;

  const setBoardRefs = (node) => {
    fallbackBoardRef.current = node;
    if (!boardRef) return;
    if (typeof boardRef === "function") boardRef(node);
    else boardRef.current = node;
  };

  if (!width || !height || !size) return null;

  return (
    <div ref={setBoardRefs} data-testid="home-demo-board">
      <div className="relative h-screen w-screen">
        <BoardUnderlay center={center} size={size} themeId={themeId} />
        <BoardPortChannels
          tiles={HOME_DEMO_BOARD_PRESET.tiles}
          center={center}
          size={size}
          width={containerWidth}
          height={containerHeight}
        />
        {HOME_DEMO_BOARD_PRESET.tiles.map(({ coordinate, type, tile }) => {
          if (type === TileTypes.LAND) {
            return (
              <Tile
                key={tile.id}
                id={tile.id}
                absolute
                coordinate={coordinate}
                size={size}
                resource={tile.resource}
                number={tile.number}
                boardCenter={center}
                hoveredTiles={[]}
                isFlashing={false}
                isBlockedFlashing={false}
                hasRobber={tile.id === HOME_DEMO_BOARD_PRESET.robberTileId}
                canPlaceRobber={false}
                moves={{}}
                themeId={themeId}
              />
            );
          }
          if (type === TileTypes.PORT) {
            return (
              <Port
                key={tile.id}
                boardCenter={center}
                size={size}
                coordinate={coordinate}
                tile={tile}
                themeId={themeId}
              />
            );
          }
          return null;
        })}
        <div ref={placementRoadLayerRef} className="absolute inset-0 pointer-events-none z-0" />
        <div ref={placementLayerRef} className="absolute inset-0 pointer-events-none z-30" />
        <HomeDemoPieceLayer
          pieceState={pieceState}
          renderMaps={renderMaps}
          playerColorMap={HOME_DEMO_PLAYER_COLORS}
          center={center}
          size={size}
          themeId={themeId}
        />
      </div>
    </div>
  );
}
```

After implementation, confirm port markers and port channel bars both render. `BoardPortChannels` draws channel bars; `Port` draws the markers; `Tile` should only render land tiles in this board-only surface.

- [ ] **Step 4: Run source guard**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/catana/homeDemo/HomeDemoBoard.js app/catana/__tests__/HomeDemoBoard.source.test.js
git commit -m "feat: add homepage demo board surface"
```

Skip if exact staging is not safe yet.

## Task 5: Effect Bridge And Attract Loop

**Files:**
- Create: `app/catana/homeDemo/HomeDemoEffectBridge.js`
- Modify: `app/catana/__tests__/HomeDemoBoard.source.test.js`

- [ ] **Step 1: Add failing source guard for effect bridge**

Append to `HomeDemoBoard.source.test.js`:

```js
it("bridges homepage demo events through the existing placement effect stack", () => {
  const source = readAppFile("homeDemo", "HomeDemoEffectBridge.js");
  expect(source).toContain("export function HomeDemoEffectBridge");
  expect(source).toContain("createPiecePlacementRunner");
  expect(source).toContain("GameEffects");
  expect(source).toContain("build:place");
  expect(source).toContain("applyHomeDemoEvent");
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: FAIL because `HomeDemoEffectBridge.js` does not exist.

- [ ] **Step 3: Implement effect bridge**

Create `app/catana/homeDemo/HomeDemoEffectBridge.js`.

Implementation outline:

```js
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GameEffects } from "../effects/GameEffects";
import { createPiecePlacementRunner } from "../effects/placePiece";
import { PLACE_PIECE_DEFAULT_TUNING, getPlacementEffectDuration } from "../effects/placePieceDefaults";
import { DEFAULT_THEME_ID } from "../theme/themes";
import { getBoardLayout } from "../utils/boardLayout";
import useWindowSize from "../utils/useWindowSize";
import { HOME_DEMO_BOARD_PRESET } from "./homeDemoPreset";
import {
  HOME_DEMO_CONFIG,
  HOME_DEMO_EVENTS,
  HOME_DEMO_PLAYER_COLORS,
  applyHomeDemoEvent,
  createHomeDemoPieceState,
  getHomeDemoReducedMotionPieceState,
  sampleHomeDemoDelay
} from "./homeDemoSequence";

const placementDurationMs = Math.ceil(
  getPlacementEffectDuration(PLACE_PIECE_DEFAULT_TUNING) * 1000
);

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reducedMotion;
}

function getPayloadForEvent(event) {
  return {
    pieceType:
      event.type === "place-road"
        ? "road"
        : event.type === "place-city"
          ? "city"
          : "settlement",
    id: "edgeId" in event.target ? event.target.edgeId : event.target.nodeId,
    playerId: event.playerId
  };
}

export function HomeDemoEffectBridge({
  effectsBus,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  reservedHeight,
  onPieceStateChange,
  themeId = DEFAULT_THEME_ID
}) {
  const { width, height } = useWindowSize();
  const reducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);
  const cycleIndexRef = useRef(0);

  const effects = useMemo(
    () => ({
      piecePlacement: ({ emitCue }) => {
        const runner = createPiecePlacementRunner({
          getLayerEl: (payload) =>
            payload?.pieceType === "road"
              ? placementRoadLayerRef.current
              : placementLayerRef.current,
          getLayout: () => {
            if (!width || !height) return null;
            return getBoardLayout({ width, height, reservedUiHeight: reservedHeight });
          },
          getTiles: () => HOME_DEMO_BOARD_PRESET.tiles,
          getPlayerColor: (playerId) => HOME_DEMO_PLAYER_COLORS[playerId] ?? "red",
          getViewerPlayerId: () => "home-blue",
          emitCue,
          useBoardSpace: true,
          themeId
        });
        return (event) => runner(event?.payload);
      }
    }),
    [height, placementLayerRef, placementRoadLayerRef, reservedHeight, themeId, width]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      onPieceStateChange(getHomeDemoReducedMotionPieceState());
      return undefined;
    }
    if (!effectsBus) return undefined;

    let cancelled = false;
    const timers = [];

    const queueTimeout = (fn, delayMs) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delayMs);
      timers.push(id);
    };

    const runCycle = () => {
      let elapsed = 0;
      const cycleIndex = cycleIndexRef.current;
      cycleIndexRef.current += 1;
      onPieceStateChange(createHomeDemoPieceState());

      HOME_DEMO_EVENTS.forEach((event) => {
        elapsed += sampleHomeDemoDelay(event.delayMs);
        queueTimeout(() => {
          effectsBus.emit({
            type: "build:place",
            effectId: `home-demo:${cycleIndex}:${event.id}`,
            payload: getPayloadForEvent(event)
          });
        }, elapsed);

        queueTimeout(() => {
          onPieceStateChange((current) => applyHomeDemoEvent(current, event));
        }, elapsed + Math.max(0, placementDurationMs - HOME_DEMO_CONFIG.commitLeadMs));
      });

      queueTimeout(runCycle, elapsed + placementDurationMs + HOME_DEMO_CONFIG.resetHoldMs);
    };

    runCycle();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [effectsBus, onPieceStateChange, reducedMotion]);

  if (!isMounted) return null;

  return (
    <GameEffects
      effectsBus={effectsBus}
      boardRef={boardRef}
      effects={effects}
      currentPlayerId={null}
      playerID="home-blue"
      phase={null}
    />
  );
}
```

- [ ] **Step 4: Run source guard**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/catana/homeDemo/HomeDemoEffectBridge.js app/catana/__tests__/HomeDemoBoard.source.test.js
git commit -m "feat: add homepage demo effect bridge"
```

Skip if exact staging is not safe yet.

## Task 6: Wire Dev Home Table Ready Variant

**Files:**
- Modify: `app/catana/dev/home-table/HomeTablePrototypeClient.js`
- Delete or leave unused: `app/catana/dev/home-table/HomeTableAttractLoop.js`
- Modify: `app/catana/__tests__/HomeDemoBoard.source.test.js`

- [ ] **Step 1: Add failing source guard for dev route wiring**

Append to `HomeDemoBoard.source.test.js`:

```js
it("wires the dev home table route to the demo board without sandbox game state", () => {
  const source = readAppFile("dev", "home-table", "HomeTablePrototypeClient.js");
  expect(source).toContain("HomeDemoBoard");
  expect(source).toContain("HomeDemoEffectBridge");
  expect(source).not.toContain("boardgame.io/react");
  expect(source).not.toContain("EffectsBoardWrapper");
  expect(source).not.toContain("createSandboxGame");
  expect(source).not.toContain("new_dev_game.json");
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: FAIL because the prototype still imports boardgame.io/sandbox wiring.

- [ ] **Step 3: Refactor `HomeTablePrototypeClient.js` imports**

Remove these imports if no longer needed:

```js
import { Client } from "boardgame.io/react";
import { EffectsBoardWrapper } from "bgio-effects/react";
import { MemoizedCatanBoard } from "../../Board";
import { GameEffects } from "../../effects/GameEffects";
import { createPiecePlacementRunner } from "../../effects/placePiece";
import { getBoardLayout } from "../../utils/boardLayout";
import { createSandboxGame } from "../sandbox/createSandboxGame";
import { HomeTableAttractLoop } from "./HomeTableAttractLoop";
import devScenario from "../../scenarios/new_dev_game.json";
```

Keep:

```js
import { createEffectBus } from "../../effects/EffectBus";
import { HomeDemoBoard } from "../../homeDemo/HomeDemoBoard";
import { HomeDemoEffectBridge } from "../../homeDemo/HomeDemoEffectBridge";
import { createHomeDemoPieceState } from "../../homeDemo/homeDemoSequence";
```

Delete `HOME_TABLE_PRESET` and sandbox-specific `HOME_PLAYER_COLORS` if unused. Keep `HOME_ATTRACT_PLAYER_COLORS` only if another variant still needs it; otherwise remove.

- [ ] **Step 4: Refactor ready/hybrid full board layer**

Replace `FullBoardLayer` with a version that renders `HomeDemoBoard`:

```js
function FullBoardLayer({
  pieceState,
  reservedHeight,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  className = ""
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-0 ${className}`}>
      <HomeDemoBoard
        pieceState={pieceState}
        reservedHeight={reservedHeight}
        boardRef={boardRef}
        placementLayerRef={placementLayerRef}
        placementRoadLayerRef={placementRoadLayerRef}
      />
    </div>
  );
}
```

Update `ReadyTableVariant` and `HybridVariant` props from `bgioProps`/`boardProps` to `pieceState`.

- [ ] **Step 5: Replace boardgame.io wrapper component**

Replace `HomeTableBoard(bgioProps)` and `HomeTablePrototypeClient` with a plain React component:

```js
function HomeTableBoard() {
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth > 0 && viewportWidth < 760;
  const [variantId, setVariantId] = usePrototypeVariant();
  const [matchmakingState, setMatchmakingState] = useState(null);
  const [pieceState, setPieceState] = useState(() => createHomeDemoPieceState());
  const boardRef = useRef(null);
  const placementLayerRef = useRef(null);
  const placementRoadLayerRef = useRef(null);
  const effectsBus = useMemo(() => createEffectBus(), []);
  const activeBoardReservedHeight =
    variantId === "hybrid"
      ? isCompact
        ? 276
        : 212
      : isCompact
        ? 276
        : 158;

  return (
    <main className="fixed inset-0 overflow-hidden text-slate-900" style={{ background: HOME_TABLE_BACKGROUND }}>
      <PrototypeSwitcher activeVariantId={variantId} onSelectVariant={setVariantId} />
      {/* existing variant switch, passing pieceState to board variants */}
      <HomeDemoEffectBridge
        effectsBus={effectsBus}
        boardRef={boardRef}
        placementLayerRef={placementLayerRef}
        placementRoadLayerRef={placementRoadLayerRef}
        reservedHeight={activeBoardReservedHeight}
        onPieceStateChange={setPieceState}
      />
      <PrototypeModal matchmakingState={matchmakingState} onClose={() => setMatchmakingState(null)} />
    </main>
  );
}

export function HomeTablePrototypeClient() {
  return <HomeTableBoard />;
}
```

Preserve the existing `PrototypeSwitcher`, `HomeTableBrand`, `StatusPills`, `TableFeed`, `BotReadinessCard`, `ActionDock`, `ThreeIslandsVariant`, `HybridVariant`, and modal behaviour unless needed for the new props.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: PASS.

- [ ] **Step 7: Run lint on touched files**

Run:

```bash
pnpm exec eslint app/catana/homeDemo/*.js app/catana/dev/home-table/HomeTablePrototypeClient.js app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: exit 0. Existing `<img>` warnings in `HomeTablePrototypeClient.js` are acceptable only if unchanged and warnings-only.

- [ ] **Step 8: Commit**

```bash
git add app/catana/homeDemo app/catana/dev/home-table/HomeTablePrototypeClient.js app/catana/dev/home-table/HomeTableAttractLoop.js app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js
git commit -m "feat: wire homepage demo board prototype"
```

If deleting `HomeTableAttractLoop.js`, include the deletion. If keeping it unused for comparison, add a note in `docs/agent/NOTES.md` explaining why.

## Task 7: Browser Verification And Tuning

**Files:**
- Modify as needed: `app/catana/homeDemo/homeDemoSequence.js`
- Modify as needed: `app/catana/dev/home-table/HomeTablePrototypeClient.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Start or reuse dev server**

Check whether port 3000 is already serving the app:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

If not running:

```bash
pnpm dev
```

- [ ] **Step 2: Open dev route**

Open:

```text
http://localhost:3000/catana/dev/home-table?variant=ready
```

- [ ] **Step 3: Verify no duplicate scenario pieces**

In the browser, watch a full loop. Acceptance:

- four colours appear during the loop,
- no pre-existing settlement/road appears behind an animated drop,
- city replaces/commits cleanly,
- committed pieces persist until intentional reset,
- reset reads deliberate.

If placement targets look cramped or awkward, tune only `HOME_DEMO_EVENTS` target ids and `delayMs` ranges first.

- [ ] **Step 4: Save desktop screenshot**

Save screenshot to:

```text
output/playwright/home-demo-board-desktop.png
```

- [ ] **Step 5: Verify mobile viewport**

Check a mobile viewport around `390x844`. Acceptance:

- CTAs remain readable,
- board remains framed,
- no text overlaps controls,
- loop does not fight the title-screen layout.

Save screenshot to:

```text
output/playwright/home-demo-board-mobile.png
```

- [ ] **Step 6: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce` in browser tooling. Acceptance:

- no timed loop runs,
- stable demo pieces render,
- CTAs remain readable.

- [ ] **Step 7: Verify console cleanliness**

Check current-page console warnings/errors. Acceptance:

- no new errors,
- no repeated listener/timer warnings from the demo loop.

- [ ] **Step 8: Run focused checks after tuning**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js
pnpm exec eslint app/catana/homeDemo/*.js app/catana/dev/home-table/HomeTablePrototypeClient.js app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js
git diff --check -- app/catana/homeDemo app/catana/dev/home-table docs/agent/PROGRESS.md docs/agent/NOTES.md
```

Expected: tests pass, eslint exits 0 or warnings-only for pre-existing `<img>` usage, diff check exits 0.

- [ ] **Step 9: Update docs**

Update `docs/agent/PROGRESS.md` with:

- implementation summary,
- test commands,
- screenshot paths,
- console/reduced-motion status.

Update `docs/agent/NOTES.md` with:

- any durable target-id/timing lessons,
- whether `HomeTableAttractLoop.js` was removed or retained.

- [ ] **Step 10: Commit**

```bash
git add app/catana/homeDemo app/catana/dev/home-table app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md output/playwright/home-demo-board-desktop.png output/playwright/home-demo-board-mobile.png
git commit -m "feat: stabilize homepage demo board loop"
```

Do not commit screenshots if this repo normally keeps `output/playwright/` untracked. In that case, list screenshot paths in the final response instead.

## Task 8: Production Promotion Decision

**Files:**
- No code changes by default.

- [ ] **Step 1: Review dev route result with the user**

Show the verified local route and screenshots.

- [ ] **Step 2: Decide whether to promote**

If the user approves the dev route, write a follow-up plan for production homepage integration. That plan should separately cover:

- moving the demo shell into `app/catana/lobby/LobbyPageClient.js` or a new imported homepage surface,
- preserving real matchmaking, bot, and friend challenge flows,
- preserving identity/account behaviour,
- release badge placement,
- production browser verification at `http://localhost:3000`.

Do not promote to production homepage in this first implementation pass unless the user explicitly asks to include promotion.
