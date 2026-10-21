# Game Over UI Design

Date: 2026-01-22

## Goal
Make the game-over state obvious in the UI, show the winner, append a log entry, and offer next actions while keeping the board visible for review.

## Non-Goals (v1)
- Deep stats visualizations (dice distribution, VP timeline, production, steals, etc.)
- Replay controls
- New audio assets or complex victory animations

## UX Summary
- When the game ends, dim the board and show a centered modal with clear winner messaging.
- Keep the game log visible and interactive above the dim layer.
- Provide a "View Postgame" action that opens a full-screen overlay for future stats/replay.
- Provide actions: Return to Lobby, Rematch (disabled or stub), Close.

## Data Flow
- Source of truth: `G.core.gameOver` (winnerId, reason) and `ctx.gameover`.
- `GameScreen` watches for a transition into game-over and opens the modal.
- Clear local UI actions (playerAction, trade/dev modals) and disable roll/end shortcuts.
- Guard any `ctx.activePlayers` access (may be null after game end).

## Components
- `GameOverOverlay`: full-screen dim layer that blocks board interaction.
- `GameOverModal`: winner copy, final VP, small scoreboard, actions.
- `PostgameOverlay`: full-screen placeholder with Summary tab and "Coming soon" for Stats/Replay.

## Game Log
- Append a single `game:over` entry when `G.core.gameOver` first appears.
- Include `winnerId` and `reason` in `data` for formatting.

## Audio/Visual Hooks
- Emit cue `game:win` or `game:lose` on game-over transition.
- Optional subtle winner highlight (future work).

## Future Extensions
- Postgame stats: roll distribution, VP over time, resource production, dev-card counts, steals/discards.
- Replay timeline with scrubbing.
- Share/rematch flows with lobby integration.
