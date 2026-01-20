# Piece Placement Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a drop + dust-ring placement animation and shared sound for settlement/road placement using the existing effects system.

**Architecture:** Moves emit a `placePiece` effect; `GameEffects` forwards it to the EffectBus as `build:place`. A GSAP runner renders overlay DOM in `EffectLayer` at the correct board position, plays a short drop/impact animation, spawns a dust ring, and emits a shared `build:place` cue. Audio mapping uses `/sounds/settle_place.mp3`.

**Tech Stack:** React, bgio-effects, GSAP, Howler.

---

### Task 1: Register the placement effect in the effects registry (TDD)

**Files:**
- Modify: `app/catana/effects/registry.js`
- Test: `app/catana/__tests__/effects/registry.test.js`

**Step 1: Write the failing test**

```js
it("registers piece placement handler", () => {
  const unsubscribe = vi.fn();
  const bus = { on: vi.fn(() => unsubscribe) };
  const handler = vi.fn();

  const cleanup = registerEffects({
    bus,
    effects: { piecePlacement: handler }
  });

  expect(bus.on).toHaveBeenCalledWith("build:place", handler);
  cleanup();
  expect(unsubscribe).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/effects/registry.test.js`
Expected: FAIL with missing `build:place` registration.

**Step 3: Write minimal implementation**

```js
if (effects.piecePlacement) {
  unsubscribes.push(bus.on("build:place", effects.piecePlacement));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/effects/registry.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/effects/registry.js app/catana/__tests__/effects/registry.test.js
git commit -m "test: register placement effect"
```

---

### Task 2: Emit `placePiece` from moves (TDD)

**Files:**
- Modify: `app/catana/Moves.js`
- Test: `app/catana/__tests__/Moves.placePieceEffects.test.js`

**Step 1: Write the failing test**

```js
import { describe, expect, it, vi } from "vitest";
import { placeSettlement, placeRoad } from "../Moves";
import { applyPlaceSettlement, applyPlaceRoad } from "@settlex/game-core";

vi.mock("@settlex/game-core", async () => {
  const actual = await vi.importActual("@settlex/game-core");
  return {
    ...actual,
    applyPlaceSettlement: vi.fn(() => ({ ok: true, distributions: [] })),
    applyBuildSettlement: vi.fn(() => ({ ok: true })),
    applyPlaceRoad: vi.fn(() => ({ ok: true })),
    applyBuildRoad: vi.fn(() => ({ ok: true }))
  };
});

const baseContext = () => ({
  G: { core: { phase: "placement" }, coreTopology: {}, tiles: [], valids: { nodes: [], edges: [] } },
  ctx: { phase: "placement", currentPlayer: "0" },
  playerID: "0",
  events: { setStage: vi.fn(), endTurn: vi.fn() },
  effects: { placePiece: vi.fn(), distributeCardsFromTile: vi.fn() },
  log: { setMetadata: vi.fn() }
});

it("emits placePiece when placing settlement", () => {
  const context = baseContext();
  placeSettlement.move(context, 5);
  expect(context.effects.placePiece).toHaveBeenCalledWith({
    pieceType: "settlement",
    id: 5,
    playerId: "0",
    initialPlacement: true
  });
});

it("emits placePiece when placing road", () => {
  const context = baseContext();
  placeRoad.move(context, "1,2");
  expect(context.effects.placePiece).toHaveBeenCalledWith({
    pieceType: "road",
    id: "1,2",
    playerId: "0",
    initialPlacement: true
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/Moves.placePieceEffects.test.js`
Expected: FAIL (no `effects.placePiece` calls)

**Step 3: Write minimal implementation**

In `placeSettlement.move` and `placeRoad.move` add:

```js
effects?.placePiece?.({
  pieceType: "settlement", // or "road"
  id: nodeIdOrEdgeId,
  playerId: playerID,
  initialPlacement: isPlacement
});
```

(Optionally also wire `autoPlaceSettlement`, `autoPlaceRoad`, and `placeRoadFromDevCard` to keep all road/settlement placements animated.)

**Step 4: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/Moves.placePieceEffects.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/Moves.js app/catana/__tests__/Moves.placePieceEffects.test.js
git commit -m "test: emit placePiece effect on placement"
```

---

### Task 3: Implement GSAP placement runner + wire GameEffects/GameScreen

**Files:**
- Create: `app/catana/effects/placePiece.js`
- Modify: `app/catana/Game.js`
- Modify: `app/catana/effects/GameEffects.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/effects/soundThemes.js`

**Step 1: Write the failing test**

_No new unit test required here (pure DOM + GSAP). Proceed with small, incremental implementation and manual verification in dev UI._

**Step 2: Add effect config + bus forwarding**

- In `Game.js`, add `placePiece` to the effects plugin with duration `0.7`.
- In `GameEffects.js`, add:

```js
useEffectListener(
  "placePiece",
  (payload) => {
    if (!payload) return;
    bus.emit({
      type: "build:place",
      payload,
      effectId: `build:${payload.pieceType}:${payload.id}`
    });
  },
  [bus]
);
```

**Step 3: Create placement runner**

Create `app/catana/effects/placePiece.js` that exports `createPiecePlacementRunner`.

Key behavior:
- Use `buildRenderMaps(G.tiles)` and `getBoardLayout({ width, height })` to resolve node/edge coords.
- Convert to absolute screen coords via `tilePixelVector` + `getNodeDelta` / `getEdgeDelta` and add board rect offset.
- Create overlay piece element (absolute, background image from `/svgs/${pieceType}_${color}.svg`).
- Create dust ring element (radial gradient, absolute centered).
- Run GSAP timeline:
  - set piece at `y = -dropDistance` and scale `1.05`
  - drop to `y = 0` with `power2.in`
  - tiny overshoot + settle, scale squish `1 -> 0.92 -> 1`
  - dust ring scales `0.2 -> 1.1` and fades to 0
  - emit cue `build:place` at impact
- Remove DOM nodes on complete.
- Bail out if `document.hidden`, or missing layout/render data.

**Step 4: Wire runner in GameScreen**

Add `piecePlacement` to `effects` useMemo in `GameScreen.js`:

```js
piecePlacement: ({ layerRef, emitCue }) => {
  const runner = createPiecePlacementRunner({
    getLayerEl: () => layerRef.current,
    getLayout: () => (width && height ? getBoardLayout({ width, height }) : null),
    getBoardRect: () => boardRef?.current?.getBoundingClientRect() ?? new DOMRect(),
    getTiles: () => bgioProps.G?.tiles ?? [],
    getPlayerColor: (playerId) => buildPlayerViewMap(bgioProps.G?.core)[playerId]?.color,
    emitCue
  });
  return (event) => runner(event?.payload);
}
```

(Ensure `createPiecePlacementRunner` and `buildPlayerViewMap` are imported and `bgioProps.G` is included in dependencies.)

**Step 5: Wire sound theme**

In `soundThemes.js` add:

```js
"build:place": { src: "/sounds/settle_place.mp3", volume: 0.6 }
```

**Step 6: Manual verification**

Run: `pnpm dev`
Expected: placing a settlement or road shows a short drop + dust ring animation and plays the new sound.

**Step 7: Commit**

```bash
git add app/catana/effects/placePiece.js app/catana/Game.js app/catana/effects/GameEffects.js app/catana/GameScreen.js app/catana/effects/soundThemes.js
git commit -m "feat: animate piece placement"
```

---

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add progress + notes**

Add a short entry noting the placement animation + shared sound mapping and the new runner file.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note placement animation"
```
