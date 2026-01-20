# Piece Placement Animation Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix placement flicker, road misalignment, and layering so placement animation matches board z-order and timing.

**Architecture:** Keep GSAP runner but move placement layer into the board DOM so z-index matches roads/settlements; compute effect duration from shared tuning defaults; animate a road wrapper (translation) while keeping the rotated inner road transform intact.

**Tech Stack:** React/Next, GSAP, bgio-effects, Vitest (node).

### Task 1: Align placePiece duration with shared defaults

**Files:**
- Create: `app/catana/__tests__/effects/placePieceWiring.test.js`
- Modify: `app/catana/Game.js`
- Modify: `app/catana/effects/placePiece.js`
- Modify: `app/catana/dev/effects/PiecePlacementLab.jsx`

**Step 1: Write the failing test**

```javascript
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("placePiece wiring", () => {
  it("uses shared defaults to compute effect duration", () => {
    const source = read("../../Game.js");
    expect(source).toContain("getPlacementEffectDuration");
    expect(source).toContain("PLACE_PIECE_DEFAULT_TUNING");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/effects/placePieceWiring.test.js`

Expected: FAIL (Game.js does not reference shared duration helpers).

**Step 3: Write minimal implementation**

```javascript
// app/catana/Game.js (add import)
import {
  PLACE_PIECE_DEFAULT_TUNING,
  getPlacementEffectDuration
} from "./effects/placePieceDefaults";

// ...inside EffectsPlugin config
placePiece: {
  create: (value) => value,
  duration: getPlacementEffectDuration(PLACE_PIECE_DEFAULT_TUNING)
}
```

```javascript
// app/catana/effects/placePiece.js
import { PLACE_PIECE_DEFAULT_TUNING } from "./placePieceDefaults";
// replace DEFAULT_TUNING usage with PLACE_PIECE_DEFAULT_TUNING
const tuning = { ...PLACE_PIECE_DEFAULT_TUNING, ...(payload?.tuning ?? {}) };
```

```javascript
// app/catana/dev/effects/PiecePlacementLab.jsx
import { PLACE_PIECE_DEFAULT_TUNING } from "../../effects/placePieceDefaults";
const [tuning, setTuning] = useState(PLACE_PIECE_DEFAULT_TUNING);
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/effects/placePieceWiring.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/__tests__/effects/placePieceWiring.test.js app/catana/Game.js app/catana/effects/placePiece.js app/catana/dev/effects/PiecePlacementLab.jsx
git commit -m "fix: align placePiece duration with shared defaults"
```

### Task 2: Add board placement layer for correct z-order + alignment

**Files:**
- Modify: `app/catana/__tests__/effects/placePieceWiring.test.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/effects/placePiece.js`

**Step 1: Write the failing test**

```javascript
it("uses a board placement layer for placement effects", () => {
  const screen = read("../../GameScreen.js");
  const board = read("../../Board.js");
  expect(screen).toContain("placementLayerRef");
  expect(board).toContain("placementLayerRef");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/effects/placePieceWiring.test.js`

Expected: FAIL (placementLayerRef not present).

**Step 3: Write minimal implementation**

```javascript
// app/catana/Board.js (add prop + layer)
export function CatanBoard({ ..., boardRef, placementLayerRef }) {
  // ...
  return (
    <div ref={setBoardRefs}>
      <div className="relative h-screen w-screen">
        {tiles}
        <div
          ref={placementLayerRef}
          className="absolute inset-0 pointer-events-none"
        />
        {buildings}
        {actions}
      </div>
    </div>
  );
}
```

```javascript
// app/catana/GameScreen.js (create + pass ref, use in effect)
const placementLayerRef = useRef(null);

<CatanBoard
  boardRef={boardRef}
  placementLayerRef={placementLayerRef}
  playerAction={playerAction}
  setPlayerAction={setPlayerAction}
  {...bgioProps}
/>

const runner = createPiecePlacementRunner({
  getLayerEl: () => placementLayerRef.current,
  getLayout: () => getBoardLayout({ width, height }),
  getBoardRect: () => boardRef?.current?.getBoundingClientRect() ?? new DOMRect(),
  getTiles: () => bgioProps.G?.tiles ?? [],
  getPlayerColor: (playerId) => playerViewMap[playerId]?.color,
  emitCue,
  useBoardSpace: true
});
```

```javascript
// app/catana/effects/placePiece.js (support board space)
export function createPiecePlacementRunner({ ..., useBoardSpace = false } = {}) {
  // ...
  const scale = useBoardSpace ? 1 : containerWidth ? boardRect.width / containerWidth : 1;
  const offsetLeft = useBoardSpace ? 0 : boardRect.left;
  const offsetTop = useBoardSpace ? 0 : boardRect.top;
  // then use offsetLeft/offsetTop instead of boardRect.left/top
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/effects/placePieceWiring.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/__tests__/effects/placePieceWiring.test.js app/catana/Board.js app/catana/GameScreen.js app/catana/effects/placePiece.js
git commit -m "fix: attach placement layer to board"
```

### Task 3: Fix road drop transform by animating wrapper

**Files:**
- Modify: `app/catana/__tests__/effects/placePieceWiring.test.js`
- Modify: `app/catana/effects/placePiece.js`

**Step 1: Write the failing test**

```javascript
it("wraps animated road so drop translates wrapper, not rotated element", () => {
  const source = read("../../effects/placePiece.js");
  expect(source).toContain("createRoadWrapper");
  expect(source).toContain("roadInnerEl");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/effects/placePieceWiring.test.js`

Expected: FAIL (wrapper helpers not present).

**Step 3: Write minimal implementation**

```javascript
function createRoadWrapper({ size, x, y }) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.pointerEvents = "none";
  return el;
}

function createRoadInner({ size, transform, color }) {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size * 0.2}px`;
  el.style.transform = transform;
  el.style.backgroundImage = `url('/svgs/road_${color}.svg')`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundSize = "contain";
  return el;
}

// usage in road branch
const roadWrapperEl = createRoadWrapper({ size: roadSize, x, y });
const roadInnerEl = createRoadInner({ size: roadSize, transform, color });
roadWrapperEl.appendChild(roadInnerEl);
layerEl.appendChild(roadWrapperEl);
gsap.set(roadWrapperEl, { y: -dropPx, scale: 1.03, opacity: 0 });
// ...animate roadWrapperEl, not roadInnerEl
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/effects/placePieceWiring.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/__tests__/effects/placePieceWiring.test.js app/catana/effects/placePiece.js
git commit -m "fix: animate road wrapper to preserve rotation"
```

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add entries**

Note the three fixes and the new placement layer/road wrapper details.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note placement animation fixes"
```
