# Player Piece Contrast Palette Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current eight-colour Catana player-piece palette with the approved 20-colour contrast-first candidate set, regenerate the road/settlement/city SVG families, and wire the lobby/runtime metadata to the new palette IDs without breaking existing piece lookups.

**Architecture:** Keep `app/catana/theme/playerColors.js` as the canonical palette source of truth and expand it to include the new IDs, fallback seat colours, and legacy-ID aliases. Reuse `app/catana/theme/pieceAssets.js` as the runtime filename/path seam, but teach it to normalize legacy colour IDs onto the new canonical palette. Generate the enlarged SVG family from a small checked-in Node script so future palette tuning is re-runnable instead of hand-editing 60 files.

**Tech Stack:** Next.js, React, Vitest, static SVG assets, Node.js script tooling, `xmllint`

---

## File Map

**Palette metadata + runtime normalization**
- Modify: `app/catana/theme/playerColors.js`
- Modify: `app/catana/theme/pieceAssets.js`
- Modify: `app/catana/utils/playerView.js`
- Modify: `app/catana/__tests__/playerColors.test.js`
- Modify: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/__tests__/playerView.test.js`
- Modify: `app/catana/__tests__/themeAssets.test.js`

**SVG generation**
- Create: `scripts/generate-player-piece-palette.mjs`
- Modify: `public/svgs/pieces/*.svg`
- Delete: obsolete `public/svgs/pieces/*_{blue,pink,cyan,amber}.svg`

**Docs**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- The full 20-colour candidate palette is the implementation target for this pass.
- The likely post-review keep-set is still the `Strong 12`, but pruning is not part of this implementation slice.
- `red`, `green`, `orange`, and `purple` remain valid canonical IDs.
- Old live IDs that disappear from the picker still need a runtime compatibility path:
- `blue -> sky`
- `cyan -> teal`
- `pink -> coral`
- `amber -> gold`
- `black` should render as charcoal.
- `white` should render as ivory/stone.
- `silver` and `gold` can use stronger highlight/shadow contrast than the flat colours, but they must not introduce textures, geometry changes, or a separate material system.

## Canonical Candidate IDs

The implementation target IDs are:

- `red`
- `sky`
- `green`
- `teal`
- `orange`
- `magenta`
- `purple`
- `maroon`
- `olive`
- `brown`
- `royal`
- `violet`
- `lime`
- `coral`
- `lavender`
- `tan`
- `black`
- `white`
- `silver`
- `gold`

The default seat-fallback subset should be:

- `red`
- `sky`
- `green`
- `orange`
- `teal`
- `magenta`

### Task 1: Lock the new palette contract with failing tests

**Files:**
- Modify: `app/catana/__tests__/playerColors.test.js`
- Modify: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/__tests__/playerView.test.js`
- Modify: `app/catana/__tests__/themeAssets.test.js`

- [ ] **Step 1: Update `playerColors` tests to the 20 approved IDs**

Replace the current 8-ID expectation with the full canonical list:

```js
expect(PLAYER_COLOR_OPTIONS.map((entry) => entry.id)).toEqual([
  "red",
  "sky",
  "green",
  "teal",
  "orange",
  "magenta",
  "purple",
  "maroon",
  "olive",
  "brown",
  "royal",
  "violet",
  "lime",
  "coral",
  "lavender",
  "tan",
  "black",
  "white",
  "silver",
  "gold"
]);
```

Add assertions that `getPlayerNameHex("silver")` and `getPlayerNameHex("gold")` both return values.

Also add direct alias-compatibility assertions:

```js
expect(getPlayerColorOption("blue").id).toBe("sky");
expect(getPlayerColorOption("cyan").id).toBe("teal");
expect(getPlayerColorOption("pink").id).toBe("coral");
expect(getPlayerColorOption("amber").id).toBe("gold");
```

- [ ] **Step 2: Extend `pieceAssets` tests to cover new IDs and legacy aliases**

Update the helper contract so it proves canonicalization works:

```js
expect(getPieceSvgFile("road", "gold")).toBe("pieces/road_gold.svg");
expect(getPieceSvgFile("road", "blue")).toBe("pieces/road_sky.svg");
expect(getPieceSvgFile("settlement", "cyan")).toBe("pieces/settlement_teal.svg");
expect(getPieceSvgFile("city", "amber")).toBe("pieces/city_gold.svg");
expect(getPieceSvgPath("settlement", "silver")).toBe(
  "/svgs/pieces/settlement_silver.svg"
);
```

- [ ] **Step 3: Update `playerView` tests for the new fallback seat colours**

Change the second-seat fallback assertion from `blue` to `sky`:

```js
const view = buildPlayerViewMap(core, { "0": "gold" });
expect(view["0"].color).toBe("gold");
expect(view["1"].color).toBe("sky");
```

- [ ] **Step 4: Update `themeAssets` inventory tests to the new piece colour set**

Replace the hard-coded `PIECE_COLORS` list with the full canonical IDs:

```js
const PIECE_COLORS = [
  "red",
  "sky",
  "green",
  "teal",
  "orange",
  "magenta",
  "purple",
  "maroon",
  "olive",
  "brown",
  "royal",
  "violet",
  "lime",
  "coral",
  "lavender",
  "tan",
  "black",
  "white",
  "silver",
  "gold",
];
```

- [ ] **Step 5: Run the contract tests in red state**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/themeAssets.test.js
```

Expected:
- `playerColors.test.js` fails because the palette still exposes the old eight IDs
- `pieceAssets.test.js` fails because alias normalization does not exist yet
- `playerView.test.js` fails because the fallback colour is still `blue`
- `themeAssets.test.js` fails because the 60-file inventory does not exist yet

### Task 2: Implement canonical palette metadata and runtime normalization

**Files:**
- Modify: `app/catana/theme/playerColors.js`
- Modify: `app/catana/theme/pieceAssets.js`
- Modify: `app/catana/utils/playerView.js`
- Modify: `app/catana/__tests__/playerColors.test.js`
- Modify: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/__tests__/playerView.test.js`

- [ ] **Step 6: Expand `playerColors.js` into the canonical palette source**

Add exported palette constants:

```js
export const DEFAULT_PLAYER_COLOR_ID = "red";

export const LEGACY_PLAYER_COLOR_ALIASES = Object.freeze({
  blue: "sky",
  cyan: "teal",
  pink: "coral",
  amber: "gold",
});

export const SEAT_FALLBACK_COLOR_IDS = Object.freeze([
  "red",
  "sky",
  "green",
  "orange",
  "teal",
  "magenta",
]);
```

Replace the old 8-entry `PLAYER_COLOR_OPTIONS` list with the full 20 entries using the approved hex values and board-friendly swatch/gradient classes. Use static arbitrary Tailwind values where needed, for example:

```js
Object.freeze({
  id: "sky",
  swatch: "bg-[#4b92db]",
  gradient: "from-[#4b92db] to-[#2f5fa6]",
  nameHex: "#4b92db",
});
```

- [ ] **Step 7: Add canonical colour normalization helpers to `playerColors.js`**

Export:

```js
export function normalizePlayerColorId(colorId) {
  const normalized = String(colorId ?? "").trim().toLowerCase();
  return LEGACY_PLAYER_COLOR_ALIASES[normalized] ?? normalized || DEFAULT_PLAYER_COLOR_ID;
}
```

Update `getPlayerColorOption(...)` and `getPlayerNameHex(...)` to call `normalizePlayerColorId(...)` before lookup.

- [ ] **Step 8: Route `pieceAssets.js` through canonical palette normalization**

In `app/catana/theme/pieceAssets.js`, import the player-color normalizer and use it inside `normalizePieceColor(...)`:

```js
import { DEFAULT_PLAYER_COLOR_ID, normalizePlayerColorId } from "./playerColors.js";

export const DEFAULT_PIECE_COLOR = DEFAULT_PLAYER_COLOR_ID;

export function normalizePieceColor(colorId) {
  return normalizePlayerColorId(colorId) || DEFAULT_PIECE_COLOR;
}
```

- [ ] **Step 9: Replace hard-coded fallback seat colours in `playerView.js`**

Import `SEAT_FALLBACK_COLOR_IDS` and derive `UI_PLAYER_COLORS` from it:

```js
import { SEAT_FALLBACK_COLOR_IDS } from "../theme/playerColors.js";

export const UI_PLAYER_COLORS = [...SEAT_FALLBACK_COLOR_IDS];
```

Keep the existing `buildPlayerViewMap(core, colorByPlayerId = {})` signature.

- [ ] **Step 10: Re-run the palette contract tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js
```

Expected: PASS

- [ ] **Step 11: Commit the palette metadata/runtime slice**

```bash
git add app/catana/theme/playerColors.js app/catana/theme/pieceAssets.js app/catana/utils/playerView.js app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js
git commit -m "feat: add contrast-first player piece palette"
```

### Task 3: Add a re-runnable SVG generator and regenerate the full 20-colour piece family

**Files:**
- Create: `scripts/generate-player-piece-palette.mjs`
- Modify: `public/svgs/pieces/*.svg`
- Delete: obsolete `public/svgs/pieces/*_{blue,pink,cyan,amber}.svg`

- [ ] **Step 12: Add the SVG generator script**

Create a small Node script that:

- imports the canonical palette metadata from `app/catana/theme/playerColors.js`
- skips legacy alias IDs entirely
- derives Catana-compatible ramps for:
- flat colours,
- `black`,
- `white`,
- `silver`,
- `gold`
- rewrites the road, settlement, and city families from the existing `red` templates
- deletes obsolete unsupported asset IDs from `public/svgs/pieces/`

Keep the script re-runnable and deterministic.

- [ ] **Step 13: Define metallic handling inside the generator**

Inside the script, special-case `silver` and `gold` so they only vary by:

- stronger highlight/shadow separation,
- cooler highlights for `silver`,
- warmer highlights for `gold`,
- slightly darker outline/shell planes,

while keeping:

- geometry unchanged,
- no textures,
- no overlays,
- no extra paths or gradients beyond the existing family structure.

- [ ] **Step 14: Run the generator**

Run:

```bash
node scripts/generate-player-piece-palette.mjs
```

Expected:
- `public/svgs/pieces/road_<id>.svg` exists for all 20 canonical IDs
- `public/svgs/pieces/settlement_<id>.svg` exists for all 20 canonical IDs
- `public/svgs/pieces/city_<id>.svg` exists for all 20 canonical IDs
- obsolete `blue`, `pink`, `cyan`, and `amber` piece files are removed

- [ ] **Step 15: Prove the obsolete piece files are gone**

Run:

```bash
rg --files public/svgs/pieces | rg '(blue|pink|cyan|amber)\\.svg$'
```

Expected: no output

- [ ] **Step 16: Validate the regenerated SVG set**

Run:

```bash
xmllint --noout public/svgs/pieces/*.svg
```

Expected: no output

- [ ] **Step 17: Commit the generated asset family**

```bash
git add scripts/generate-player-piece-palette.mjs public/svgs/pieces
git commit -m "feat: generate contrast-first player piece svg families"
```

### Task 4: Lock the final inventory, verify compatibility, and record the change

**Files:**
- Modify: `app/catana/__tests__/themeAssets.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 18: Finish the final inventory assertions in `themeAssets.test.js`**

Make the disk existence test assert all 60 canonical piece files:

```js
PIECE_TYPES.flatMap((pieceType) =>
  PIECE_COLORS.map((colorId) => `pieces/${pieceType}_${colorId}.svg`)
)
```

Do not leave old `blue`, `pink`, `cyan`, or `amber` asset IDs in that list.

- [ ] **Step 19: Run the full targeted verification batch**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/themeAssets.test.js
node -e "import('./app/catana/types.js')"
node -e "import('./app/board-editor/utils/types.js')"
rg -n "colonist\\.io/dist/images/(settlement|city|road)_" app/catana/types.js app/board-editor/utils/types.js
rg --files public/svgs/pieces | rg '(road|settlement|city)_(red|sky|green|teal|orange|magenta|purple|maroon|olive|brown|royal|violet|lime|coral|lavender|tan|black|white|silver|gold)\\.svg$'
rg --files public/svgs/pieces | rg '(blue|pink|cyan|amber)\\.svg$'
xmllint --noout public/svgs/pieces/*.svg
```

Expected:
- all Vitest files PASS
- direct Node imports PASS
- the Colonist `rg` command prints no output
- the asset `rg` command prints only canonical 20-colour piece files
- the obsolete-ID `rg` command prints no output
- `xmllint` prints no output

- [ ] **Step 20: Run the manual board review pass without pruning**

Run:

```bash
pnpm serve
pnpm dev
```

Review at least the likely collision groups on the board:

- `red` / `maroon` / `coral`
- `sky` / `royal` / `violet` / `lavender`
- `green` / `lime` / `olive` / `gold`
- `orange` / `brown` / `tan`
- `magenta` / `purple`
- `white` / `silver`

Use the spec rule:

- 10 side-by-side comparisons per collision pair
- 5 at default zoom
- 5 at zoomed-out overview
- if a pair is misidentified 2 or more times out of 10, note that pair as prune-candidate later

Do not prune or delete any candidate colours in this slice. Only record the likely cuts.

- [ ] **Step 21: Update agent docs**

Add a short note to `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` covering:

- the new 20-colour candidate palette,
- the canonical IDs,
- the alias compatibility mapping for old IDs,
- the generator script path,
- the fact that pruning happens after live review, not in this slice.

- [ ] **Step 22: Commit verification and docs**

```bash
git add app/catana/__tests__/themeAssets.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record contrast-first player piece palette"
```
