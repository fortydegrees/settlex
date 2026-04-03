# Action Dock Build Pickup Design

Date: 2026-04-03
Scope: Catana dock interaction cleanup for explicit `road` / `settlement` / `city` build actions
Status: Approved for implementation

## Goal

Clean up the player action dock so explicit build actions feel stable, clear, and polished.

For this slice:
- remove the current dock magnify behavior,
- remove the legacy looping click bounce,
- keep the current Catana dock styling and layout,
- make `road`, `settlement`, and `city` feel like physical pieces the player picks up from the dock,
- hand that picked-up piece off into a live cursor-following placement preview.

## Non-goals

- No visual restyle of the dock shell, buttons, counts, or surrounding player-hand layout.
- No new dock text labels, badges, or instructional copy.
- No `trade` or `dev card` animation redesign in this slice.
- No special UX for dev-card `roadBuilding` resolution in this slice.
- No game-rule, move-authority, or legality changes.
- No mobile-specific redesign beyond respecting reduced-motion/coarse-pointer fallbacks.

## UX Summary

During a normal explicit build action:

1. The player hovers a dock button.
2. The button lifts slightly (`~3-4px`) with a short, non-bouncy ease-out.
3. Clicking `road`, `settlement`, or `city` gives the button a tiny press/release.
4. The actual matching piece visually pops out of that dock button.
5. Over roughly `120-160ms`, that piece transitions into a live cursor-following preview.
6. While the piece is in hand, the originating dock button stays subtly active.
7. Clicking a legal board target commits the existing move and immediately clears the preview.
8. Cancel clears the preview immediately with no fly-back animation.

The handoff should feel like "pick up from dock, then place on board", not "toggle a mode and show a separate helper".

## Product Rules

- The hover interaction is a small raise only. No icon magnification.
- The click interaction is short and controlled. No looping bounce.
- The picked-up build piece should become the actual live follower, not just a brief flourish before a second preview appears.
- The dock button for the active piece should remain quietly selected while the piece is in hand.
- Cancel/reset should be immediate and visually quiet.
- The dock should remain usable for repeated fast actions, especially repeated road placement across turns.

## Architecture + Data Flow

1. Keep `playerAction` as the existing explicit build-mode signal in `app/catana/GameScreen.js` and `app/catana/Board.js`.
2. Add one new client-side UI state for the build pickup flow, owned near `playerAction`:
   - piece type: `road` | `settlement` | `city`
   - launch origin: dock button rect / center
   - active status needed for pickup handoff and cancel/reset
3. On dock click in `app/catana/components/PlayerActionContainer.js`:
   - set `playerAction` to the current explicit build mode,
   - capture the clicked button geometry,
   - start the pickup state for the matching piece.
4. In `app/catana/Board.js`, render a build-placement follower component when explicit build pickup is active.
5. That follower component should reuse the same overall motion model already proven by robber placement:
   - cursor-following spring motion,
   - magnetic snapping to legal targets,
   - reduced-motion/coarse-pointer fallback.
6. Legal target derivation remains the existing explicit-build logic:
   - roads from existing buildable edge logic,
   - settlements from existing buildable node logic,
   - cities from owned settlement upgrade nodes.
7. Successful placement continues to use the current moves:
   - `moves.placeRoad(edgeId)`
   - `moves.placeSettlement(nodeId)`
   - `moves.placeCity(nodeId)`
8. Successful placement clears the pickup state immediately.
9. Cancel also clears the pickup state immediately.

## Rendering Notes

- Reuse the current board legality/highlight branches rather than creating a separate build-target system.
- Add only the registration data needed so the new build follower can magnetically lock to legal explicit-build targets.
- Keep the dock button visual treatment subtle:
  - quiet selected state while active,
  - no pulse,
  - no bounce,
  - no extra text.
- The in-hand follower should use the actual piece asset for the selected build type and current player color.
- The visual handoff should begin from the clicked dock button, not from a generic screen-center origin.

## File-Level Changes

- `app/catana/components/PlayerActionContainer.js`
  - remove dock magnify dependency/behavior for build buttons
  - capture build-button geometry on click
  - trigger explicit pickup state for `road` / `settlement` / `city`
  - keep subtle active styling while the piece is in hand
- `app/catana/components/ActionsDock/Dock.js`
  - remove magnify-specific behavior from the shared dock container
- `app/catana/components/ActionsDock/DockCard.js`
  - remove looping click bounce logic
  - keep only small hover/click feedback appropriate to the new interaction
- `app/catana/Board.js`
  - render a build pickup follower alongside existing explicit build target rendering
  - clear pickup state on commit/cancel
  - thread any target registration needed by the new follower
- new build follower component/utilities near robber preview code
  - reuse the robber-preview motion pattern for build pieces
- `app/catana/Edge.js`
  - expose/register legal edge target geometry for the build follower
- `app/catana/ActionNode.js`
  - expose/register legal node target geometry for settlement/city follower behavior
- focused tests under `app/catana/__tests__/`
  - build pickup wiring
  - cancel/reset behavior
  - follower gating and target registration

## Guardrails

- Do not change dock styling/layout beyond interaction-state classes needed for hover/active cleanup.
- Do not add instructional dock copy such as "Place road" labels or tooltips for this slice.
- Do not change build legality or server-authoritative move flow.
- Reduced-motion mode should skip the theatrical launch and transition almost immediately into the live follower.
- Cancel must remain immediate and quiet.
- The feature must not reintroduce input-blocking animation during repeated build actions.

## Tests

- Add source/integration coverage that the dock no longer contains magnify logic or looping bounce logic for build buttons.
- Add tests for `PlayerActionContainer` / `GameScreen` wiring that clicking `road`, `settlement`, or `city` starts pickup state in addition to explicit build mode.
- Add board tests that the build follower renders only for explicit build pickup state and clears on:
  - successful commit,
  - cancel/reset.
- Add tests that legal target registration is wired for:
  - road edges,
  - settlement nodes,
  - city upgrade nodes.
- Add focused motion-utility tests if new build-preview motion helpers are introduced.
- Manually verify in browser:
  - road pickup and placement,
  - settlement pickup and placement,
  - city pickup and placement,
  - cancel via current cancel path / `Escape`,
  - reduced-motion fallback.

## Acceptance Criteria

- Dock build buttons no longer magnify on hover.
- Dock build buttons no longer run the old looping bounce animation on click.
- Hover feedback for explicit build buttons is a slight raise only.
- Clicking `road`, `settlement`, or `city` visibly launches that piece from the dock button into a live cursor-following preview.
- The live preview uses the actual selected build piece and current player color.
- The active dock button remains subtly selected while the piece is in hand.
- Cancel clears the in-hand piece immediately with no fly-back.
- Successful placement commits through the current move path and clears the preview immediately.
- The dock remains stable and easy to use for repeated build actions.

## Open Questions

- None for this slice. `trade`, `dev card`, and any dedicated `roadBuilding` polish are intentionally deferred.
