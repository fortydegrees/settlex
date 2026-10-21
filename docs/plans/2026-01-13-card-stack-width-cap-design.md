# Card Stack Width Cap (Design)

Date: 2026-01-13

## Goal
Add a max-width cap to all card stacks so stacks grow with count until a cap, then tighten spacing without increasing overall width. The count badge should still display the true card count.

## Requirements
- Cap stack width at a configurable maximum (default 90px).
- Stack width should still grow with count until it reaches the cap.
- If additional cards push beyond the cap, reduce the gap between cards to fit within the cap.
- Never shrink below the width of a single card.
- Apply to all piles (dev VP stack, opponent resource/dev piles, any other `CardStack` use).

## Approach
- Extend `getCardStackLayout` to accept `maxStackWidth` and compute an effective `offset` plus `width`.
- Export a shared default cap (e.g. `DEFAULT_STACK_MAX_WIDTH = 90`) from `CardStackLayout`.
- Update `CardStack` to use the computed `offset` for card positioning.
- Update `DevCardDisplay` to use the same cap when calculating VP stack width for the container.

## Layout Algorithm
Given:
- `visibleCount` (based on `count` and `maxVisible`)
- `cardWidth`
- `stackOffset` (desired gap)
- `maxStackWidth`

Compute:
- `idealWidth = cardWidth + (visibleCount - 1) * stackOffset`
- If `maxStackWidth` is set and `idealWidth > maxStackWidth`:
  - `width = Math.max(cardWidth, maxStackWidth)`
  - `offset = visibleCount > 1 ? (width - cardWidth) / (visibleCount - 1) : 0`
- Else:
  - `width = idealWidth`
  - `offset = stackOffset`

Return `{ width, offset, visibleCount, isEmpty, showBadge }`.

## Non-goals
- No changes to core game logic.
- No changes to card face rendering or counts.

## Testing
- Extend `CardStackLayout.test.js` to verify:
  - The cap tightens offsets when `idealWidth` exceeds `maxStackWidth` (use `toBeCloseTo`).
  - Width does not shrink below single-card width.
  - Existing behaviors remain unchanged for counts under the cap.
