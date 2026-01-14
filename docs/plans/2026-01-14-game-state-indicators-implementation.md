# Game State Indicators Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add visual turn indicators (gold glow + chevron) and status bubbles to show whose turn it is and what action is expected.

**Architecture:** A `getGameStatus()` utility derives semantic status from game state. UI components consume this to render turn glow, chevron, status bubble icons, and optional text. CSS handles animations.

**Tech Stack:** React, Vitest, Tailwind CSS, existing boardgame.io integration

---

## Task 1: Create getGameStatus Utility

**Files:**
- Create: `app/catana/utils/gameStatus.js`
- Create: `app/catana/__tests__/gameStatus.test.js`

### Step 1: Write the failing tests

```javascript
// app/catana/__tests__/gameStatus.test.js
import { describe, expect, it } from "vitest";
import { getGameStatus, STATUS_TYPES } from "../utils/gameStatus";

describe("getGameStatus", () => {
  const baseCoreState = {
    phase: "normal",
    turn: {
      phase: "preRoll",
      currentPlayerId: "0",
      pendingDiscards: [],
    },
    players: ["0", "1"],
  };

  const baseCtx = {
    phase: "main",
    currentPlayer: "0",
    activePlayers: { "0": "preRoll" },
  };

  describe("rolling status", () => {
    it("returns rolling status when in preRoll stage", () => {
      const status = getGameStatus(baseCoreState, baseCtx);
      expect(status.statusType).toBe(STATUS_TYPES.ROLLING);
      expect(status.text).toBe("Roll Dice");
      expect(status.activePlayerId).toBe("0");
    });
  });

  describe("thinking status", () => {
    it("returns thinking status when in postRoll stage", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.THINKING);
      expect(status.text).toBe("Your Turn");
    });
  });

  describe("robber statuses", () => {
    it("returns moving_robber status when in robberMove phase", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "robberMove" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "moveRobber" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.MOVING_ROBBER);
      expect(status.text).toBe("Move Robber");
    });

    it("returns stealing status when in robberSteal phase", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "robberSteal" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "stealResource" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.STEALING);
      expect(status.text).toBe("Choose Player");
    });

    it("returns discarding status when in robberDiscard phase", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "robberDiscard", pendingDiscards: ["0"] } };
      const ctx = { ...baseCtx, activePlayers: { "0": "robberDiscard" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.DISCARDING);
      expect(status.text).toBe("Discard Cards");
    });
  });

  describe("placement phase statuses", () => {
    it("returns placing_settlement during placement phase", () => {
      const core = { ...baseCoreState, phase: "placement" };
      const ctx = { ...baseCtx, phase: "placement" };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_SETTLEMENT);
      expect(status.text).toBe("Place Settlement");
    });
  });

  describe("build action statuses", () => {
    it("returns placing_road when playerAction is placeRoad", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "placeRoad");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_ROAD);
      expect(status.text).toBe("Place Road");
    });

    it("returns placing_settlement when playerAction is placeSettlement", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "placeSettlement");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_SETTLEMENT);
      expect(status.text).toBe("Place Settlement");
    });

    it("returns placing_city when playerAction is placeCity", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "placeCity");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_CITY);
      expect(status.text).toBe("Place City");
    });

    it("returns placing_road when playerAction is roadBuilding", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "roadBuilding");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_ROAD);
      expect(status.text).toBe("Place Road");
    });
  });
});
```

### Step 2: Run tests to verify they fail

Run: `cd /Users/david/coding/settlex && pnpm vitest run app/catana/__tests__/gameStatus.test.js`

Expected: FAIL - module not found

### Step 3: Write the implementation

```javascript
// app/catana/utils/gameStatus.js

export const STATUS_TYPES = {
  ROLLING: "rolling",
  THINKING: "thinking",
  MOVING_ROBBER: "moving_robber",
  STEALING: "stealing",
  DISCARDING: "discarding",
  PLACING_SETTLEMENT: "placing_settlement",
  PLACING_ROAD: "placing_road",
  PLACING_CITY: "placing_city",
};

/**
 * Derives the current game status from state.
 * @param {object} core - The core game state (G.core)
 * @param {object} ctx - The boardgame.io context
 * @param {string|null} playerAction - UI-level action like 'placeRoad'
 * @returns {{ text: string, statusType: string, activePlayerId: string }}
 */
export function getGameStatus(core, ctx, playerAction = null) {
  const activePlayerId = core.turn.currentPlayerId;

  // UI-level build actions take priority
  if (playerAction === "placeRoad" || playerAction === "roadBuilding") {
    return {
      text: "Place Road",
      statusType: STATUS_TYPES.PLACING_ROAD,
      activePlayerId,
    };
  }

  if (playerAction === "placeSettlement") {
    return {
      text: "Place Settlement",
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    };
  }

  if (playerAction === "placeCity") {
    return {
      text: "Place City",
      statusType: STATUS_TYPES.PLACING_CITY,
      activePlayerId,
    };
  }

  // Placement phase
  if (core.phase === "placement") {
    // During placement, players alternate settlement/road
    // For simplicity, check if there's a pending road
    const hasPendingRoad = core.pendingRoadFromNodeIdByPlayer?.[activePlayerId] != null;
    if (hasPendingRoad) {
      return {
        text: "Place Road",
        statusType: STATUS_TYPES.PLACING_ROAD,
        activePlayerId,
      };
    }
    return {
      text: "Place Settlement",
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    };
  }

  // Robber phases
  if (core.turn.phase === "robberDiscard") {
    return {
      text: "Discard Cards",
      statusType: STATUS_TYPES.DISCARDING,
      activePlayerId,
    };
  }

  if (core.turn.phase === "robberMove") {
    return {
      text: "Move Robber",
      statusType: STATUS_TYPES.MOVING_ROBBER,
      activePlayerId,
    };
  }

  if (core.turn.phase === "robberSteal") {
    return {
      text: "Choose Player",
      statusType: STATUS_TYPES.STEALING,
      activePlayerId,
    };
  }

  // Pre-roll
  if (core.turn.phase === "preRoll") {
    return {
      text: "Roll Dice",
      statusType: STATUS_TYPES.ROLLING,
      activePlayerId,
    };
  }

  // Post-roll (default main phase)
  return {
    text: "Your Turn",
    statusType: STATUS_TYPES.THINKING,
    activePlayerId,
  };
}
```

### Step 4: Run tests to verify they pass

Run: `cd /Users/david/coding/settlex && pnpm vitest run app/catana/__tests__/gameStatus.test.js`

Expected: All tests PASS

### Step 5: Commit

```bash
git add app/catana/utils/gameStatus.js app/catana/__tests__/gameStatus.test.js
git commit -m "feat: add getGameStatus utility for deriving game status"
```

---

## Task 2: Add Turn Indicator Styles

**Files:**
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/OpponentPlayerBox.js`

### Step 1: Update PlayerAvatarStats to accept isActive prop

```javascript
// app/catana/components/PlayerAvatarStats.js
// Add isActive prop and gold glow styling

export const PlayerAvatarStats = ({ player, core, coreTopology, isMe, isActive }) => {
  if (!player) return null;

  const avatarColor = `from-${player.color}-500 to-${player.color}-800`;
  // ... existing code for road/army stats ...

  const activeGlow = isActive
    ? "shadow-[0_0_12px_3px_rgba(251,191,36,0.6)]"
    : "";

  return (
    <>
      <span className="flex relative">
        {/* Chevron indicator */}
        {isActive && (
          <span className="absolute left-1/2 -translate-x-1/2 -top-4 text-amber-400 text-xl">
            ▼
          </span>
        )}
        <div
          className={`h-20 w-20 rounded-md bg-gradient-to-t ring-4 ring-white flex justify-center items-center text-6xl ${avatarColor} ${activeGlow} transition-shadow duration-300`}
        >
          🤠
        </div>
        {/* ... VP badge unchanged ... */}
      </span>
      {/* ... stats section unchanged ... */}
    </>
  );
};
```

### Step 2: Update OpponentPlayerBox to pass isActive

```javascript
// app/catana/components/OpponentPlayerBox.js
// Add isActive prop

export const OpponentPlayerBox = ({ player, core, coreTopology, isActive }) => {
  if (!player) return null;

  // ... existing code ...

  return (
    <div className="flex items-center">
      <PlayerAvatarStats
        player={player}
        core={core}
        coreTopology={coreTopology}
        isMe={false}
        isActive={isActive}
      />
      {/* ... rest unchanged ... */}
    </div>
  );
};
```

### Step 3: Manually verify in browser

Run: `cd /Users/david/coding/settlex && pnpm dev`

Open game, verify gold glow appears on active player's avatar.

### Step 4: Commit

```bash
git add app/catana/components/PlayerAvatarStats.js app/catana/components/OpponentPlayerBox.js
git commit -m "feat: add gold glow and chevron for active turn indicator"
```

---

## Task 3: Wire Up Turn Indicators in GameScreen

**Files:**
- Modify: `app/catana/GameScreen.js`

### Step 1: Import getGameStatus and pass isActive to components

In GameScreen.js, after existing imports add:

```javascript
import { getGameStatus } from "./utils/gameStatus";
```

Then in the component body, compute the status:

```javascript
const gameStatus = getGameStatus(bgioProps.G.core, bgioProps.ctx, playerAction);
```

Update the OpponentPlayerBox rendering to pass isActive:

```javascript
{Object.values(playerViewMap)
  .filter((p) => p.id !== playerID)
  .map((opponent) => (
    <OpponentPlayerBox
      key={opponent.id}
      player={opponent}
      core={bgioProps.G.core}
      coreTopology={bgioProps.G.coreTopology}
      isActive={gameStatus.activePlayerId === opponent.id}
    />
  ))}
```

Update PlayerActionContainer (or PlayerAvatarStats within it) to receive isActive:

```javascript
<PlayerAvatarStats
  player={player}
  core={G.core}
  coreTopology={G.coreTopology}
  isMe={isMe}
  isActive={gameStatus.activePlayerId === player.id}
/>
```

### Step 2: Manually verify in browser

Verify chevron and glow appear on the correct player during their turn.

### Step 3: Commit

```bash
git add app/catana/GameScreen.js
git commit -m "feat: wire up turn indicators using getGameStatus"
```

---

## Task 4: Add Status Bubble Component

**Files:**
- Create: `app/catana/components/StatusBubble.js`
- Create: `app/catana/components/StatusBubble.css`

### Step 1: Create the StatusBubble component

```javascript
// app/catana/components/StatusBubble.js
import React from "react";
import { STATUS_TYPES } from "../utils/gameStatus";
import "./StatusBubble.css";

const STATUS_ICONS = {
  [STATUS_TYPES.ROLLING]: "🎲",
  [STATUS_TYPES.THINKING]: "🤔",
  [STATUS_TYPES.MOVING_ROBBER]: "🦹",
  [STATUS_TYPES.STEALING]: "🤚",
  [STATUS_TYPES.DISCARDING]: "📤",
  [STATUS_TYPES.PLACING_SETTLEMENT]: "🏠",
  [STATUS_TYPES.PLACING_ROAD]: "🛤️",
  [STATUS_TYPES.PLACING_CITY]: "🏰",
};

export const StatusBubble = ({ statusType, isVisible }) => {
  const icon = STATUS_ICONS[statusType] || "❓";

  return (
    <div
      className={`status-bubble ${isVisible ? "status-bubble--visible" : "status-bubble--hidden"}`}
    >
      {icon}
    </div>
  );
};
```

### Step 2: Create the CSS with transitions

```css
/* app/catana/components/StatusBubble.css */
.status-bubble {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 28px;
  background: rgba(251, 191, 36, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: opacity 150ms ease, transform 200ms ease;
  z-index: 10;
}

.status-bubble--visible {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.status-bubble--hidden {
  opacity: 0;
  transform: translateX(-50%) scale(0);
}
```

### Step 3: Commit

```bash
git add app/catana/components/StatusBubble.js app/catana/components/StatusBubble.css
git commit -m "feat: add StatusBubble component with transition animations"
```

---

## Task 5: Integrate StatusBubble into PlayerAvatarStats

**Files:**
- Modify: `app/catana/components/PlayerAvatarStats.js`

### Step 1: Add StatusBubble to avatar

```javascript
// Add import at top
import { StatusBubble } from "./StatusBubble";

// Update the component to accept statusType prop
export const PlayerAvatarStats = ({ player, core, coreTopology, isMe, isActive, statusType }) => {
  // ... existing code ...

  return (
    <>
      <span className="flex relative">
        {/* Chevron indicator */}
        {isActive && (
          <span className="absolute left-1/2 -translate-x-1/2 -top-4 text-amber-400 text-xl">
            ▼
          </span>
        )}
        <div
          className={`h-20 w-20 rounded-md bg-gradient-to-t ring-4 ring-white flex justify-center items-center text-6xl ${avatarColor} ${activeGlow} transition-shadow duration-300`}
        >
          🤠
        </div>
        {/* Status bubble */}
        <StatusBubble statusType={statusType} isVisible={isActive} />
        {/* VP badge unchanged */}
        <span className="absolute right-0 top-0 ...">
          {vpDisplay}
        </span>
      </span>
      {/* ... rest unchanged ... */}
    </>
  );
};
```

### Step 2: Update call sites to pass statusType

In GameScreen.js and OpponentPlayerBox.js, pass `statusType={gameStatus.statusType}` to PlayerAvatarStats.

### Step 3: Manually verify in browser

Verify status bubble appears with correct icon below active player's avatar.

### Step 4: Commit

```bash
git add app/catana/components/PlayerAvatarStats.js app/catana/GameScreen.js app/catana/components/OpponentPlayerBox.js
git commit -m "feat: integrate StatusBubble into player avatars"
```

---

## Task 6: Add Text Status Display

**Files:**
- Modify: `app/catana/components/PlayerActionContainer.js`

### Step 1: Add status text between dice and end turn

In PlayerActionContainer.js, add a text display:

```javascript
// Add near top of file
const SHOW_STATUS_TEXT = true;

// In the JSX, between dice and end turn button:
{ctx.phase === "main" && (
  <div className="flex w-36 flex-col items-center">
    <div className={`flex ${ctx.currentPlayer === player.id && ctx.activePlayers?.[player.id] === 'preRoll' ? 'opacity-100' : 'opacity-50'}`}
      onClick={ctx.currentPlayer === player.id && ctx.activePlayers?.[player.id] === 'preRoll' ? () => moves.rollDice() : ()=>{}}>
      <Die dieSize="3.5rem" />
      <div className="px-4" />
      <Die2 dieSize="3.5rem" />
    </div>

    {/* Status text */}
    {SHOW_STATUS_TEXT && gameStatus && (
      <div className="text-white text-sm font-medium drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] my-2 text-center">
        {gameStatus.text}
      </div>
    )}

    <button
      className={`bg-opacity-50 bg-blue-200 hover:bg-blue-300 mx-auto rounded-md flex h-20 w-20 ring-2 ring-slate-300`}
      onClick={() => {
        setPlayerAction(null);
        moves.endTurn();
      }}
    >
      <ForwardIcon className="w-16 h-16 mx-auto stroke-[0.6px] stroke-blue-200 my-auto" />
    </button>
  </div>
)}
```

### Step 2: Pass gameStatus as prop

The component needs to receive `gameStatus` as a prop from GameScreen.

### Step 3: Manually verify in browser

Verify status text appears between dice and end turn button.

### Step 4: Commit

```bash
git add app/catana/components/PlayerActionContainer.js
git commit -m "feat: add optional status text display"
```

---

## Task 7: Run Full Test Suite and Verify

### Step 1: Run all tests

Run: `cd /Users/david/coding/settlex && pnpm verify`

Expected: All tests pass, lint passes

### Step 2: Manual browser testing

Test these scenarios:
- [ ] Gold glow on active player
- [ ] Chevron above active player
- [ ] Status bubble shows dice icon during preRoll
- [ ] Status bubble shows thinking icon during postRoll
- [ ] Status bubble shows road icon when clicking build road
- [ ] Status bubble shows robber icon when moving robber
- [ ] Status text displays correctly
- [ ] Transitions are smooth

### Step 3: Final commit if any fixes needed

```bash
git add -A
git commit -m "fix: address any issues from testing"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create `getGameStatus` utility with tests |
| 2 | Add turn indicator styles (glow + chevron) |
| 3 | Wire up turn indicators in GameScreen |
| 4 | Create StatusBubble component |
| 5 | Integrate StatusBubble into avatars |
| 6 | Add text status display |
| 7 | Full test suite and manual verification |
