# Dev Card Purchase Reveal Design

Date: 2026-04-04
Scope: Catana local-only `buy dev` dock animation and private card reveal
Status: Approved for implementation

## Goal

Make `buy dev` feel like a satisfying private reward moment without changing the dock layout or the underlying dev-card rules.

For this slice:
- keep the current Catana dock styling and existing `buy dev` button,
- reuse the same dock-icon preload squash language introduced for build pickup,
- animate a bought dev card from the dock to center, reveal it, then send it to the local player's dev-card hand area,
- keep the whole reveal private to the player who bought the card.

## Non-goals

- No dev-card rule changes, server-authority changes, or move contract changes.
- No public/spectator dev-card reveal flow in this slice.
- No redesign of the dev-card hand UI in `DevCardDisplay`.
- No new sound set for dev-card purchase.
- No test-heavy implementation requirement for this slice.

## UX Summary

During a successful local `buy dev` action:

1. The player clicks the `buy dev` dock button.
2. Only the dev-card emblem inside the dock icon squashes briefly.
3. The client sends `moves.buyDevCard()`.
4. When local player state gains the new dev card, a temporary animated card element is created from the dock button's source rect.
5. That emblem-only element moves to the middle of the screen with a quick, clean travel and no overshoot.
6. The rest of the dev-card back grows/fades in around the emblem.
7. The full card flips to reveal the actual dev card face.
8. The revealed card holds briefly so the buyer can register what they got.
9. The card then flies down into the player's dev-card hand area using the same travel feel and sound family as the existing resource-card motion.
10. The temporary animated element disappears once the travel completes.

If the move is illegal or no bought card is observed locally, the button simply returns to idle after the squash and no floating card is shown.

## Product Rules

- The reveal is local-only. Only the buyer sees the flipped face.
- The dock button owns only the preload squash and launch origin, not the whole reveal sequence.
- The emblem pop should use only the dev-card emblem art, not the green plus badge.
- The center reveal should be quick and legible, not theatrical.
- The buy result should still come from the server-authoritative game state.
- Reduced-motion users should still get the same semantic sequence with shorter or simplified transitions.

## Architecture + Data Flow

1. Keep the current `moves.buyDevCard()` call path in `app/catana/Moves.js`.
2. Extend the `buy dev` action wiring in `app/catana/components/PlayerActionContainer.js` so the click can pass:
   - the source dock-button rect,
   - the local player's pre-buy dev-card snapshot needed to identify the newly added card after state updates.
3. Add one transient local-only state in `app/catana/GameScreen.js` for an in-flight dev purchase reveal:
   - `playerId`
   - `triggerRect`
   - previous dev-card counts or equivalent snapshot
   - status needed to know whether the client is waiting for the bought card or actively animating it
4. When `player.devCards` grows for the same local player, derive the newly added card by diffing the old and new dev-card counts.
5. Start one temporary animated reveal element using:
   - the dock rect as origin,
   - screen center as reveal point,
   - the player's dev-card display rect as destination.
6. After the reveal completes, clear the transient local state immediately.

This matches the existing build-pickup split:
- dock/button handles press feedback and launch origin,
- a temporary animated element owns the in-between motion.

## Rendering Notes

- Reuse `public/svgs/icon_devcard.svg`, but render only the emblem group for the preload/pop phase.
- Reuse `public/svgs/cards/development/card_devcardback.svg` for the center card-back build-out.
- Reuse the existing dev-card face SVGs already used by `app/catana/components/DevCardDisplay.js` for the flip result.
- The reveal element should render above the game UI, independent of board zoom/pan, because the sequence travels between dock, screen center, and hand UI.
- The destination should be the real `DevCardDisplay` box, not the `buy dev` dock button.
- The green plus badge from the dock icon should never appear in the detached reveal element.

## Motion Notes

- Dock squash: `~100-130ms`
- Dock-to-center travel: `~220ms`, no overshoot
- Card-back grow/fade: `~120ms`, overlapping the end of the travel
- Flip to face: `~220-260ms`
- Hold on face: `~300ms`
- Travel to hand: `~450-550ms`

The center reveal should feel slick and rewarding, but still fast enough that repeated experienced play does not feel blocked.

If the bought card result arrives slightly later than the click, the reveal can briefly rest on the card back before the face flip, rather than stalling the whole motion.

## Failure Handling

- Illegal click or rejected move: no floating card reveal, dock returns to idle.
- No observed local card delta: clear the pending state and do not invent a reveal.
- Repeated clicks: allow only one pending local dev reveal at a time.
- If the player leaves the relevant state or screen before completion, the temporary reveal should clean itself up quietly.

## File-Level Changes

- `app/catana/components/PlayerActionContainer.js`
  - add `buy dev` source-rect capture and pending local reveal start
  - limit preload squash to the emblem-only portion of the dock icon for this action
- `app/catana/components/ActionsDock/DockCard.js`
  - support emblem-only preload rendering for the dev-card icon
- `app/catana/components/DevCardDisplay.js`
  - expose or register the display rect needed as the reveal destination
- `app/catana/GameScreen.js`
  - own the transient local reveal state
  - detect the newly bought dev card from local state deltas
  - render the temporary reveal component
- new local reveal component near the Catana UI animation code
  - handle dock-to-center travel, back grow/fade, flip, hold, and travel-to-hand cleanup
- optionally shared motion helpers near existing Catana preview/effect utilities
  - only if needed to keep the reveal component readable

## Guardrails

- Do not expose the bought dev card face to non-buyers in this slice.
- Do not restyle the dock shell, hand area, or dev-card assets.
- Do not add a new dependency.
- Do not block input longer than the short reveal requires.
- Reuse the existing resource-card travel sound family for the send-to-hand leg.
- Keep the implementation local/private rather than routing through the shared public effect bus.

## Verification

- Manual verification is the primary gate for this slice.
- Verify:
  - `buy dev` squashes only the emblem in the dock
  - the emblem cleanly detaches from the dock and reaches center
  - the card back builds in around the emblem
  - the card flips to the correct local bought card
  - the hold is readable but short
  - the card travels into the real dev-card hand area
  - only the buying player sees the face reveal
  - illegal or failed clicks do not leave stray UI
- Add only narrow source-level sanity checks if they materially reduce regression risk during implementation.

## Acceptance Criteria

- Clicking `buy dev` triggers a short emblem-only preload squash in the dock.
- A successful local dev-card purchase creates one temporary reveal element that starts from the dock button.
- The reveal reaches center, builds into the dev-card back, flips to the actual bought card, holds briefly, then travels into the player's dev-card hand area.
- The reveal uses only local player information and is not shown publicly.
- The green plus badge from the dock icon is excluded from the detached reveal.
- Failed or unresolved buys do not leave ghost animations or stale local state.

## Open Questions

- None for this slice. Public/spectator treatment of dev-card purchase is intentionally deferred.
