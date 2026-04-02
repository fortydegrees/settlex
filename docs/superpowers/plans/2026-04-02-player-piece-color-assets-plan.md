# Player Piece Color Assets Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Catana player piece SVGs into `public/svgs/pieces/`, add all missing lobby-colour variants for roads / settlements / cities, and wire board rendering, placement effects, and shared asset maps to use the selected player colour instead of the old mixed path + fallback setup.

**Architecture:** Add one shared piece-asset helper that builds nested `pieces/<piece>_<color>.svg` filenames and direct `/svgs/pieces/...` URLs. Feed the chosen lobby colour through `GameScreen` into the board/player-view path so previews, placed pieces, and placement effects resolve the same colour consistently. Migrate the six existing red/blue assets into the new folder, add the eighteen missing colour variants by palette-translation only, and lock the result with path tests, asset-existence tests, and SVG validation.

**Tech Stack:** Next.js, React, boardgame.io, Vitest, static SVG assets, `xmllint`

---

## File Map

**Shared helper + colour plumbing**
- Create: `app/catana/theme/pieceAssets.js`
- Create: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/utils/playerView.js`
- Modify: `app/catana/__tests__/playerView.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`

**Runtime consumers**
- Modify: `app/catana/Node.js`
- Modify: `app/catana/Edge.js`
- Modify: `app/catana/effects/placePiece.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/types.js`
- Modify: `app/board-editor/utils/types.js`

**Theme / asset tests**
- Modify: `app/catana/__tests__/themeAssets.test.js`

**Road assets**
- Move: `public/svgs/road_red.svg` -> `public/svgs/pieces/road_red.svg`
- Move: `public/svgs/road_blue.svg` -> `public/svgs/pieces/road_blue.svg`
- Create: `public/svgs/pieces/road_green.svg`
- Create: `public/svgs/pieces/road_orange.svg`
- Create: `public/svgs/pieces/road_purple.svg`
- Create: `public/svgs/pieces/road_pink.svg`
- Create: `public/svgs/pieces/road_cyan.svg`
- Create: `public/svgs/pieces/road_amber.svg`

**Settlement assets**
- Move: `public/svgs/settlement_red.svg` -> `public/svgs/pieces/settlement_red.svg`
- Move: `public/svgs/settlement_blue.svg` -> `public/svgs/pieces/settlement_blue.svg`
- Create: `public/svgs/pieces/settlement_green.svg`
- Create: `public/svgs/pieces/settlement_orange.svg`
- Create: `public/svgs/pieces/settlement_purple.svg`
- Create: `public/svgs/pieces/settlement_pink.svg`
- Create: `public/svgs/pieces/settlement_cyan.svg`
- Create: `public/svgs/pieces/settlement_amber.svg`

**City assets**
- Move: `public/svgs/city_red.svg` -> `public/svgs/pieces/city_red.svg`
- Move: `public/svgs/city_blue.svg` -> `public/svgs/pieces/city_blue.svg`
- Create: `public/svgs/pieces/city_green.svg`
- Create: `public/svgs/pieces/city_orange.svg`
- Create: `public/svgs/pieces/city_purple.svg`
- Create: `public/svgs/pieces/city_pink.svg`
- Create: `public/svgs/pieces/city_cyan.svg`
- Create: `public/svgs/pieces/city_amber.svg`

**Docs**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- Keep the lobby colour IDs exactly as they are now: `red`, `blue`, `green`, `orange`, `purple`, `pink`, `cyan`, `amber`.
- Do not expand `game-core` `PlayerColor` or `PLAYER_COLORS` in this slice; chosen lobby colours stay UI metadata, not authoritative core types.
- Do not add theme-specific alternate piece families in this slice.
- Do not make build-action dock icons dynamic per-player in this slice; only move them to the new `pieces/` asset location.
- Tasks 3, 4, and 5 are safe to execute in parallel because they touch disjoint SVG file sets under `public/svgs/pieces/`.

### Task 1: Lock the piece-path and chosen-colour contracts with failing tests

**Files:**
- Create: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/__tests__/playerView.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`

- [ ] **Step 1: Write the failing piece asset helper tests**

Add a new test file that locks the helper contract before any implementation exists:

```js
import { describe, expect, it } from "vitest";
import { getPieceSvgFile, getPieceSvgPath } from "../theme/pieceAssets";

describe("pieceAssets", () => {
  it("builds nested piece filenames", () => {
    expect(getPieceSvgFile("road", "cyan")).toBe("pieces/road_cyan.svg");
    expect(getPieceSvgFile("city", "Amber")).toBe("pieces/city_amber.svg");
  });

  it("builds public svg paths", () => {
    expect(getPieceSvgPath("settlement", "purple")).toBe(
      "/svgs/pieces/settlement_purple.svg"
    );
  });
});
```

- [ ] **Step 2: Extend `playerView` tests to cover chosen-colour overrides**

Add a failing test that proves `buildPlayerViewMap(...)` can take a per-player colour override map:

```js
it("prefers provided player color metadata over seat fallback colors", () => {
  const core = { players: ["0", "1"], playerStateById: { "0": {}, "1": {} } };
  const view = buildPlayerViewMap(core, { "0": "purple", "1": "pink" });
  expect(view["0"].color).toBe("purple");
  expect(view["1"].color).toBe("pink");
});
```

- [ ] **Step 3: Tighten the existing render-perf source test around the new memoized colour map**

Update `app/catana/__tests__/renderPerfGuards.test.js` so it expects:
- `GameScreen` memoizes a board colour map and passes it into `buildPlayerViewMap(core, boardColorMap)`
- `Board` consumes `playerColorMap` rather than rebuilding colours from seat order only

- [ ] **Step 4: Run the failing contract tests**

Run: `pnpm exec vitest run app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/renderPerfGuards.test.js`

Expected:
- `pieceAssets.test.js` fails because `pieceAssets.js` does not exist
- `playerView.test.js` fails because `buildPlayerViewMap` ignores explicit colour overrides
- `renderPerfGuards.test.js` fails because `GameScreen` and `Board` still use the older seat-order colour flow

### Task 2: Implement the shared helper and wire runtime consumers to chosen player colours

**Files:**
- Create: `app/catana/theme/pieceAssets.js`
- Modify: `app/catana/utils/playerView.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/Node.js`
- Modify: `app/catana/Edge.js`
- Modify: `app/catana/effects/placePiece.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/types.js`
- Modify: `app/board-editor/utils/types.js`
- Modify: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/__tests__/playerView.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`

- [ ] **Step 5: Implement `pieceAssets.js`**

Add a focused helper module that owns piece filename normalization:

```js
const PIECE_FOLDER = "pieces";
const DEFAULT_PIECE_COLOR = "red";

const normalizePieceColor = (colorId) =>
  String(colorId ?? DEFAULT_PIECE_COLOR).trim().toLowerCase() || DEFAULT_PIECE_COLOR;

export function getPieceSvgFile(pieceType, colorId) {
  return `${PIECE_FOLDER}/${pieceType}_${normalizePieceColor(colorId)}.svg`;
}

export function getPieceSvgPath(pieceType, colorId) {
  return `/svgs/${getPieceSvgFile(pieceType, colorId)}`;
}
```

Keep the helper intentionally small:
- nested filename builder for theme-aware callers
- direct public path builder for callers that need a concrete URL

- [ ] **Step 6: Update shared `PIECE_SVGS(...)` maps to local Catana assets**

In both:
- `app/catana/types.js`
- `app/board-editor/utils/types.js`

replace the Colonist-hosted URLs with helper-backed local URLs:

```js
import { getPieceSvgPath } from "./theme/pieceAssets";

export const PIECE_SVGS = (playerColor) => ({
  Settlement: getPieceSvgPath("settlement", playerColor),
  City: getPieceSvgPath("city", playerColor),
  Road: getPieceSvgPath("road", playerColor),
});
```

Adjust the board-editor import path relative to its folder.

- [ ] **Step 7: Teach `buildPlayerViewMap(...)` to accept colour overrides**

In `app/catana/utils/playerView.js`, change the signature to:

```js
export function buildPlayerViewMap(core, colorByPlayerId = {}) {
  // color: colorByPlayerId[id] ?? UI_PLAYER_COLORS[index % UI_PLAYER_COLORS.length]
}
```

Keep `UI_PLAYER_COLORS` as the fallback seat-order palette only. Do not remove it; it still matters when lobby colour metadata is absent.

- [ ] **Step 8: Build one resolved board colour map in `GameScreen`**

In `app/catana/GameScreen.js`:
- derive `boardColorMap` from `colorMap[id] ?? seatColorMap[id] ?? "red"`
- use `buildPlayerViewMap(core, boardColorMap)` instead of `buildPlayerViewMap(core)`
- pass `playerColorMap={boardColorMap}` into `<CatanBoard />`
- keep `logPlayerMap` using the same resolved colour precedence
- update the placement-effect runner to read from the resolved board colours instead of the old seat fallback:

```js
getPlayerColor: (playerId) => boardColorMap[playerId] ?? "red"
```

- [ ] **Step 9: Use the shared resolved colour map inside `Board`**

Update `app/catana/Board.js` to accept `playerColorMap` and use:

```js
const playerViewMap = useMemo(
  () => buildPlayerViewMap(G.core, playerColorMap),
  [G.core, playerColorMap]
);
```

This is the critical board-plumbing change that makes:
- placed roads
- placed settlements
- placed cities
- placement previews

use the selected lobby colour instead of the old four-colour seat fallback.

- [ ] **Step 10: Replace raw filename assembly in the Catana runtime consumers**

Update these files to use `getPieceSvgFile(...)` instead of hand-building root-level filenames:
- `app/catana/Node.js`
- `app/catana/Edge.js`
- `app/catana/effects/placePiece.js`
- `app/catana/components/PlayerActionContainer.js`

Pattern:

```js
const buildingFile = getPieceSvgFile(buildingType, buildingColor);
const roadFile = getPieceSvgFile("road", color);
```

Keep them routing through the existing theme helpers:
- `getThemedSvgPath(themeId, fileName)`
- `getClassicSvgPath(fileName)`
- `getBackgroundImageWithFallback(themeId, fileName)`

- [ ] **Step 11: Re-run the runtime contract tests**

Run: `pnpm exec vitest run app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/renderPerfGuards.test.js`

Expected: PASS

- [ ] **Step 12: Commit the helper + runtime wiring**

```bash
git add app/catana/theme/pieceAssets.js app/catana/__tests__/pieceAssets.test.js app/catana/utils/playerView.js app/catana/__tests__/playerView.test.js app/catana/GameScreen.js app/catana/Board.js app/catana/Node.js app/catana/Edge.js app/catana/effects/placePiece.js app/catana/components/PlayerActionContainer.js app/catana/types.js app/board-editor/utils/types.js app/catana/__tests__/renderPerfGuards.test.js
git commit -m "feat: route player pieces through local color assets"
```

### Task 3: Migrate and expand the road SVG family

**Files:**
- Move: `public/svgs/road_red.svg` -> `public/svgs/pieces/road_red.svg`
- Move: `public/svgs/road_blue.svg` -> `public/svgs/pieces/road_blue.svg`
- Create: `public/svgs/pieces/road_green.svg`
- Create: `public/svgs/pieces/road_orange.svg`
- Create: `public/svgs/pieces/road_purple.svg`
- Create: `public/svgs/pieces/road_pink.svg`
- Create: `public/svgs/pieces/road_cyan.svg`
- Create: `public/svgs/pieces/road_amber.svg`

- [ ] **Step 13: Move the live red / blue road assets into the new folder**

Use `git mv` so history follows the files:

```bash
mkdir -p public/svgs/pieces
git mv public/svgs/road_red.svg public/svgs/pieces/road_red.svg
git mv public/svgs/road_blue.svg public/svgs/pieces/road_blue.svg
```

- [ ] **Step 14: Create the six missing road colours by palette translation only**

For each new road file:
- duplicate one of the moved road templates
- preserve the exact live geometry:
  - same `viewBox`
  - same path `d`
  - same stroke width
  - same rounded-hex silhouette
- change only:
  - the three gradient stop colours
  - the stroke colour

Do not alter road proportions or shape data in this slice.

- [ ] **Step 15: Validate the road SVG family**

Run: `xmllint --noout public/svgs/pieces/road_*.svg`

Expected: no output

- [ ] **Step 16: Commit the road asset family**

```bash
git add public/svgs/pieces/road_red.svg public/svgs/pieces/road_blue.svg public/svgs/pieces/road_green.svg public/svgs/pieces/road_orange.svg public/svgs/pieces/road_purple.svg public/svgs/pieces/road_pink.svg public/svgs/pieces/road_cyan.svg public/svgs/pieces/road_amber.svg
git commit -m "feat: add full road color asset family"
```

### Task 4: Migrate and expand the settlement SVG family

**Files:**
- Move: `public/svgs/settlement_red.svg` -> `public/svgs/pieces/settlement_red.svg`
- Move: `public/svgs/settlement_blue.svg` -> `public/svgs/pieces/settlement_blue.svg`
- Create: `public/svgs/pieces/settlement_green.svg`
- Create: `public/svgs/pieces/settlement_orange.svg`
- Create: `public/svgs/pieces/settlement_purple.svg`
- Create: `public/svgs/pieces/settlement_pink.svg`
- Create: `public/svgs/pieces/settlement_cyan.svg`
- Create: `public/svgs/pieces/settlement_amber.svg`

- [ ] **Step 17: Move the live red / blue settlement assets into the new folder**

```bash
mkdir -p public/svgs/pieces
git mv public/svgs/settlement_red.svg public/svgs/pieces/settlement_red.svg
git mv public/svgs/settlement_blue.svg public/svgs/pieces/settlement_blue.svg
```

- [ ] **Step 18: Create the six missing settlement colours without changing geometry**

For each new settlement file:
- copy from the moved Catana settlement template
- preserve:
  - `width`, `height`, `viewBox`
  - all path data
  - all gradient coordinates / ids
- update only palette-bearing values:
  - `stop-color` values in gradients `a`, `b`, `c`, `d`, `e`
  - solid fills such as the dark outline / door / mid-plane fills

The intended change is palette translation, not shape redesign.

- [ ] **Step 19: Validate the settlement SVG family**

Run: `xmllint --noout public/svgs/pieces/settlement_*.svg`

Expected: no output

- [ ] **Step 20: Commit the settlement asset family**

```bash
git add public/svgs/pieces/settlement_red.svg public/svgs/pieces/settlement_blue.svg public/svgs/pieces/settlement_green.svg public/svgs/pieces/settlement_orange.svg public/svgs/pieces/settlement_purple.svg public/svgs/pieces/settlement_pink.svg public/svgs/pieces/settlement_cyan.svg public/svgs/pieces/settlement_amber.svg
git commit -m "feat: add full settlement color asset family"
```

### Task 5: Migrate and expand the city SVG family

**Files:**
- Move: `public/svgs/city_red.svg` -> `public/svgs/pieces/city_red.svg`
- Move: `public/svgs/city_blue.svg` -> `public/svgs/pieces/city_blue.svg`
- Create: `public/svgs/pieces/city_green.svg`
- Create: `public/svgs/pieces/city_orange.svg`
- Create: `public/svgs/pieces/city_purple.svg`
- Create: `public/svgs/pieces/city_pink.svg`
- Create: `public/svgs/pieces/city_cyan.svg`
- Create: `public/svgs/pieces/city_amber.svg`

- [ ] **Step 21: Move the live red / blue city assets into the new folder**

```bash
mkdir -p public/svgs/pieces
git mv public/svgs/city_red.svg public/svgs/pieces/city_red.svg
git mv public/svgs/city_blue.svg public/svgs/pieces/city_blue.svg
```

- [ ] **Step 22: Create the six missing city colours without changing geometry**

For each new city file:
- copy from the moved Catana city template
- preserve:
  - all geometry and path data
  - all gradient coordinate definitions
  - the live city silhouette / upgrade structure
- update only colour-bearing values:
  - gradient stop colours across the city gradients
  - dark shell / shadow / accent fills

Again, this task is palette translation only.

- [ ] **Step 23: Validate the city SVG family**

Run: `xmllint --noout public/svgs/pieces/city_*.svg`

Expected: no output

- [ ] **Step 24: Commit the city asset family**

```bash
git add public/svgs/pieces/city_red.svg public/svgs/pieces/city_blue.svg public/svgs/pieces/city_green.svg public/svgs/pieces/city_orange.svg public/svgs/pieces/city_purple.svg public/svgs/pieces/city_pink.svg public/svgs/pieces/city_cyan.svg public/svgs/pieces/city_amber.svg
git commit -m "feat: add full city color asset family"
```

### Task 6: Lock asset inventory, verify end-to-end, and update docs

**Files:**
- Modify: `app/catana/__tests__/themeAssets.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 25: Update theme asset tests for nested piece paths and disk presence**

In `app/catana/__tests__/themeAssets.test.js`:
- replace root-level expectations such as:
  - `"/svgs/settlement_red.svg"`
  - `"/svgs/settlement_green.svg"`
- with nested expectations such as:
  - `"/svgs/pieces/settlement_red.svg"`
  - `"/svgs/pieces/settlement_green.svg"`

Add a disk existence assertion for all 24 piece files under `public/svgs/pieces/`.

- [ ] **Step 26: Run the targeted automated verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/themeAssets.test.js
rg -n "colonist\\.io/dist/images/(settlement|city|road)_" app/catana/types.js app/board-editor/utils/types.js
rg --files public/svgs | rg '(^|/)(road|settlement|city)_(red|blue|green|orange|purple|pink|cyan|amber)\\.svg$'
xmllint --noout public/svgs/pieces/*.svg
```

Expected:
- all targeted Vitest files PASS
- the `rg` command prints no output
- the root-level asset check prints only paths under `public/svgs/pieces/`
- `xmllint` prints no output

- [ ] **Step 27: Run a manual smoke check for chosen-colour piece rendering**

Run:

```bash
pnpm serve
pnpm dev
```

Verify manually:
- in the lobby, pick a non-seat-default colour such as `purple`, `pink`, `cyan`, or `amber`
- join a match and place a road / settlement / city if possible
- confirm the board piece and placement effect match the selected lobby colour
- confirm no request still points at `colonist.io/dist/images/*piece*`

If placement is awkward in a live flow, use an existing local scenario or dev path that already reaches piece placement quickly; do not add new tooling in this slice just for verification.

- [ ] **Step 28: Update the agent docs**

Add a short entry to:
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

Capture:
- the new `public/svgs/pieces/` canonical location
- the shared piece-asset helper path
- the fact that board pieces now prefer chosen lobby colours over seat-order fallback colours

- [ ] **Step 29: Commit verification + docs**

```bash
git add app/catana/__tests__/themeAssets.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record player piece asset migration"
```
