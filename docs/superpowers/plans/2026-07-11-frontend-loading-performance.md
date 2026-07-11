# Frontend Loading Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce initial homepage and live-game loading work without changing the visible game, interactions, animation timing, or audio timing.

**Architecture:** Preserve the current first-paint shells and move optional code behind cached dynamic-import functions. Warm those imports during a bounded browser-idle window, while keeping early interaction capable of starting the same promise immediately. Reuse the existing cue bus and `AudioManager` for one flat live-game sound preload instead of creating a second audio subsystem.

**Tech Stack:** Next.js 13 App Router, React 18, GSAP, Howler, Vaul, Vitest, pnpm.

## Global Constraints

- The homepage, board, HUD, drawers, dialogs, animations, and sounds retain their current appearance and behavior.
- The only intentional visual change is a smaller, accurate browser-tab icon derived from the accepted homepage mark.
- Effects never wait for a sound download. Existing cue timing remains authoritative.
- Do not add dependencies, sound groups, cache-busting infrastructure, spritesheets, a service worker, or a Vaul replacement.
- Preserve unrelated dirty-worktree changes and do not reformat unrelated code.
- Use one existing baseline and one final production/Lighthouse comparison; do not profile every mechanical edit.

---

### Task 1: Replace the oversized favicon

**Files:**
- Create: `app/icon.svg`
- Delete: `app/favicon.ico`

**Interfaces:**
- Consumes: the accepted `BRAND_LOGO_TILE_PATH` and brand gradient from `app/catana/home/HomeTableClient.js`.
- Produces: Next App Router metadata icon `/icon.svg` with no large ICO response.

- [ ] **Step 1: Create the canonical SVG icon**

Create `app/icon.svg` with `viewBox="0 0 346 400"`, the existing hex path, the brand lime-to-green fill and stroke, and a centered white `Sx` glyph. Keep the SVG self-contained and under 5 kB.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 346 400">
  <defs>
    <linearGradient id="fill" x1="60" y1="38" x2="286" y2="362" gradientUnits="userSpaceOnUse">
      <stop stop-color="#bef264"/>
      <stop offset=".52" stop-color="#84cc16"/>
      <stop offset="1" stop-color="#16a34a"/>
    </linearGradient>
  </defs>
  <path d="M162.6 21 Q173 15 183.4 21 L322.8 101.5 Q333.2 107.5 333.2 119.5 L333.2 280.5 Q333.2 292.5 322.8 298.5 L183.4 379 Q173 385 162.6 379 L23.2 298.5 Q12.8 292.5 12.8 280.5 L12.8 119.5 Q12.8 107.5 23.2 101.5 Z" fill="url(#fill)" stroke="#ecfccb" stroke-width="8"/>
  <text x="173" y="222" fill="white" font-family="Fredoka,Arial Rounded MT Bold,Arial,sans-serif" font-size="180" font-weight="600" text-anchor="middle" dominant-baseline="middle">Sx</text>
</svg>
```

- [ ] **Step 2: Remove the large legacy ICO**

Delete `app/favicon.ico` so it cannot take precedence over the canonical App Router SVG icon.

- [ ] **Step 3: Check metadata output**

Run: `pnpm build`

Expected: the build succeeds and the route metadata includes `icon.svg`; `app/icon.svg` is under 5 kB.

---

### Task 2: Defer and simplify the homepage demo

**Files:**
- Modify: `app/catana/home/HomeTableClient.js`
- Modify: `app/catana/homeDemo/HomeDemoEffectBridge.js`
- Modify: `app/catana/__tests__/HomeDemoBoard.source.test.js`

**Interfaces:**
- Consumes: `createPiecePlacementRunner(options) -> run(payload)` and the existing `HomeDemoBoardPoster` first-paint shell.
- Produces: cached loaders `loadHomeDemoBoard`, `loadHomeDemoEffectBridge`, `loadAccountEntryModal`, and `loadIdentityModal`; boolean `isHomeDemoReady` set during browser idle.

- [ ] **Step 1: Update the focused source expectations**

Change `HomeDemoBoard.source.test.js` to require `React.lazy`, `requestIdleCallback`, and the poster fallback, and to reject `GameEffects`, `EffectsBoardWrapper`, `bgio-effects`, `Howl`, and `audioSettings` inside `HomeDemoEffectBridge.js`.

```js
expect(homeTableSource).toContain("React.lazy");
expect(homeTableSource).toContain("requestIdleCallback");
expect(source).toContain("createPiecePlacementRunner");
expect(source).not.toContain("GameEffects");
expect(source).not.toContain("EffectsBoardWrapper");
expect(source).not.toContain("bgio-effects");
expect(source).not.toContain("audioSettings");
```

- [ ] **Step 2: Verify the focused test fails**

Run: `pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js --reporter=dot`

Expected: failure because the homepage still imports the live board/effects eagerly and the bridge still wraps `GameEffects`.

- [ ] **Step 3: Add cached homepage loaders and the idle gate**

In `HomeTableClient.js`, keep `HomeDemoBoardPoster` eager and replace optional imports with cached loaders and `React.lazy` components:

```js
let homeDemoBoardPromise;
const loadHomeDemoBoard = () =>
  homeDemoBoardPromise ??= import("../homeDemo/HomeDemoBoard");
const LazyHomeDemoBoard = React.lazy(() =>
  loadHomeDemoBoard().then((module) => ({ default: module.HomeDemoBoard }))
);
```

Use the same pattern for `HomeDemoEffectBridge`, `AccountEntryModal`, and `IdentityModal`. Add a mount effect that calls all four loaders in `requestIdleCallback(..., { timeout: 1500 })`, falls back to `setTimeout(..., 1200)`, and sets `isHomeDemoReady` before rendering the live board and bridge. Wrap lazy surfaces in `React.Suspense` with `fallback={null}`; the poster stays visible until `isBoardMeasured` becomes true.

- [ ] **Step 4: Replace the full homepage effect stack with the placement runner**

In `HomeDemoEffectBridge.js`, remove `EffectsBoardWrapper`, `GameEffects`, `GameEffectsWithProvider`, provider state, `isMounted`, `effectsBus`, `boardRef`, and `audioSettings`. Memoize the direct runner:

```js
const runPlacement = useMemo(
  () => createPiecePlacementRunner({
    getLayerEl: (payload) =>
      payload?.pieceType === "road"
        ? placementRoadLayerRef.current
        : placementLayerRef.current,
    getLayout: resolveLayout,
    getTiles: () => HOME_DEMO_BOARD_PRESET.tiles,
    getPlayerColor: (playerId) => HOME_DEMO_PLAYER_COLORS[playerId] ?? "red",
    getViewerPlayerId: () => "home-blue",
    emitCue: () => {},
    useBoardSpace: true,
    themeId
  }),
  [placementLayerRef, placementRoadLayerRef, resolveLayout, themeId]
);
```

Replace `effectsBus.emit({ type: "build:place", payload })` with `runPlacement(payload)`. Keep the existing event schedule, committed-piece timing, reduced-motion path, and placement tuning unchanged. Return `null` from the bridge.

- [ ] **Step 5: Run the focused test**

Run: `pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js --reporter=dot`

Expected: pass.

---

### Task 3: Split and idle-preload the mobile drawer

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Modify: `app/catana/__tests__/MobileMetaDrawer.source.test.js`

**Interfaces:**
- Consumes: `isPhoneLayout: boolean`, `mobileActivePanel`, and `onMobileActivePanelChange` from `GameScreen`.
- Produces: `loadMobileMetaDrawer() -> Promise<module>` shared by idle preload and `React.lazy` rendering.

- [ ] **Step 1: Update the focused source expectations**

Require a dynamic import of `./MobileMetaDrawer`, require `requestIdleCallback`, and reject the static import from `LeftMetaRail.js`.

```js
expect(contents).toContain('import("./MobileMetaDrawer")');
expect(contents).toContain("requestIdleCallback");
expect(contents).not.toContain('import { MobileMetaDrawer } from "./MobileMetaDrawer"');
```

- [ ] **Step 2: Implement the cached drawer loader**

At module scope in `LeftMetaRail.js`:

```js
let mobileMetaDrawerPromise;
const loadMobileMetaDrawer = () =>
  mobileMetaDrawerPromise ??= import("./MobileMetaDrawer");
const LazyMobileMetaDrawer = React.lazy(() =>
  loadMobileMetaDrawer().then((module) => ({ default: module.MobileMetaDrawer }))
);
```

Accept `isPhoneLayout`. When it becomes true, schedule `loadMobileMetaDrawer()` in a bounded idle callback. Render `LazyMobileMetaDrawer` inside `React.Suspense` only when phone layout is active. An active panel naturally forces the same loader if it beats the idle callback.

- [ ] **Step 3: Pass the phone-layout state from the game screen**

Add `isPhoneLayout={isPhoneLayout}` to `<LeftMetaRail>`. Preserve the existing `<640` breakpoint and continue clearing `mobileMetaPanel` outside phone layout.

- [ ] **Step 4: Run the focused tests**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/MobileMetaDrawer.source.test.js app/catana/__tests__/GameScreen.mobileShell.source.test.js --reporter=dot`

Expected: pass, with Vaul still owned only by `MobileMetaDrawer.js`.

---

### Task 4: Defer optional game surfaces and preload sounds once

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/DevCardPurchaseReveal.js`
- Modify: `app/catana/effects/GameEffects.js`
- Modify: `app/catana/effects/AudioManager.js`
- Modify: `app/catana/effects/soundThemes.js`
- Modify: `app/catana/__tests__/effects/AudioManager.test.js`
- Modify existing source tests that assert static imports in `app/catana/__tests__/`

**Interfaces:**
- Consumes: the existing `effectsBus` and cue event shape `{ type: "cue", payload: { name } }`.
- Produces: `audio.preload()`, cached dynamic loaders for optional game surfaces, and reveal cues `devcard:reveal:pop` and `devcard:reveal:travel`.

- [ ] **Step 1: Add the focused AudioManager preload test**

Add a test proving `preload()` creates one Howl per unique source across `src`, `variants`, and `leadIn`, does not play audio, and is idempotent:

```js
it("preloads each unique theme source once without playing", () => {
  const audio = createAudioManager({
    bus: createEffectBus(),
    theme: {
      one: { src: "/sounds/shared.mp3" },
      two: { variants: ["/sounds/shared.mp3", "/sounds/two.mp3"] },
      three: { leadIn: { src: "/sounds/lead.mp3" }, src: "/sounds/three.mp3" }
    }
  });
  audio.preload();
  audio.preload();
  expect(Howl).toHaveBeenCalledTimes(4);
  expect(playLog).toEqual([]);
});
```

- [ ] **Step 2: Verify the focused test fails**

Run: `pnpm exec vitest run app/catana/__tests__/effects/AudioManager.test.js --reporter=dot`

Expected: failure because `audio.preload` does not exist.

- [ ] **Step 3: Implement the flat audio preload**

In `AudioManager.js`, visit every theme entry plus its `leadIn`, gather `src` and `variants`, and call the existing `getVariantHowl(src, entry)` for each. Export it on the returned manager as `preload`. The existing map provides deduplication and `destroy()` continues unloading every cached Howl.

In `GameEffects.js`, accept `preloadSounds = false`. When true, schedule `audio.preload()` in `requestIdleCallback(..., { timeout: 2000 })` or a `setTimeout(..., 1500)` fallback. Cancel the scheduled callback on unmount.

Pass `preloadSounds` from the live `GameScreen`; the simplified homepage bridge never mounts `GameEffects`.

- [ ] **Step 4: Route development-card reveal sound through the cue bus**

Add to `soundThemes.js`:

```js
"devcard:reveal:pop": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.4 },
"devcard:reveal:travel": { src: "/sounds/card_woosh.mp3", volume: 0.4 },
```

Remove the `Howl` import, refs, mount effect, and teardown from `DevCardPurchaseReveal.js`. Accept `effectsBus` and replace the two direct `.play()` calls with:

```js
effectsBus?.emit({ type: "cue", payload: { name: "devcard:reveal:pop" } });
effectsBus?.emit({ type: "cue", payload: { name: "devcard:reveal:travel" } });
```

Pass the live `effectsBus` from `GameScreen`. The effects remain scheduled at the existing GSAP timeline positions.

- [ ] **Step 5: Add cached optional-surface loaders in GameScreen**

Replace static imports for `TradeDiscardModal`, `ResignConfirmDialog`, `GameOverModal`, `PostgameOverlay`, and `DevCardPurchaseReveal` with cached loader functions and `React.lazy` wrappers. Schedule their loaders in one bounded post-mount idle callback. Wrap their existing conditional render sites in `React.Suspense` with a minimal `fallback={null}` or the already-eager game-over shell.

Do not split `MobileMatchMenu`, core HUD, settings/rules, timers, connection UI, board, or initial-placement effects.

- [ ] **Step 6: Run focused tests**

Run: `pnpm exec vitest run app/catana/__tests__/effects/AudioManager.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/GameScreen.mobileShell.source.test.js --reporter=dot`

Expected: pass.

---

### Task 5: Document and verify the completed pass

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: completed Tasks 1-4 and the audit baseline.
- Produces: final bundle/network comparison and a durable note describing the idle-loading boundaries.

- [ ] **Step 1: Run the production build once**

Run: `pnpm build`

Expected: success. Record `/` and `/g/[matchID]` first-load JS sizes and compare them with the baseline of approximately 288 kB and 464 kB respectively.

- [ ] **Step 2: Run one real-game smoke test**

Use a real local bot match at `1440x900` and `390x844`. Check the homepage poster-to-board transition, phone log/chat drawer, trade modal, dev-card reveal and sound timing, resign confirmation, and game-over/postgame surfaces. Confirm desktop startup does not request the Vaul chunk.

- [ ] **Step 3: Run one final Lighthouse/network profile**

Repeat the same throttled production Lighthouse/profile used for the baseline. Record homepage transfer, LCP, TBT, favicon size, initial sound requests, and whether optional chunks arrive only after idle.

- [ ] **Step 4: Record the result**

Add a concise entry to `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` covering the changed boundaries, final measurements, visual-parity result, and intentionally deferred caching/sprite work.

- [ ] **Step 5: Review the final diff**

Run: `git diff --check` and `git diff --stat`

Expected: no whitespace errors; only the favicon, homepage/demo, game deferred-loading/audio files, focused source tests, and agent docs are changed by this pass.
