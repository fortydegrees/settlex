# Opponent Player Box UI (Design)

Date: 2026-01-13

## Goal
Add a dedicated opponent "player box" that shows only public info (avatar, public VP, longest road length, knights played) plus a separate hand-size pill with stacked card backs for resources/dev cards.

## Requirements
- Replace the current opponent resource bar that reuses `CardIcon` counts by type.
- Show opponent avatar with VP bubble (public only), longest road length, and knights played.
- Show a hand-size pill with two piles:
  - Resource cards (use `card_rescardback.svg`).
  - Dev cards (use `card_devcardback.svg`).
- Piles are stacked like VP dev cards: slight horizontal offset; distinct separation between the two piles.
- If count > 2, show a small count badge on the top-right of the pile.
- If count = 0, show a faint outlined placeholder card (no badge) so the pile location is visible.
- Opponent boxes are top-center and laid out horizontally with spacing for 2+ opponents.

## Approach
- Reuse the existing stacking/badge behavior from `DevCardDisplay` by extracting a shared `CardStack` helper/component.
- Extract avatar + stats from `PlayerActionContainer` into a shared `PlayerAvatarStats` component.
- Create `OpponentPlayerBox` to compose `PlayerAvatarStats` + a right-hand hand-size pill using two `CardStack`s.
- Update `GameScreen` to render `OpponentPlayerBox` for each opponent.

## Components
- `PlayerAvatarStats`
  - Inputs: `player`, `core`, `coreTopology`, `isMe`, optional `handCounts` for local-player-only resource/dev count display.
  - Shows public VP for opponents; shows "public (+hidden)" for the local player.
  - Highlights longest road / largest army when owned.
- `CardStack`
  - Inputs: `count`, `src`, `alt`, `maxVisible`, `cardWidth`, `cardHeight`, `stackOffset`.
  - Renders up to `maxVisible` cards with offset; shows badge if `count > 2`.
  - When `count === 0`, renders a faint outlined placeholder card (still reserves width).
- `OpponentPlayerBox`
  - Composes `PlayerAvatarStats` + a hand-size pill containing two `CardStack`s.
  - The pill uses the same translucent blue background/ring styling as existing UI.

## Data Flow
- `GameScreen` continues to build `playerViewMap` from `G.core` and filters `opponents`.
- For each opponent, pass `player`, `G.core`, and `G.coreTopology` into `OpponentPlayerBox`.
- Card counts use `player.resources.length` and `player.devCards.length`.

## Visual Notes
- Card sizing and offset should match the VP dev card stack (52x72, 16px offset).
- Badge styling can reuse the VP count badge styles from `DevCardDisplay`.
- The hand-size pill should sit as a "second pill" to the right of the avatar/stats block.

## Non-goals
- No changes to core game logic or server rules.
- No reveal of opponent card identities.

## Testing
- Manual UI pass with existing scenarios:
  - Opponent box shows public stats only.
  - Card backs show counts correctly; badge appears when count > 2.
  - Empty piles show outlined placeholder.
  - Multiple opponents layout correctly top-center.
