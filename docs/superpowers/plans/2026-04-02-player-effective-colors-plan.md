# Player Effective Colors Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve one unique in-game colour per player from lobby preferences so 1v1 pieces, avatar boxes, log/chat highlights, and postgame colour accents can never clash.

**Architecture:** Add a pure UI-side resolver that takes authoritative seat order from `core.players` plus preferred colours from match metadata and returns `effectiveColorByPlayerId`. Build `playerViewMap` from that resolved map, thread the same resolved colours through `GameScreen` and `Board`, and remove the current avatar-only `chosenColor` override so every in-game consumer reads from one source of truth.

**Tech Stack:** Next.js, React, Tailwind utility classes, boardgame.io client props, Vitest, agent docs

---

## File Map

**Resolver + player view**
- Create: `app/catana/utils/playerColorsInGame.js`
- Modify: `app/catana/utils/playerView.js`

**Match wiring**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/Board.js`

**UI consumers**
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/PostgameOverlay.js`

**Tests**
- Create: `app/catana/__tests__/playerColorsInGame.test.js`
- Create: `app/catana/__tests__/GameScreen.playerColors.test.js`
- Create: `app/catana/__tests__/Board.playerColors.test.js`
- Create: `app/catana/__tests__/playerAvatarStats.color.test.js`
- Create: `app/catana/__tests__/PostgameOverlay.test.js`
- Modify: `app/catana/__tests__/effects/placePieceWiring.test.js`
- Modify: `app/catana/__tests__/playerView.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`

**Docs**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- Follow `@superpowers:test-driven-development` task by task. Do not write runtime code before the relevant failing tests exist.
- Keep the resolver in UI code for this slice. Do not add server-side persisted effective colours.
- Use `core.players` order as the authoritative seat order when resolving clashes.
- Keep the resolver reading the palette order from `PLAYER_COLOR_OPTIONS`; `app/catana/__tests__/playerColors.test.js` already locks the required order and should stay green.
- Keep missing-asset behavior unchanged. Do not remap colours just because a piece SVG is missing.
- For CSS color fills such as the postgame dot, do not rely on raw ids like `amber`; map through `getPlayerNameHex(...)` or another explicit colour helper.

### Task 1: Lock the effective-colour resolver contract

**Files:**
- Create: `app/catana/__tests__/playerColorsInGame.test.js`
- Modify: `app/catana/__tests__/playerView.test.js`
- Create: `app/catana/utils/playerColorsInGame.js`
- Modify: `app/catana/utils/playerView.js`

- [ ] **Step 1: Write the failing resolver and player-view tests**

Create `app/catana/__tests__/playerColorsInGame.test.js` with coverage for:
- distinct preferred colours staying unchanged,
- duplicate preferred colours resolving by `core.players` order,
- missing or invalid preferred colours falling back to the first unused palette colour,
- once all unique colours are exhausted, additional seats continuing in palette order rather than silently hardcoding `"red"`,
- returned map keys staying as string player ids.

Extend `app/catana/__tests__/playerView.test.js` so `buildPlayerViewMap(...)` is expected to honour an injected effective-colour map instead of always using seat-order colours.

Example test shape:

```js
import { describe, expect, it } from "vitest";
import { resolveEffectivePlayerColors } from "../utils/playerColorsInGame";

describe("resolveEffectivePlayerColors", () => {
  it("resolves duplicate preferences by seat order", () => {
    expect(
      resolveEffectivePlayerColors({
        playerIds: ["0", "1"],
        preferredColorByPlayerId: { "0": "blue", "1": "blue" },
      })
    ).toEqual({ "0": "blue", "1": "red" });
  });
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/playerView.test.js
```

Expected:
- `playerColorsInGame.test.js` fails because the resolver file does not exist yet,
- the new `playerView.test.js` expectation fails because `buildPlayerViewMap` still hardcodes seat-order colours.

- [ ] **Step 3: Implement the pure resolver and color-aware player view helper**

Create `app/catana/utils/playerColorsInGame.js` with a pure helper that:
- reads the ordered palette from `PLAYER_COLOR_OPTIONS`,
- validates preferred colour ids against that exact set,
- iterates `playerIds` in order,
- keeps the preferred colour when unused,
- otherwise picks the first unused palette colour.

Update `app/catana/utils/playerView.js` so `buildPlayerViewMap(core, effectiveColorByPlayerId = {})` prefers the injected resolved colour and only falls back to the legacy seat-order colour when no resolved entry exists.

Implementation sketch:

```js
import { PLAYER_COLOR_OPTIONS } from "../theme/playerColors";

const PLAYER_COLOR_IDS = PLAYER_COLOR_OPTIONS.map((option) => option.id);

export function resolveEffectivePlayerColors({
  playerIds = [],
  preferredColorByPlayerId = {},
} = {}) {
  const used = new Set();
  const resolved = {};

  playerIds.map(String).forEach((playerId, index) => {
    const preferred = preferredColorByPlayerId?.[playerId];
    const preferredIsAvailable =
      PLAYER_COLOR_IDS.includes(preferred) && !used.has(preferred);
    const nextColor =
      preferredIsAvailable
        ? preferred
        : PLAYER_COLOR_IDS.find((colorId) => !used.has(colorId)) ??
          PLAYER_COLOR_IDS[index % PLAYER_COLOR_IDS.length];

    resolved[playerId] = nextColor;
    used.add(nextColor);
  });

  return resolved;
}
```

- [ ] **Step 4: Re-run the targeted tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/playerView.test.js
```

Expected: PASS

- [ ] **Step 5: Commit the resolver contract**

```bash
git add app/catana/utils/playerColorsInGame.js app/catana/utils/playerView.js app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/playerView.test.js
git commit -m "feat: add effective player color resolver"
```

### Task 2: Thread resolved colours through GameScreen and the board

**Files:**
- Create: `app/catana/__tests__/GameScreen.playerColors.test.js`
- Create: `app/catana/__tests__/Board.playerColors.test.js`
- Modify: `app/catana/__tests__/effects/placePieceWiring.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/Board.js`

- [ ] **Step 6: Write the failing screen and board wiring tests**

Create `app/catana/__tests__/GameScreen.playerColors.test.js` as a source-level regression test that asserts `GameScreen.js`:
- imports `resolveEffectivePlayerColors`,
- memoizes `effectiveColorByPlayerId`,
- builds `playerViewMap` from `buildPlayerViewMap(core, effectiveColorByPlayerId)`,
- passes `effectiveColorByPlayerId` into `CatanBoard`,
- uses resolved colours for `logPlayerMap` and scoreboard entries,
- no longer constructs `player` / `opponents` with `chosenColor`.

Create `app/catana/__tests__/Board.playerColors.test.js` asserting `Board.js`:
- accepts an `effectiveColorByPlayerId` prop,
- calls `buildPlayerViewMap(G.core, effectiveColorByPlayerId)`,
- uses that resolved view map for placed buildings, placed roads, and placement previews.

Extend `app/catana/__tests__/effects/placePieceWiring.test.js` so the placement-effects guard asserts `GameScreen.js` still resolves placement colours through the resolved `playerViewMap` / `effectiveColorByPlayerId` path rather than raw preferred colours or seat-order fallbacks.

Update `app/catana/__tests__/renderPerfGuards.test.js` so the colour guard expects memoized effective-colour resolution rather than the old `seatColorMap` fallback path.

Example assertions:

```js
expect(contents).toContain("resolveEffectivePlayerColors");
expect(contents).toContain("effectiveColorByPlayerId");
expect(contents).toContain("buildPlayerViewMap(core, effectiveColorByPlayerId)");
expect(contents).toContain("effectiveColorByPlayerId={effectiveColorByPlayerId}");
expect(contents).not.toContain("chosenColor");
```

- [ ] **Step 7: Run the focused wiring tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/Board.playerColors.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected:
- the new source tests fail because `GameScreen.js` and `Board.js` do not yet reference `effectiveColorByPlayerId`,
- the updated perf guard fails because `GameScreen.js` still uses the older seat-colour fallback path.

- [ ] **Step 8: Implement resolved-color wiring in GameScreen and Board**

In `app/catana/GameScreen.js`:
- keep `colorMap` as the raw preferred-colour map from match metadata,
- add `effectiveColorByPlayerId = useMemo(...)` using `resolveEffectivePlayerColors`,
- build `playerViewMap` from the resolved map,
- remove `chosenColor` from `player` and `opponents`,
- build `logPlayerMap` and scoreboard colour fields from the resolved map,
- pass `effectiveColorByPlayerId` to `CatanBoard`.

In `app/catana/Board.js`:
- accept the new `effectiveColorByPlayerId` prop,
- build the local `playerViewMap` from `buildPlayerViewMap(G.core, effectiveColorByPlayerId)`,
- keep using `playerViewMap[ownerId]?.color` for roads, buildings, previews, and current-player placement affordances.

Keep the placement-effect callback in `GameScreen.js` on the resolved path by continuing to ask either the resolved `playerViewMap` or `effectiveColorByPlayerId` for the player colour by id.

Implementation sketch:

```js
const effectiveColorByPlayerId = useMemo(
  () =>
    resolveEffectivePlayerColors({
      playerIds: core?.players ?? [],
      preferredColorByPlayerId: colorMap,
    }),
  [core?.players, colorMap]
);

const playerViewMap = useMemo(
  () => buildPlayerViewMap(core, effectiveColorByPlayerId),
  [core, effectiveColorByPlayerId]
);
```

- [ ] **Step 9: Re-run the focused wiring tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/Board.playerColors.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS

- [ ] **Step 10: Commit the shared match-color wiring**

```bash
git add app/catana/GameScreen.js app/catana/Board.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/Board.playerColors.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/renderPerfGuards.test.js
git commit -m "refactor: wire resolved in-game player colors"
```

### Task 3: Remove the avatar-only override and fix non-board colour consumers

**Files:**
- Create: `app/catana/__tests__/playerAvatarStats.color.test.js`
- Create: `app/catana/__tests__/PostgameOverlay.test.js`
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/PostgameOverlay.js`

- [ ] **Step 11: Write the failing avatar and postgame tests**

Create `app/catana/__tests__/playerAvatarStats.color.test.js` as a source-level test asserting `PlayerAvatarStats.js`:
- does not read `player.chosenColor`,
- does not build a separate `chosenGradient` / `seatGradient` split,
- derives the avatar gradient from `player.color` via `getPlayerColorOption(...)`.

Create `app/catana/__tests__/PostgameOverlay.test.js` asserting `PostgameOverlay.js`:
- no longer uses `backgroundColor: player.color`,
- imports a helper such as `getPlayerNameHex`,
- maps the scoreboard dot to an explicit display colour that supports ids like `amber`.

Example expectations:

```js
expect(contents).not.toContain("chosenColor");
expect(contents).toContain("getPlayerColorOption(player.color)");
expect(contents).toContain("getPlayerNameHex");
expect(contents).not.toContain("backgroundColor: player.color");
```

- [ ] **Step 12: Run the focused UI-consumer tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/PostgameOverlay.test.js
```

Expected:
- the avatar test fails because `PlayerAvatarStats.js` still prefers `chosenColor`,
- the postgame test fails because `PostgameOverlay.js` still uses raw `player.color` as a CSS color string.

- [ ] **Step 13: Implement the avatar and postgame consumer fixes**

Update `app/catana/components/PlayerAvatarStats.js` so the avatar background reads from `player.color` only, with the existing slate fallback when no colour is available.

Update `app/catana/components/PostgameOverlay.js` so the scoreboard chip uses an explicit display colour helper instead of raw ids. `getPlayerNameHex(player.color)` is sufficient for this slice.

Implementation sketch:

```js
const avatarColor = player.color
  ? getPlayerColorOption(player.color).gradient
  : "from-slate-500 to-slate-800";

const playerSwatchColor = getPlayerNameHex(player.color) ?? "#888";
```

- [ ] **Step 14: Re-run the focused UI-consumer tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/PostgameOverlay.test.js
```

Expected: PASS

- [ ] **Step 15: Commit the consumer alignment fixes**

```bash
git add app/catana/components/PlayerAvatarStats.js app/catana/components/PostgameOverlay.js app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/PostgameOverlay.test.js
git commit -m "fix: align avatar and postgame player colors"
```

### Task 4: Record the change and run focused verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 16: Update the progress log**

Add a new top entry to `docs/agent/PROGRESS.md` summarizing:
- the new effective-colour resolver,
- the removal of the `chosenColor` vs seat-colour split,
- the main verification commands used for this slice.

- [ ] **Step 17: Update the implementation notes**

Add a note to `docs/agent/NOTES.md` covering:
- resolve one `effectiveColorByPlayerId` map from `core.players` order plus `matchData[].data.color`,
- thread that same map through `GameScreen`, `Board`, and all in-game player-colour consumers,
- use explicit hex helpers for CSS fills such as postgame dots; raw ids like `amber` are only safe as logical ids / asset suffixes.

- [ ] **Step 18: Run the focused verification suite**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/Board.playerColors.test.js app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/PostgameOverlay.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS

- [ ] **Step 19: Run lint on the touched runtime files**

Run:
```bash
pnpm exec eslint app/catana/utils/playerColorsInGame.js app/catana/utils/playerView.js app/catana/GameScreen.js app/catana/Board.js app/catana/components/PlayerAvatarStats.js app/catana/components/PostgameOverlay.js
```

Expected: no errors

- [ ] **Step 20: Commit the docs and verification pass**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record effective player color workflow"
```
