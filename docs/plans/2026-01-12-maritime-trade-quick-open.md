# Maritime Trade Quick Open Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow clicking a tradable resource in the player resource bar to open the maritime trade modal with the give amount pre-selected to the correct rate, only when the player can trade, and remove the debug click behavior.

**Architecture:** UI-only changes. PlayerActionContainer handles click gating (phase/stage + canMaritimeTrade) and per-resource tradability using `bestTradeRate`. GameScreen carries an optional preset resource into TradeDiscardModal, which pre-selects the give count to the trade rate. No engine changes.

**Tech Stack:** React (Next.js), boardgame.io, @settlex/game-core helpers (bestTradeRate/canMaritimeTrade), Vitest for small UI utility tests.

### Task 1: Add helper + unit test for per-resource tradability

**Files:**
- Create: `app/catana/utils/trade.js`
- Create: `app/catana/__tests__/tradeQuickOpen.test.js`

**Step 1: Write the failing test**

```javascript
import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { getMaritimeTradeRateIfTradable } from "../utils/trade";

describe("getMaritimeTradeRateIfTradable", () => {
  it("returns the best trade rate when the player has enough resources", () => {
    const core = {
      ruleset: { tradeRates: { bank: 4, genericPort: 3, specificPort: 2 } },
      buildingsByNodeId: { 1: { ownerId: "p1" } }
    };
    const coreTopology = { portsByNodeId: { "1": ResourceType.BRICK } };
    const playerResources = [ResourceType.BRICK, ResourceType.BRICK];

    const rate = getMaritimeTradeRateIfTradable({
      core,
      coreTopology,
      playerId: "p1",
      resource: ResourceType.BRICK,
      playerResources
    });

    expect(rate).toBe(2);
  });

  it("returns null when the player lacks resources", () => {
    const core = {
      ruleset: { tradeRates: { bank: 4, genericPort: 3, specificPort: 2 } },
      buildingsByNodeId: { 1: { ownerId: "p1" } }
    };
    const coreTopology = { portsByNodeId: { "1": ResourceType.BRICK } };
    const playerResources = [ResourceType.BRICK];

    const rate = getMaritimeTradeRateIfTradable({
      core,
      coreTopology,
      playerId: "p1",
      resource: ResourceType.BRICK,
      playerResources
    });

    expect(rate).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest app/catana/__tests__/tradeQuickOpen.test.js`
Expected: FAIL with "getMaritimeTradeRateIfTradable is not a function" or module not found

**Step 3: Write minimal implementation**

```javascript
import { bestTradeRate } from "@settlex/game-core";

export const getMaritimeTradeRateIfTradable = ({
  core,
  coreTopology,
  playerId,
  resource,
  playerResources
}) => {
  if (!core || !coreTopology) return null;
  const rate = bestTradeRate(core, coreTopology, playerId, resource);
  const count = playerResources.filter((r) => r === resource).length;
  return count >= rate ? rate : null;
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest app/catana/__tests__/tradeQuickOpen.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/utils/trade.js app/catana/__tests__/tradeQuickOpen.test.js
git commit -m "test: add maritime trade preset helper"
```

### Task 2: Wire quick-open from resource bar + preset trade modal

**Files:**
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/TradeDiscardModal.js`

**Step 1: Write the failing test**

Manual check (UI): clicking a tradable resource should open the trade modal and pre-select the correct give amount.

**Step 2: Run test to verify it fails**

Run: `pnpm dev`
Expected: Clicking a resource does nothing or triggers debug add.

**Step 3: Write minimal implementation**

- Replace `DEBUG_takeCardsFromBank` click with a new handler.
- Gate click using the same trade-available checks (current player, postRoll/main, `canMaritimeTrade`).
- If resource is tradable (helper returns a rate), call `onTradeClick(resource)`.
- In `GameScreen`, add `tradePresetResource` state, pass to `TradeDiscardModal`, and clear it on cancel/confirm.
- In `TradeDiscardModal`, accept `tradePresetResource` prop and pre-select the give amount to the rate when provided.

**Step 4: Run test to verify it passes**

Run: `pnpm dev`
Expected: Clicking a tradable resource opens trade modal with give pre-selected; clicking non-tradable resource does nothing; Trade button still works normally.

**Step 5: Commit**

```bash
git add app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js app/catana/components/TradeDiscardModal.js
git commit -m "feat: quick-open maritime trade from resource bar"
```

### Task 3: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Note change summary + testing**

Add brief notes about the quick-open trade behavior and how it was tested.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: log maritime trade quick-open change"
```
