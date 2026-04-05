# Dev Card Purchase Reveal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current hand-diff-based `buy dev` reveal with an authoritative effect-driven buyer-only reveal that freezes the local dev-card dock and local VP badge until the revealed card lands.

**Architecture:** Make the move layer publish the exact bought `cardType` through a new `buyDevCardReveal` effect, following the same broad pattern as resource-distribution effects. Keep geometry and presentation timing local to `GameScreen`: capture the dock click rect and pre-buy display snapshots on click, start the reveal only when the authoritative effect arrives for the local player, and release the frozen dock hand and VP badge together on reveal completion.

**Tech Stack:** boardgame.io, bgio-effects, React (JavaScript), TypeScript game-core rules, Vitest, ESLint, pnpm

---

## File Structure

### Core rule / move contract

- Modify: `game-core/src/rules/devCards.ts`
  - Return the bought `cardType` from `buyDevCard(...)` on success.
- Modify: `game-core/src/rules/devCards.test.ts`
  - Lock the new return contract and ensure state mutation still matches existing rules.
- Modify: `app/catana/Moves.js`
  - Emit `effects.buyDevCardReveal({ playerId, cardType })` after a successful buy.
- Modify: `app/catana/__tests__/Moves.devCards.test.js`
  - Cover the move-level effect emission and non-emission on failure.
- Modify: `app/catana/__tests__/Moves.gameLog.test.js`
  - Keep the existing `dev:buy` log behavior intact while the new effect is added.

### Effect-bus wiring

- Modify: `app/catana/Game.js`
  - Register `buyDevCardReveal` in the configured `EffectsPlugin(...)`.
- Modify: `app/catana/effects/GameEffects.js`
  - Listen for the new effect and forward it into the local effect bus.
- Modify: `app/catana/effects/registry.js`
  - Register a `devCardReveal` handler channel.
- Modify: `app/catana/__tests__/effects/GameEffects.test.js`
  - Add source-level coverage for the new effect listener and bus event.
- Modify: `app/catana/__tests__/effects/registry.test.js`
  - Add coverage for the new registry channel.

### Local buyer-only reveal state

- Modify: `app/catana/components/PlayerActionContainer.js`
  - Capture pre-buy local hand snapshot, pre-buy VP snapshot, and trigger rect before calling `moves.buyDevCard()`.
- Modify: `app/catana/GameScreen.js`
  - Replace hand-diff reveal startup with effect-driven startup.
  - Own pending local trigger snapshot, active reveal payload, and frozen local display state.
- Modify: `app/catana/DevCardPurchaseReveal.js`
  - Consume the authoritative `cardType` from the active reveal payload only.
- Modify: `app/catana/components/DevCardDisplay.js`
  - Continue rendering whichever hand snapshot is passed in; no layout redesign.
- Modify: `app/catana/components/PlayerAvatarStats.js`
  - Accept a frozen/local override for the buyer’s VP display inputs.
- Modify: `app/catana/components/PlayerAvatarStatsUtils.js`
  - If needed, expose a small helper contract for frozen vs live VP display inputs.
- Modify: `app/catana/utils/devCardPurchaseReveal.js`
  - Remove the old bought-card diff helper and keep only timing / display helpers that still matter.
- Modify: `app/catana/__tests__/playerAvatarStats.test.js`
  - Add coverage for the frozen buyer VP display path if a helper is introduced.
- Create: `app/catana/__tests__/GameScreen.devCardReveal.test.js`
  - Source-level wiring checks for pending trigger snapshot, buyer-only effect gating, frozen dock state, and frozen VP release.
- Modify: `app/catana/__tests__/DevCardPurchaseReveal.source.test.js`
  - Ensure the reveal now trusts `reveal.cardType` directly and no longer relies on hand diffing.
- Modify: `app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - Replace the old diff-helper assertions with tests for any remaining reveal utility helpers.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- The reveal remains buyer-only as a presentation rule, not as an engine secrecy rule.
- The buyer’s underlying game state and score update immediately; only local presentation is delayed.
- Opponents do not wait for the buyer’s reveal and do not see the face.
- A bought `victoryPoint` may still trigger immediate game-over logic; this slice only delays the local hand / VP badge presentation.
- Do not touch the ad-hoc scenario files in `app/catana/scenarios/` as part of this implementation.

### Task 1: Make `buyDevCard` return and emit the authoritative reveal payload

**Files:**
- Modify: `game-core/src/rules/devCards.ts`
- Modify: `game-core/src/rules/devCards.test.ts`
- Modify: `app/catana/Moves.js`
- Modify: `app/catana/__tests__/Moves.devCards.test.js`

- [ ] **Step 1: Write the failing core rule test**

Extend `game-core/src/rules/devCards.test.ts` with a purchase assertion like:

```ts
it("returns the bought dev card type on success", () => {
  const state = createEmptyState(["0"]);
  state.devDeck = ["knight"];
  state.playerStateById["0"].resources = [
    ResourceType.SHEEP,
    ResourceType.WHEAT,
    ResourceType.ORE
  ];

  expect(buyDevCard(state, "0")).toEqual({
    ok: true,
    cardType: "knight"
  });
});
```

- [ ] **Step 2: Run the core rule test to verify RED**

Run:
```bash
pnpm -C game-core test -- --run src/rules/devCards.test.ts
```

Expected: FAIL because `buyDevCard(...)` still returns only `{ ok: true }`.

- [ ] **Step 3: Write the failing move-level effect test**

Extend `app/catana/__tests__/Moves.devCards.test.js` with a move test like:

```js
it("emits buyDevCardReveal with the authoritative card type", () => {
  const state = createEmptyState(["0"]);
  state.devDeck = ["monopoly"];
  state.playerStateById["0"].resources = ["Sheep", "Wheat", "Ore"];
  const effects = { buyDevCardReveal: vi.fn() };
  const context = {
    G: { core: state, gameLog: [], gameLogSeq: 0 },
    playerID: "0",
    ctx: { currentPlayer: "0", turn: 1 },
    effects
  };

  buyDevCard.move(context);

  expect(effects.buyDevCardReveal).toHaveBeenCalledWith({
    playerId: "0",
    cardType: "monopoly"
  });
});
```

- [ ] **Step 4: Run the move test to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js
```

Expected: FAIL because `buyDevCard.move(...)` does not emit the effect yet.

- [ ] **Step 5: Implement the minimal core and move changes**

Implement:
- `game-core/src/rules/devCards.ts`
  - change successful return to `{ ok: true, cardType: card }`
- `app/catana/Moves.js`
  - capture the returned `cardType`
  - emit `effects?.buyDevCardReveal?.({ playerId, cardType })`
  - keep the existing `dev:buy` log behavior unchanged

- [ ] **Step 6: Run focused tests to verify GREEN**

Run:
```bash
pnpm -C game-core test -- --run src/rules/devCards.test.ts
pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit the authoritative payload baseline**

```bash
git add game-core/src/rules/devCards.ts game-core/src/rules/devCards.test.ts app/catana/Moves.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js
git commit -m "feat: emit authoritative buy dev reveal payload"
```

### Task 2: Wire the new reveal effect through the Catana effect bus

**Files:**
- Modify: `app/catana/Game.js`
- Modify: `app/catana/effects/GameEffects.js`
- Modify: `app/catana/effects/registry.js`
- Modify: `app/catana/__tests__/effects/GameEffects.test.js`
- Modify: `app/catana/__tests__/effects/registry.test.js`

- [ ] **Step 8: Write the failing registry and listener tests**

Add failing coverage for:
- `registerEffects(...)` wiring `devCardReveal` to `"devcard:reveal"`
- `GameEffects.js` containing a `useEffectListener("buyDevCardReveal", ...)` path that emits `"devcard:reveal"`

Use source-level expectations like:

```js
expect(source).toContain("buyDevCardReveal");
expect(source).toContain("devcard:reveal");
expect(bus.on).toHaveBeenCalledWith("devcard:reveal", handler);
```

- [ ] **Step 9: Run the effect tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js
```

Expected: FAIL because the new effect channel does not exist yet.

- [ ] **Step 10: Implement the minimal effect-bus wiring**

Implement:
- `app/catana/Game.js`
  - add `buyDevCardReveal` to the `EffectsPlugin(...)` config
- `app/catana/effects/GameEffects.js`
  - forward the new effect into `bus.emit({ type: "devcard:reveal", payload })`
- `app/catana/effects/registry.js`
  - register the `devCardReveal` handler

- [ ] **Step 11: Run the effect tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js
```

Expected: PASS.

- [ ] **Step 12: Commit the effect-bus wiring**

```bash
git add app/catana/Game.js app/catana/effects/GameEffects.js app/catana/effects/registry.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js
git commit -m "feat: wire buy dev reveal through effects bus"
```

### Task 3: Replace hand-diff startup with buyer-only frozen hand and VP presentation

**Files:**
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/DevCardPurchaseReveal.js`
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/PlayerAvatarStatsUtils.js`
- Modify: `app/catana/utils/devCardPurchaseReveal.js`
- Modify: `app/catana/components/DevCardDisplay.js`
- Create: `app/catana/__tests__/GameScreen.devCardReveal.test.js`
- Modify: `app/catana/__tests__/playerAvatarStats.test.js`
- Modify: `app/catana/__tests__/DevCardPurchaseReveal.source.test.js`
- Modify: `app/catana/__tests__/utils/devCardPurchaseReveal.test.js`

- [ ] **Step 13: Write the failing buyer-only freeze tests**

Add coverage for these behaviors:
- `PlayerActionContainer` captures `triggerRect`, pre-buy dev-card hand, and pre-buy VP display inputs before calling `moves.buyDevCard()`
- `GameScreen` no longer calls `findBoughtDevCardType(...)`
- `GameScreen` starts the reveal from the authoritative effect payload only when `playerId` matches the local player
- while reveal is active, the local dock renders the pre-buy hand
- while reveal is active, the local VP badge renders the pre-buy display values
- reveal completion releases both together

Use source-level assertions if needed, for example:

```js
expect(source).toContain("buyDevCardReveal");
expect(source).not.toContain("findBoughtDevCardType");
expect(source).toContain("frozenVp");
expect(source).toContain("onComplete");
```

- [ ] **Step 14: Run the UI tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js
```

Expected: FAIL because the current implementation still starts from local hand diff and has no frozen VP path.

- [ ] **Step 15: Implement the minimal buyer-only freeze flow**

Implement:
- `PlayerActionContainer.js`
  - capture a pending local snapshot containing:
    - `triggerRect`
    - `preLaunchDelayMs`
    - `beforeCards`
    - frozen buyer VP display inputs
    - `startedAtMs`
- `GameScreen.js`
  - remove the hand-diff startup effect
  - listen for `buyDevCardReveal` buyer-only effect events
  - start `activeDevCardReveal` from the authoritative `cardType`
  - derive `displayPlayer.devCards` from the frozen snapshot while reveal is pending/active
  - pass frozen VP display inputs into `PlayerAvatarStats` for the local seat only while reveal is pending/active
- `PlayerAvatarStats.js` / `PlayerAvatarStatsUtils.js`
  - support an optional local frozen VP display override
- `DevCardPurchaseReveal.js`
  - trust `reveal.cardType` directly; no bought-card derivation logic
- `utils/devCardPurchaseReveal.js`
  - delete the old count-diff helper and keep only utility code still used after the refactor

- [ ] **Step 16: Run focused tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js
pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js
pnpm exec eslint app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/components/PlayerAvatarStats.js app/catana/components/PlayerAvatarStatsUtils.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js
```

Expected: PASS, with only any pre-existing warning-only lint noise called out explicitly if it remains.

- [ ] **Step 17: Manually verify the buyer-only reveal**

Run the app flow and verify:
- buying a non-VP dev card reveals the correct face and the dock updates only on landing
- buying a VP dev card keeps the local VP badge unchanged until landing
- opponents do not see the face reveal
- illegal buys do not leave stale pending or frozen UI state

- [ ] **Step 18: Update docs and commit the feature**

Update:
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

Then commit:

```bash
git add app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/components/PlayerAvatarStats.js app/catana/components/PlayerAvatarStatsUtils.js app/catana/components/DevCardDisplay.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "feat: freeze buy dev reveal until landing"
```

## Final Verification

- [ ] **Step 19: Run the full focused verification slice**

Run:
```bash
pnpm -C game-core test -- --run src/rules/devCards.test.ts
pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js
pnpm exec eslint app/catana/Moves.js app/catana/Game.js app/catana/effects/GameEffects.js app/catana/effects/registry.js app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/components/PlayerAvatarStats.js app/catana/components/PlayerAvatarStatsUtils.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js
```

Expected:
- all targeted tests pass
- ESLint passes or reports only pre-existing warning-only issues that are explicitly documented before completion
