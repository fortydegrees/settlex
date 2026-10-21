# Dev Card Box — Future UX/UI Notes

## Why this exists
Capture ideas/questions so we can return later without re‑discovering context.

## Current behavior (as of now)
- Box appears only when player has at least one dev card.
- Victory Point dev cards are stacked with overlap; count bubble shows at 3+.
- Playable cards are grouped by first‑seen order (duplicates adjacent), no overlap.
- Box grows to fit contents and pops in with a subtle animation.

## Goals
- Keep dev cards readable and usable without crowding the bottom HUD.
- Adapt to “many cards” cases with graceful compression.
- Maintain visual clarity between VP (non‑playable) and playable cards.
- Keep interactions predictable on different screen sizes.

## Constraints / signals to watch
- Available horizontal space relative to action bar + dice/end‑turn area.
- Screen size changes (mobile vs desktop).
- Max cards scenario (dev‑card heavy games).
- Performance: keep layout/measurements simple.

## Candidate behaviors (ideas to explore)
- **Adaptive max width:** cap container width based on available real estate; increase overlap as count grows.
- **Stacking rules:**
  - VP always stacked (already done).
  - Playable cards stack only when width limit is hit.
- **Compaction mode:** when space constrained, collapse to a compact stack; hover/click expands.
- **Focus mode:** expanding dev‑card box temporarily compresses resource/action bar to free space.
- **Overflow badge:** show count badge for any stack once overlap makes individual cards ambiguous.

## Open questions
- How to compute “available real estate”? (viewport width? distance to dice/end‑turn?)
- What’s the max width target for the dev‑card box on desktop? on mobile?
- Should playable cards ever stack by type (like VP) or by overall order?
- Should expansion be hover‑only, click‑to‑toggle, or both (desktop vs mobile)?
- How to indicate playability state when the box is compacted?

## Experiment ideas / quick tests
- Add a hard width cap (e.g., 320–420px) and increment overlap per extra card.
- Simulate with fake hands (10–15 cards) and verify readability at 1280px, 1024px, 768px.
- Try an expand/compact toggle with CSS transitions only, no layout thrash.

## Reference inspiration
- Potential compact/expand HUD behavior (provided by user):
  - https://codesandbox.io/p/sandbox/dqxvqu?file=%2Fsrc%2FApp.tsx
