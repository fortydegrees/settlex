# City Upgrade Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make city upgrades show a static on-node highlight, hide the settlement while highlighted, and play the standard drop animation + sound when the city is placed.

**Architecture:** UI hover rendering stays in React (`Board`/`ActionNode`/`Piece`), while placement animation stays in the effects layer (`effects/placePiece.js`). Moves emit a `placePiece` effect for city upgrades, mapped to the same sound as settlement placement.

**Tech Stack:** React (Next.js), GSAP effects, bgio-effects, Howler, Vitest.

### Task 1: Add a failing test for city placePiece wiring

**Files:**
- Modify: `app/catana/__tests__/Moves.placePieceEffects.test.js`

**Step 1: Write the failing test**

```js
it("emits placePiece when placing city", () => {
  const effects = { placePiece: vi.fn(), distributeCardsFromTile: vi.fn() };
  const context = makeContext({ effects });
  context.G.core.buildingsByNodeId[0] = { ownerId: "0", type: "settlement" };

  placeCity.move(context, 0);

  expect(effects.placePiece).toHaveBeenCalledWith({
    pieceType: "city",
    id: 0,
    playerId: "0"
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C app/catana test Moves.placePieceEffects.test` (or the repo's preferred test command)
Expected: FAIL because `placeCity` does not emit `effects.placePiece` yet.

**Step 3: Commit**

```bash
git add app/catana/__tests__/Moves.placePieceEffects.test.js
git commit -m "test: expect placePiece effect for city upgrades"
```

### Task 2: Emit placePiece for city upgrades

**Files:**
- Modify: `app/catana/Moves.js`

**Step 1: Write minimal implementation**

```js
    effects?.placePiece?.({
      pieceType: "city",
      id: nodeId,
      playerId: playerID
    });
```

**Step 2: Run test to verify it passes**

Run: `pnpm -C app/catana test Moves.placePieceEffects.test`
Expected: PASS.

**Step 3: Commit**

```bash
git add app/catana/Moves.js
git commit -m "feat: emit placePiece effect for city upgrades"
```

### Task 3: Support city in placement animation + sound cues

**Files:**
- Modify: `app/catana/effects/placePiece.js`
- Modify: `app/catana/effects/soundThemes.js`
- Modify: `app/catana/dev/effects/registry.js`
- Modify: `app/catana/__tests__/effects/placePieceWiring.test.js`
- Modify: `app/catana/__tests__/effects/EffectsLabAudioOverride.test.js`

**Step 1: Write failing tests**

```js
expect(source).toContain("build:city");
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C app/catana test effects/placePieceWiring.test effects/EffectsLabAudioOverride.test`
Expected: FAIL because build:city is not wired yet.

**Step 3: Implement city animation support**

```js
function createCityEl({ size, x, y, color }) {
  const el = document.createElement("div");
  // same as settlement, but city svg
}

if (payload.pieceType === "city") {
  // reuse settlement animation sequence with createCityEl
  // emitCue("build:city")
}
```

**Step 4: Map audio cue**

```js
"build:city": { src: "/sounds/settle.mp3", volume: 0.6 }
```

**Step 5: Add cue to Effects Lab registry**

```js
cues: ["build:settlement", "build:road", "build:city"]
```

**Step 6: Run tests to verify they pass**

Run: `pnpm -C app/catana test effects/placePieceWiring.test effects/EffectsLabAudioOverride.test`
Expected: PASS.

**Step 7: Commit**

```bash
git add app/catana/effects/placePiece.js app/catana/effects/soundThemes.js app/catana/dev/effects/registry.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/effects/EffectsLabAudioOverride.test.js
git commit -m "feat: add city placement animation and cue"
```

### Task 4: Update hover highlight + hide settlement on upgrade

**Files:**
- Modify: `app/catana/Board.js`
- Modify: `app/catana/ActionNode.js`
- Modify: `app/catana/Piece.js`
- Modify: `app/catana/Board.css`

**Step 1: Write the failing test (if applicable)**

If there are existing UI/unit tests for hover behavior, add a failing expectation for settlement visibility. If no UI tests exist, skip to implementation and note manual verification steps.

**Step 2: Implement highlight + hide behavior**

```js
// Board.js
const [pendingCityNodeId, setPendingCityNodeId] = useState(null);
const isCityHover = playerAction === "placeCity" && hoveredNode === nodeId;
const isCityPending = pendingCityNodeId === nodeId;

// skip rendering settlement when isCityHover || isCityPending
```

```js
// ActionNode.js
<Piece
  buildingSVG={`/svgs/${buildingType}_${buildingColor}.svg`}
  size={size * 0.8}
  left={x}
  top={y}
  highlight={buildingType === "city"}
/>
```

```css
/* Board.css */
.piece-flash {
  animation: pieceFlash 0.6s ease-in-out infinite;
}

@keyframes pieceFlash {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}
```

**Step 3: Manual verification**

Run: `pnpm dev`
- Hover a buildable city node: settlement hidden, static city highlight flashes on-node.
- Click to confirm: settlement disappears instantly, city drop animation plays, sound triggers once.

**Step 4: Commit**

```bash
git add app/catana/Board.js app/catana/ActionNode.js app/catana/Piece.js app/catana/Board.css
git commit -m "feat: improve city upgrade hover + placement UX"
```

### Task 5: Update agent notes

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add brief entries**

- PROGRESS: “Improved city upgrade hover/placement animation + sound.”
- NOTES: mention pendingCityNodeId guard + city placement cue addition.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: log city upgrade animation changes"
```

### Task 6: Final verification

**Step 1: Run full verify**

Run: `pnpm verify`
Expected: same lint warnings as baseline; no new failures.

**Step 2: Summarize changes for PR**

- Hover highlight now static + hides settlement on upgrade nodes.
- City placement uses existing drop animation and settlement sound.
- Added tests for placePiece city wiring and effect/audio cues.

