# Player Color Conflicts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent visually similar player colors from appearing together in the same match, retire `olive`, and keep in-game piece/avatar colors aligned with the resolved effective match color.

**Architecture:** Keep the policy explicit and data-driven. Update the canonical palette in `playerColors.js`, add a pure conflict-aware resolver in `playerColorsInGame.js`, and have `GameScreen.js` use that resolver before building player views or color metadata for the board, effects, and overlays. Remove the remaining avatar-only chosen-color preference so the resolved in-game color is the only source of truth inside a match.

**Tech Stack:** Next.js, React, boardgame.io client props, Tailwind utility classes, Vitest, ESLint, agent docs

---

## File Map

**Palette + picker**
- Modify: `app/catana/theme/playerColors.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`

**Resolver + match wiring**
- Create: `app/catana/utils/playerColorsInGame.js`
- Modify: `app/catana/GameScreen.js`

**Avatar consumer**
- Modify: `app/catana/components/PlayerAvatarStats.js`

**Tests**
- Modify: `app/catana/__tests__/playerColors.test.js`
- Modify: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.identity.test.js`
- Create: `app/catana/__tests__/playerColorsInGame.test.js`
- Create: `app/catana/__tests__/GameScreen.playerColors.test.js`
- Create: `app/catana/__tests__/playerAvatarStats.color.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`

**Docs**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- Follow `@superpowers:test-driven-development` task by task. Do not write runtime code before the relevant failing tests exist.
- Keep the conflict logic explicit. Do not introduce generalized color-distance scoring or broader heuristic “similarity” logic.
- Approved conflicts are only:
  - `lavender` with `violet`, `purple`, `magenta`
  - `purple` with `lavender`, `violet`, `magenta`
  - `violet` with `lavender`, `purple`
  - `magenta` with `lavender`, `purple`
  - `red` with `coral`
- `violet` and `magenta` must remain allowed together.
- `olive` is retired from live use:
  - it must not appear in picker/runtime option lists,
  - fallback assignment must never choose it,
  - old `olive` values must normalize to `lime`.
- Keep any existing picker-order polish intact on the execution branch. This slice is about palette membership and conflict rules, not redesigning the swatch layout.

### Task 1: Retire `olive` and lock the palette contract

**Files:**
- Modify: `app/catana/__tests__/playerColors.test.js`
- Modify: `app/catana/__tests__/pieceAssets.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.identity.test.js`
- Modify: `app/catana/theme/playerColors.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`

- [ ] **Step 1: Write the failing palette and picker tests**

Extend `app/catana/__tests__/playerColors.test.js` so it asserts:
- `PLAYER_COLOR_OPTIONS` no longer contains `"olive"`,
- `getPlayerColorOption("olive").id` resolves to `"lime"`,
- `normalizePlayerColorId("olive")` resolves to `"lime"`.

Extend `app/catana/__tests__/pieceAssets.test.js` so the legacy-alias coverage includes:

```js
expect(getPieceSvgFile("road", "olive")).toBe("pieces/road_lime.svg");
```

Extend `app/catana/__tests__/LobbyPageClient.identity.test.js` so it asserts the username modal no longer renders `olive` in its swatch source.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/LobbyPageClient.identity.test.js
```

Expected:
- `playerColors.test.js` fails because `olive` is still a live palette entry and not normalized,
- `pieceAssets.test.js` fails because `normalizePlayerColorId("olive")` does not yet map to `lime`,
- the lobby source test fails because the picker still derives from a list that contains `olive`.

- [ ] **Step 3: Implement the palette retirement**

In `app/catana/theme/playerColors.js`:
- add `olive: "lime"` to `LEGACY_PLAYER_COLOR_ALIASES`,
- remove the `olive` option object from `PLAYER_COLOR_OPTION_VALUES`,
- ensure `SEAT_FALLBACK_COLOR_IDS` still excludes retired colors.

Implementation sketch:

```js
export const LEGACY_PLAYER_COLOR_ALIASES = Object.freeze({
  blue: "sky",
  cyan: "teal",
  pink: "coral",
  amber: "gold",
  olive: "lime"
});
```

In `app/catana/lobby/LobbyPageClient.js`:
- keep using normalized colors for stored/submitted values,
- make sure the swatch source is whatever live picker/runtime option list now excludes `olive`.

- [ ] **Step 4: Re-run the targeted tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/LobbyPageClient.identity.test.js
```

Expected: PASS

- [ ] **Step 5: Commit the palette retirement**

```bash
git add app/catana/theme/playerColors.js app/catana/lobby/LobbyPageClient.js app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/LobbyPageClient.identity.test.js
git commit -m "feat: retire olive player color"
```

### Task 2: Add conflict-aware effective color resolution and wire it through GameScreen

**Files:**
- Create: `app/catana/__tests__/playerColorsInGame.test.js`
- Create: `app/catana/__tests__/GameScreen.playerColors.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`
- Create: `app/catana/utils/playerColorsInGame.js`
- Modify: `app/catana/GameScreen.js`

- [ ] **Step 6: Write the failing resolver and screen-wiring tests**

Create `app/catana/__tests__/playerColorsInGame.test.js` with coverage for:
- exact duplicate conflicts still reassigning the later seat,
- `lavender` vs `violet`,
- `lavender` vs `magenta`,
- `purple` vs `violet`,
- `purple` vs `magenta`,
- `red` vs `coral`,
- `violet` and `magenta` staying allowed together,
- fallback reassignment never returning `olive`.

Create `app/catana/__tests__/GameScreen.playerColors.test.js` as a source-level guard asserting `GameScreen.js`:
- imports `resolveEffectivePlayerColors`,
- memoizes `effectiveColorByPlayerId`,
- builds `playerViewMap` from the resolved map,
- uses the resolved map for log/effect color reads,
- no longer keeps the old direct `colorMap[id] ?? seatColorMap[id] ?? "red"` fallback path as the final in-game color source.

Update `app/catana/__tests__/renderPerfGuards.test.js` so the performance guard expects memoized effective-color resolution rather than the old `boardColorMap` memo.

Example resolver test shape:

```js
expect(
  resolveEffectivePlayerColors({
    playerIds: ["0", "1"],
    preferredColorByPlayerId: { "0": "lavender", "1": "purple" }
  })
).toEqual({ "0": "lavender", "1": "red" });
```

- [ ] **Step 7: Run the focused resolver tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected:
- `playerColorsInGame.test.js` fails because the resolver file does not exist yet,
- `GameScreen.playerColors.test.js` fails because `GameScreen.js` still derives in-game colors directly from preferred colors plus seat fallback,
- `renderPerfGuards.test.js` fails because it still matches the older `boardColorMap` path.

- [ ] **Step 8: Implement the explicit conflict-aware resolver**

Create `app/catana/utils/playerColorsInGame.js` with:
- a normalized fallback palette derived from the live `PLAYER_COLOR_OPTIONS`,
- an explicit conflict graph constant,
- a pure `colorsConflict(a, b)` helper,
- a pure `resolveEffectivePlayerColors({ playerIds, preferredColorByPlayerId })` helper.

Implementation sketch:

```js
import { PLAYER_COLOR_OPTIONS, normalizePlayerColorId } from "../theme/playerColors.js";

const PLAYER_COLOR_IDS = PLAYER_COLOR_OPTIONS.map((option) => option.id);

const PLAYER_COLOR_CONFLICTS = Object.freeze({
  lavender: ["violet", "purple", "magenta"],
  purple: ["lavender", "violet", "magenta"],
  violet: ["lavender", "purple"],
  magenta: ["lavender", "purple"],
  red: ["coral"],
  coral: ["red"]
});

export function colorsConflict(a, b) {
  const left = normalizePlayerColorId(a);
  const right = normalizePlayerColorId(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return (
    PLAYER_COLOR_CONFLICTS[left]?.includes(right) ||
    PLAYER_COLOR_CONFLICTS[right]?.includes(left) ||
    false
  );
}
```

Resolution rule:
- normalize each preferred color first,
- keep the preferred color if it conflicts with none of the already-assigned effective colors,
- otherwise assign the first fallback color that conflicts with none of the already-assigned effective colors.

- [ ] **Step 9: Wire GameScreen to the new resolver**

In `app/catana/GameScreen.js`:
- keep `colorMap` as raw preferred metadata,
- replace the old direct `boardColorMap` derivation with `effectiveColorByPlayerId = useMemo(...)`,
- build `playerViewMap` from `effectiveColorByPlayerId`,
- use `effectiveColorByPlayerId` for `logPlayerMap` and any effect callback that asks for a player color by id,
- continue passing the resolved map into `CatanBoard` through the existing `playerColorMap` prop unless there is a strong reason to rename the prop in the same change.

Implementation sketch:

```js
import { resolveEffectivePlayerColors } from "./utils/playerColorsInGame";

const effectiveColorByPlayerId = useMemo(
  () =>
    resolveEffectivePlayerColors({
      playerIds: seatPlayerIds,
      preferredColorByPlayerId: colorMap
    }),
  [seatPlayerIds, colorMap]
);

const playerViewMap = useMemo(
  () => buildPlayerViewMap(core, effectiveColorByPlayerId),
  [core, effectiveColorByPlayerId]
);
```

- [ ] **Step 10: Re-run the focused resolver tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS

- [ ] **Step 11: Commit the conflict-aware resolver**

```bash
git add app/catana/utils/playerColorsInGame.js app/catana/GameScreen.js app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/renderPerfGuards.test.js
git commit -m "feat: add player color conflict resolver"
```

### Task 3: Remove the avatar-only color override

**Files:**
- Create: `app/catana/__tests__/playerAvatarStats.color.test.js`
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/GameScreen.js`

- [ ] **Step 12: Write the failing avatar-color source tests**

Create `app/catana/__tests__/playerAvatarStats.color.test.js` asserting:
- `PlayerAvatarStats.js` no longer prefers `player.chosenColor`,
- the avatar gradient is derived from `player.color`,
- the component still falls back safely when `player.color` is missing.

Extend `app/catana/__tests__/GameScreen.playerColors.test.js` so it also asserts that `GameScreen.js` no longer injects `chosenColor` into the `player` / `opponents` objects it builds from `playerViewMap`.

Example source assertions:

```js
expect(contents).not.toContain("player.chosenColor");
expect(contents).toContain("getPlayerColorOption(player.color)");
expect(gameScreenSource).not.toContain("chosenColor:");
```

- [ ] **Step 13: Run the focused avatar tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/GameScreen.playerColors.test.js
```

Expected:
- the avatar source test fails because `PlayerAvatarStats.js` still prefers `chosenColor`,
- the GameScreen source test fails because `player` / `opponents` still carry `chosenColor`.

- [ ] **Step 14: Implement the avatar alignment cleanup**

In `app/catana/components/PlayerAvatarStats.js`:
- remove the chosen-color branch entirely,
- derive the avatar gradient from `player.color` only,
- keep the same fallback gradient when `player.color` is missing.

In `app/catana/GameScreen.js`:
- stop adding `chosenColor` to `player` and `opponents`,
- keep those objects aligned to the resolved `playerViewMap`.

Implementation sketch:

```js
const avatarColor = player.color
  ? getPlayerColorOption(player.color).gradient
  : "from-slate-500 to-slate-800";
```

- [ ] **Step 15: Re-run the focused avatar tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/GameScreen.playerColors.test.js
```

Expected: PASS

- [ ] **Step 16: Commit the avatar alignment**

```bash
git add app/catana/components/PlayerAvatarStats.js app/catana/GameScreen.js app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/GameScreen.playerColors.test.js
git commit -m "fix: align avatar color with resolved player color"
```

### Task 4: Record the workflow and run final verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 17: Update the agent docs**

Add a short entry to `docs/agent/PROGRESS.md` summarizing:
- `olive` retirement,
- the explicit conflict groups,
- the resolver wiring in `GameScreen`,
- the avatar-color cleanup.

Add a short note to `docs/agent/NOTES.md` recording:
- the approved explicit conflict graph,
- `violet` + `magenta` staying allowed,
- `olive -> lime` as a legacy normalization rule.

- [ ] **Step 18: Run the full focused verification slice**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS

Run:
```bash
pnpm exec eslint app/catana/theme/playerColors.js app/catana/lobby/LobbyPageClient.js app/catana/utils/playerColorsInGame.js app/catana/GameScreen.js app/catana/components/PlayerAvatarStats.js app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected:
- no new lint errors,
- if the pre-existing `@next/next/no-img-element` warning appears elsewhere in Catana, do not expand scope to fix it in this slice.

- [ ] **Step 19: Commit the docs and verification pass**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record player color conflict workflow"
```
