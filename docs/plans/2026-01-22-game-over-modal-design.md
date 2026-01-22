# Game Over Modal Design

## Overview

When a player wins (reaches 10 VP), the game transitions to a game-over state with a celebratory modal flow. The design prioritizes a triumphant moment for the winner while giving all players quick access to results and next actions.

## User Flow

```
Game Ends (player reaches 10 VP)
         ↓
   Win Moment (sound + board flourish)
         ↓
   Winner Modal (celebration + summary)
         │
    ┌────┴────┐
    ↓         ↓
[Continue]   [X close]
    ↓         ↓
Stats Modal  Replay View
    │         │
    ↓         ↓
[X] → Replay  [View Stats] → Stats Modal
[Lobby] → Exit
```

## Components

### 1. Win Moment (Board Effects)

**Trigger:** `G.core.gameOver` transitions from falsy → truthy

**Effects:**
- Play `victory.mp3` sound
- Winner's pieces glow/pulse on the board
- Clear any in-progress UI state (close modals, clear actions)
- Disable game interactions (canRoll, canEnd, keyboard shortcuts)

### 2. Winner Modal

**Purpose:** Celebrate the winner, show final standings, provide navigation.

**Layout:**
```
┌────────────────────────────────────────────────────┐
│                                              [X]   │
│                                                    │
│                  🏆 VICTORY 🏆                     │
│                                                    │
│              ┌─────────────────────┐               │
│              │   Player 2 (Blue)   │  ← Winner     │
│              │      10 VP          │    highlighted│
│              └─────────────────────┘               │
│                                                    │
│     ┌──────────────┐  ┌──────────────┐             │
│     │ Player 1 (Red)│  │Player 3 (Orange)│          │
│     │     8 VP      │  │     6 VP      │           │
│     └──────────────┘  └──────────────┘             │
│                                                    │
│         42 turns  •  28 minutes                    │
│                                                    │
│              ┌────────────────────┐                │
│              │     Continue       │  ← Primary CTA │
│              └────────────────────┘                │
└────────────────────────────────────────────────────┘
```

**Content:**
- Header: "VICTORY" with celebratory styling
- Winner card: Larger, prominent - player name, color, final VP, gold border/glow
- Other players: Smaller cards below, ordered by VP descending
- Game summary: Turn count + game duration (placeholder values for now)
- Primary CTA: "Continue" → opens Stats Modal
- Close button: X in corner → dismisses to Replay View

**Visual effects:**
- Modal slides/scales in with subtle bounce animation
- Confetti burst on entrance (using canvas-confetti library)
- Confetti bursts once, falls naturally, fades after 2-3 seconds
- Winner card has gold/yellow border or subtle shimmer

**Styling (building on TradeDiscardModal patterns):**
- Backdrop: `bg-black bg-opacity-50`
- Modal: `bg-blue-200 bg-opacity-90 backdrop-blur-sm rounded-lg shadow-xl`
- Winner card: Gold/yellow accent border, slightly elevated
- Other player cards: Muted, standard styling
- Continue button: Green primary style

### 3. Stats Modal (Stub)

**Purpose:** Shell for future detailed stats. Provides navigation to lobby.

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  Game Stats                                  [X]   │
│                                                    │
│  ┌────────┬────────┬────────┬────────┐             │
│  │Overview│Resources│Building│  Dice  │  ← Tabs    │
│  └────────┴────────┴────────┴────────┘             │
│                                                    │
│  ┌──────────────────────────────────────────┐      │
│  │                                          │      │
│  │    [Player rankings from winner modal]   │      │
│  │                                          │      │
│  │    More stats coming soon...             │      │
│  │                                          │      │
│  └──────────────────────────────────────────┘      │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  Lobby   │  │ Rematch  │  │  Share   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└────────────────────────────────────────────────────┘
```

**For v1:**
- Tabs visible but only "Overview" active (others disabled/greyed)
- Overview shows same player ranking from winner modal
- Lobby button: Works - returns to lobby
- Rematch button: Disabled with "Coming soon" tooltip
- Share button: Disabled with "Coming soon" tooltip
- X closes to Replay View

### 4. Replay View (Stub)

**Purpose:** Let players view the final board state. Future home for replay controls.

**For v1:**
- Board visible in final game state (no dim overlay)
- Floating button at bottom: "View Stats" → reopens Stats Modal
- No replay controls yet (future feature)

## State Management

**New state in GameScreen:**
```javascript
const [gameOverPhase, setGameOverPhase] = useState(null);
// null | 'winner-modal' | 'stats' | 'replay'
```

**Transitions:**
| From | Action | To |
|------|--------|-----|
| null | Game ends | winner-modal |
| winner-modal | Click "Continue" | stats |
| winner-modal | Click X / backdrop | replay |
| stats | Click X / backdrop | replay |
| stats | Click "Lobby" | exit to lobby |
| replay | Click "View Stats" | stats |

**Effect to watch for game end:**
```javascript
useEffect(() => {
  if (G.core.gameOver && gameOverPhase === null) {
    setGameOverPhase('winner-modal');
    setPlayerAction(null); // clear any pending actions
    // other cleanup...
  }
}, [G.core.gameOver]);
```

## Data Access

**Winner info:**
```javascript
const gameOver = G.core.gameOver; // { winnerId, reason }
const winnerName = matchData?.find(p => p.id === parseInt(gameOver.winnerId))?.name;
const isCurrentPlayerWinner = playerID === gameOver.winnerId;
```

**Player rankings:**
```javascript
const playerRankings = Object.entries(G.core.playerStateById)
  .map(([id, state]) => ({
    id,
    name: matchData?.find(p => p.id === parseInt(id))?.name,
    vp: getVictoryPoints(G.core, id),
    isWinner: id === gameOver.winnerId
  }))
  .sort((a, b) => b.vp - a.vp);
```

**Placeholder data (until tracking implemented):**
```javascript
const turnCount = '--'; // TODO: track in game state
const gameDuration = '--:--'; // TODO: track elapsed time
```

## File Structure

```
app/catana/
├── components/
│   └── gameOver/
│       ├── GameOverOverlay.js    # Container managing phase state
│       ├── WinnerModal.js        # Celebration modal
│       ├── StatsModal.js         # Tabbed stats (stub)
│       └── ReplayControls.js     # Floating bar (stub)
```

## Dependencies

**New:**
- `canvas-confetti` (~3kb) - for confetti effect

**Existing:**
- `victory.mp3` in `/sounds` - victory sound
- `AudioManager` from GameEffects - sound playback
- `framer-motion` - modal animations

## Out of Scope (Future)

- Full stats implementation (graphs, tables, breakdowns)
- Turn count / game duration tracking
- Replay controls and functionality
- Share functionality
- Rematch functionality
