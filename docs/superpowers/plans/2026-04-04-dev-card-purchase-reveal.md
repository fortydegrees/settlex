# Dev Card Purchase Reveal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private `buy dev` animation that squashes the dock emblem, reveals the bought card in the center of the screen, then sends it into the local player's dev-card hand area.

**Architecture:** Keep the dock responsible only for press feedback and source geometry. `GameScreen` should own one transient local reveal state keyed off the post-buy dev-card delta, and a new `DevCardPurchaseReveal` component should own the temporary dock-to-center-to-hand motion plus the private audio cues. Reuse existing assets and the resource-card travel feel instead of inventing a second animation language.

**Tech Stack:** React (JavaScript), GSAP, Howler, existing Catana dock/hand components, bgio client state, pnpm, Vitest, ESLint, browser verification

---

## File Map

- Modify: `app/catana/BuildPlacementPreview.js`
- Modify: `app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`
- Modify: `app/catana/components/ActionsDock/DockCard.js`
- Modify: `app/catana/components/ActionsDock/dockStyles.css`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/components/DevCardDisplay.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Create: `app/catana/DevCardPurchaseReveal.js`
- Create: `app/catana/utils/devCardPurchaseReveal.js`
- Create: `app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Create: `public/svgs/icon_devcard_emblem.svg`
- Reference: `public/svgs/icon_devcard.svg`
- Reference: `public/svgs/cards/development/card_devcardback.svg`
- Reference: `public/svgs/cards/development/knight.svg`
- Reference: `app/catana/effects/resourceDistribution.js`
- Reference: `app/catana/effects/soundThemes.js`

## Preconditions

- The worktree already contains an approved but uncommitted road-hover fix in:
  - `app/catana/BuildPlacementPreview.js`
  - `app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`
  - `docs/agent/PROGRESS.md`
  - `docs/agent/NOTES.md`
- Commit that fix first so the dev-card work starts from a clean diff and the history does not mix two unrelated UI changes.
- The user explicitly does not want a large new test suite for this feature. Add only narrow automated coverage for the dev-card delta helper; rely on browser verification for motion and feel.

### Task 0: Checkpoint The Existing Road Hover Fix

**Files:**
- Modify: `app/catana/BuildPlacementPreview.js`
- Modify: `app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Re-run the confirmed road-hover regression slice**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js
pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js
```

Expected: both commands pass and the worktree still contains only the known road-fix files plus the new design/plan documents.

- [ ] **Step 2: Commit only the existing road fix**

Run:
```bash
git add app/catana/BuildPlacementPreview.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "Fix road preview preload timer cleanup"
```

Expected: the branch now has a clean checkpoint for the already-approved road fix before any dev-card code is added.

### Task 1: Add A Dev-Card Delta Helper And Emblem Asset

**Files:**
- Create: `app/catana/utils/devCardPurchaseReveal.js`
- Create: `app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Create: `public/svgs/icon_devcard_emblem.svg`
- Reference: `public/svgs/icon_devcard.svg`

- [ ] **Step 1: Write the failing helper test**

Create `app/catana/__tests__/utils/devCardPurchaseReveal.test.js` with coverage for:

```js
import {
  buildDevCardCounts,
  findBoughtDevCardType,
} from "../../utils/devCardPurchaseReveal";

describe("findBoughtDevCardType", () => {
  it("returns the newly added dev card when counts increase", () => {
    expect(
      findBoughtDevCardType({
        beforeCards: ["knight", "victoryPoint"],
        afterCards: ["knight", "victoryPoint", "roadBuilding"],
      })
    ).toBe("roadBuilding");
  });

  it("handles duplicate existing card types", () => {
    expect(
      findBoughtDevCardType({
        beforeCards: ["knight", "knight"],
        afterCards: ["knight", "knight", "knight"],
      })
    ).toBe("knight");
  });

  it("returns null when no local card was added", () => {
    expect(
      findBoughtDevCardType({
        beforeCards: ["knight"],
        afterCards: ["knight"],
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/utils/devCardPurchaseReveal.test.js
```

Expected: FAIL because `app/catana/utils/devCardPurchaseReveal.js` does not exist yet.

- [ ] **Step 3: Implement the helper and add the emblem asset**

Create `app/catana/utils/devCardPurchaseReveal.js` with:

```js
export function buildDevCardCounts(cards = []) {
  return cards.reduce((counts, cardType) => {
    counts[cardType] = (counts[cardType] ?? 0) + 1;
    return counts;
  }, {});
}

export function findBoughtDevCardType({ beforeCards = [], afterCards = [] } = {}) {
  const beforeCounts = buildDevCardCounts(beforeCards);
  const afterCounts = buildDevCardCounts(afterCards);

  for (const [cardType, count] of Object.entries(afterCounts)) {
    if (count > (beforeCounts[cardType] ?? 0)) {
      return cardType;
    }
  }

  return null;
}
```

Create `public/svgs/icon_devcard_emblem.svg` by extracting the emblem artwork from `public/svgs/icon_devcard.svg` and omitting the green plus badge paths.

- [ ] **Step 4: Run the helper test and a quick asset sanity pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/utils/devCardPurchaseReveal.test.js
test -f public/svgs/icon_devcard_emblem.svg
```

Expected: the test passes and the emblem asset exists on disk.

- [ ] **Step 5: Commit the helper baseline**

Run:
```bash
git add app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js public/svgs/icon_devcard_emblem.svg
git commit -m "Add dev card reveal helper baseline"
```

### Task 2: Add Emblem-Only Dock Preload Support

**Files:**
- Modify: `app/catana/components/ActionsDock/DockCard.js`
- Modify: `app/catana/components/ActionsDock/dockStyles.css`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Reference: `public/svgs/icon_devcard_emblem.svg`

- [ ] **Step 1: Teach `DockCard.js` about an optional prelaunch-only image layer**

Extend the action shape so a card can provide:

```js
{
  img,
  fallbackImg,
  preLaunchImg,
  preLaunchFallbackImg,
}
```

Then keep the current default behavior for every existing action, but when `preLaunchImg` is provided:
- render the normal full icon for the resting state
- render a second absolute icon layer for the prelaunch phase
- apply the squash springs only to that prelaunch layer
- hide the full icon only during the short prelaunch window so the badge/box layout does not shift

- [ ] **Step 2: Add the dock-layer styles in `dockStyles.css`**

Add the minimum CSS needed for:
- a centered absolute prelaunch icon layer
- a hidden/full-icon toggle during the dev-card preload
- preserving the current box alignment for non-dev-card actions

- [ ] **Step 3: Wire the `devCard` action to use the emblem-only layer**

In `PlayerActionContainer.js`, keep the full icon as:

```js
img: getThemedSvgPath(themeId, "icon_devcard.svg")
```

but add:

```js
preLaunchImg: getThemedSvgPath(themeId, "icon_devcard_emblem.svg")
preLaunchFallbackImg: getClassicSvgPath("icon_devcard_emblem.svg")
preLaunchDelayMs: BUILD_PICKUP_PRELAUNCH_DELAY_MS
```

so only the emblem squashes before the reveal sequence starts.

- [ ] **Step 4: Run lint after the dock-layer pass**

Run:
```bash
pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/components/ActionsDock/dockStyles.css app/catana/components/PlayerActionContainer.js
```

Expected: PASS.

- [ ] **Step 5: Commit the dock preload support**

Run:
```bash
git add app/catana/components/ActionsDock/DockCard.js app/catana/components/ActionsDock/dockStyles.css app/catana/components/PlayerActionContainer.js public/svgs/icon_devcard_emblem.svg
git commit -m "Add dev card emblem preload to dock"
```

### Task 3: Wire The Dock Click, Pending Reveal State, And Hand Destination

**Files:**
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/components/DevCardDisplay.js`
- Modify: `app/catana/GameScreen.js`
- Reference: `app/catana/utils/devCardPurchaseReveal.js`

- [ ] **Step 1: Add the local reveal contract to `PlayerActionContainer.js`**

Change the `devCard` action so it no longer calls `moves.buyDevCard()` directly. Instead, route it through a small helper that:

```js
const startDevCardPurchaseReveal = ({ triggerRect, preLaunchDelayMs = 0 }) => {
  onDevCardPurchaseStart?.({
    triggerRect: copyTriggerRect(triggerRect),
    preLaunchDelayMs,
    beforeCards: [...(player.devCards ?? [])],
    playerId: player.id,
  });
  moves.buyDevCard();
};
```

Also set `preLaunchDelayMs: BUILD_PICKUP_PRELAUNCH_DELAY_MS` on the `devCard` dock action so the same short preload timing is available.

- [ ] **Step 2: Expose the real destination rect from `DevCardDisplay.js`**

Update `DevCardDisplay` to accept a forwarded ref or root `containerRef`, then apply it to the outer `.devcard-box` wrapper so `GameScreen` can read the real hand-area rect.

- [ ] **Step 3: Add transient pending-reveal state in `GameScreen.js`**

Add:

```js
const [pendingDevCardReveal, setPendingDevCardReveal] = useState(null);
const devCardDisplayRef = useRef(null);
```

Then pass:

```js
<PlayerActionContainer
  ...
  onDevCardPurchaseStart={setPendingDevCardReveal}
  devCardDisplayRef={devCardDisplayRef}
/>
```

- [ ] **Step 4: Detect the bought dev card from the local state delta**

Add an effect in `GameScreen.js` that watches `player?.devCards` and `pendingDevCardReveal`, then:

```js
const boughtCardType = findBoughtDevCardType({
  beforeCards: pendingDevCardReveal.beforeCards,
  afterCards: player.devCards,
});
```

When `boughtCardType` is found, upgrade `pendingDevCardReveal` into an active reveal payload that includes:
- `cardType`
- `triggerRect`
- `destinationRect`
- `launchDelayMs`

If the move does not resolve into a visible new card after a short guard window, clear the pending reveal quietly.

- [ ] **Step 5: Run lint and the helper test after the wiring pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/utils/devCardPurchaseReveal.test.js
pnpm exec eslint app/catana/components/PlayerActionContainer.js app/catana/components/DevCardDisplay.js app/catana/GameScreen.js app/catana/utils/devCardPurchaseReveal.js
```

Expected: both commands pass.

- [ ] **Step 6: Commit the wiring**

Run:
```bash
git add app/catana/components/PlayerActionContainer.js app/catana/components/DevCardDisplay.js app/catana/GameScreen.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js
git commit -m "Wire local dev card purchase reveal state"
```

### Task 4: Build The Private Reveal Component

**Files:**
- Create: `app/catana/DevCardPurchaseReveal.js`
- Modify: `app/catana/GameScreen.js`
- Reference: `public/svgs/icon_devcard_emblem.svg`
- Reference: `public/svgs/cards/development/card_devcardback.svg`
- Reference: `app/catana/components/DevCardDisplay.js`

- [ ] **Step 1: Create `DevCardPurchaseReveal.js` with one temporary card actor**

Build a single component that accepts:

```js
{
  active,
  triggerRect,
  destinationRect,
  cardType,
  launchDelayMs,
  onComplete,
}
```

and renders one temporary absolutely positioned element above the game UI.

- [ ] **Step 2: Implement the dock-to-center motion and back build-out**

Use GSAP to:
- wait for `launchDelayMs`
- start with the emblem-only asset at the dock rect center
- move it to the center of the viewport in about `220ms` with no overshoot
- fade/scale the dev-card back in behind it during the last part of that move

- [ ] **Step 3: Implement the face flip, hold, and cleanup-safe timeline**

Use a simple 3D flip or front/back cross-rotation:
- back visible first
- rotate to the real card face SVG
- hold the face for about `300ms`
- ensure every tween/timeline is killed on unmount or cancel
- respect reduced motion by shortening the sequence and simplifying the flip

- [ ] **Step 4: Integrate the reveal component into `GameScreen.js`**

Render it near the top-level fixed UI so it is independent of board pan/zoom:

```jsx
<DevCardPurchaseReveal
  active={activeDevCardReveal}
  onComplete={() => setPendingDevCardReveal(null)}
/>
```

Keep the reveal private by deriving it only from the local player's visible `player.devCards`.

- [ ] **Step 5: Run lint after adding the new component**

Run:
```bash
pnpm exec eslint app/catana/DevCardPurchaseReveal.js app/catana/GameScreen.js
```

Expected: PASS.

- [ ] **Step 6: Commit the reveal component**

Run:
```bash
git add app/catana/DevCardPurchaseReveal.js app/catana/GameScreen.js
git commit -m "Add private dev card purchase reveal"
```

### Task 5: Add The Send-To-Hand Leg And Audio

**Files:**
- Modify: `app/catana/DevCardPurchaseReveal.js`
- Reference: `app/catana/effects/resourceDistribution.js`
- Reference: `app/catana/effects/soundThemes.js`

- [ ] **Step 1: Reuse the resource-card travel feel for the final flight**

Match the resource-card send feel from `app/catana/effects/resourceDistribution.js`:
- use a similar `power2.out` travel easing
- fly to the real `DevCardDisplay` rect
- end at a believable card scale for the hand area

- [ ] **Step 2: Add local audio cues without routing through the public effect bus**

Inside `DevCardPurchaseReveal.js`, use `Howl` with the existing sound files:

```js
new Howl({ src: ["/sounds/ui-pop-resource-out.mp3"], volume: 0.4 })
new Howl({ src: ["/sounds/card_woosh.mp3"], volume: 0.4 })
```

Play the pop cue when the center reveal resolves and the woosh when the card starts traveling to the hand. Let global `Howler` mute state keep those sounds silent when audio is muted.

- [ ] **Step 3: Verify cleanup for cancellation and failed buys**

Make sure the reveal:
- never starts if no `cardType` was detected
- clears itself on `onComplete`
- stops all timelines and removes any temporary state when the component unmounts

- [ ] **Step 4: Run lint after the audio/travel pass**

Run:
```bash
pnpm exec eslint app/catana/DevCardPurchaseReveal.js
```

Expected: PASS.

- [ ] **Step 5: Commit the final reveal polish**

Run:
```bash
git add app/catana/DevCardPurchaseReveal.js
git commit -m "Polish dev card reveal travel and audio"
```

### Task 6: Browser Verification And Agent Docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Run the narrow automated slice one more time**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/utils/devCardPurchaseReveal.test.js
pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/components/ActionsDock/dockStyles.css app/catana/components/PlayerActionContainer.js app/catana/components/DevCardDisplay.js app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/utils/devCardPurchaseReveal.js
```

Expected: PASS.

- [ ] **Step 2: Verify the full interaction in the browser**

Run:
```bash
pnpm serve
pnpm dev
```

Manual checks:
- click `buy dev`
- only the emblem squashes in the dock
- the emblem detaches from the dock and reaches center
- the card back grows around it
- the card flips to the correct bought card for the local player
- the card holds briefly, then travels into the real dev-card hand area
- the green plus badge never appears in the detached reveal
- failed/illegal clicks do not leave stray UI

- [ ] **Step 3: Update the agent notes**

Add the final implementation notes and verification evidence to:
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

- [ ] **Step 4: Commit the docs and final verification state**

Run:
```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "Document dev card purchase reveal"
```
