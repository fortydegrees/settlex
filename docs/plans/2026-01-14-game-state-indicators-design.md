# Game State Indicators Design

Visual indicators to communicate game state at a glance — whose turn it is and what action is expected. Designed for players and spectators alike.

## Approach

Subtle distributed indicators (no dedicated status box), with an optional text display for development/debugging that can be disabled later.

## Components

### 1. Turn Indicator (whose turn)

- Gold/yellow glow ring around the active player's box
- Gold/yellow chevron (▼) above the active player's avatar
- Applied consistently to opponent boxes (top) and player dock (bottom)
- Neutral color avoids confusion with danger-red (discard warning)

### 2. Status Bubble (what action is expected)

- Small circular bubble, bottom-center of active player's avatar
- Displays icon representing current status
- Only appears for the active player

### 3. Text Status (optional, bottom-right)

- Human-readable status text between dice and end turn button
- Can be toggled via constant (useful now, may disable later for minimal aesthetic)

## Status Types

| Status Type | Text | Icon | When |
|-------------|------|------|------|
| `rolling` | "Roll Dice" | Dice | `preRoll` stage |
| `thinking` | "Your Turn" / "{Name}'s Turn" | Brain/thinking | `postRoll` stage |
| `moving_robber` | "Move Robber" | Robber/bandit | `robberMove` stage (7 or Knight) |
| `stealing` | "Choose Player" | Hand/question | `robberSteal` stage |
| `discarding` | "Discard Cards" | Cards with minus | `robberDiscard` stage |
| `placing_settlement` | "Place Settlement" | Settlement | Placement phase or build action |
| `placing_road` | "Place Road" | Road | Placement phase, build action, or Road Builder |
| `placing_city` | "Place City" | City | Build action |

Note: Dev card plays show a brief notification ("{Name} played Knight") then transition to the underlying action status (e.g., Knight → `moving_robber`, Road Builder → `placing_road`).

## Transitions & Animations

### Icon change

- Fade out current icon (150ms)
- Fade in new icon (150ms)
- CSS transitions, not React Spring

### Action complete

- Icon persists ~1 second after action finishes
- Gives visual feedback that action was registered

### Turn end

- Subtle pop (slight scale up)
- Shrink to zero and disappear

```css
.status-bubble {
  transition: opacity 150ms ease, transform 200ms ease;
}
.status-bubble.exiting {
  opacity: 0;
  transform: scale(0);
}
```

## Architecture

### New utility: `app/catana/utils/gameStatus.ts`

```typescript
type StatusType =
  | 'rolling'
  | 'thinking'
  | 'moving_robber'
  | 'stealing'
  | 'discarding'
  | 'placing_settlement'
  | 'placing_road'
  | 'placing_city';

type GameStatus = {
  text: string;              // "Roll Dice", "Place Settlement"
  statusType: StatusType;    // Semantic identifier for UI to map to visuals
  activePlayerId: string;    // Who we're waiting on
};

function getGameStatus(
  core: GameState,
  ctx: BgioCtx,
  playerAction?: string     // UI-level action like 'placeRoad'
): GameStatus
```

### Logic flow

```
game-core (pure state)
    ↓
getGameStatus() — derives semantic status + human text
    ↓
UI components — map statusType to icons/visuals
```

### Why this split

- **game-core** stays pure game logic (rules, validation)
- **getGameStatus** is presentation logic, but UI-agnostic (reusable for 3D, CLI, etc.)
- **UI layer** just renders what it's told — maps `statusType` to icons

### Future game log

Will use similar pattern with `formatLogEntry(logEntry)` utility. May share some text helpers with `getGameStatus`, but separate concerns.

## Implementation Notes

### Files to create/modify

| File | Change |
|------|--------|
| `app/catana/utils/gameStatus.ts` | New — status derivation utility |
| `app/catana/components/StatusBubble.tsx` | New — icon bubble component |
| `app/catana/components/TurnIndicator.tsx` | New — glow + chevron wrapper (or inline in existing components) |
| `app/catana/components/PlayerAvatarStats.js` | Add glow ring + chevron when active |
| `app/catana/components/OpponentPlayerBox.js` | Add glow ring + chevron when active |
| `app/catana/components/PlayerActionContainer.js` | Add text status between dice/end turn |

### Styling

```css
/* Gold glow for active turn */
.turn-active {
  box-shadow: 0 0 12px 3px rgba(251, 191, 36, 0.6); /* amber/gold */
}

/* Chevron */
.turn-chevron {
  color: rgb(251, 191, 36);
  /* positioned absolutely above avatar */
}

/* Status bubble transitions */
.status-bubble {
  transition: opacity 150ms ease, transform 200ms ease;
}
```

### Toggle for text status

```typescript
const SHOW_STATUS_TEXT = true; // Set false to hide text indicator
```

## Out of Scope (for now)

- Game log / chat — will go bottom-left, separate design
- Dice pulse animation when waiting to roll — nice-to-have enhancement
- End turn button pulse — nice-to-have enhancement
