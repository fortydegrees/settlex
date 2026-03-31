# Robber Placement UX Design

Date: 2026-03-31
Scope: playful robber-placement motion in Catana board UI
Status: Approved for implementation

## Goal

Make robber placement feel more tactile and legible by adding a cursor-following robber preview with light magnetic stickiness over valid targets, while preserving the current minimal placement affordance as a fallback code path.

## Context

- Robber placement is currently handled as a board-stage interaction in:
  - `app/catana/Board.js`
  - `app/catana/Tile.js`
- Valid robber tiles are already computed client-side and rendered as tile-local action affordances.
- The current UX is:
  - show a pulsing target circle on valid tiles,
  - show a tile-local ghost robber on hover,
  - click the tile target to run `moves.moveRobber(id)`.
- Catana already uses GSAP for runtime effects and has a fixed portal overlay in:
  - `app/catana/effects/GameEffects.js`
  - `app/catana/effects/EffectLayer.js`
- The board itself lives inside `react-zoom-pan-pinch`, so a follower effect should treat screen-space tracking and board-space target snapping as separate concerns.

## Approved Direction

- Keep the current robber placement affordance intact as the `minimal` mode.
- Add a second explicit motion mode, `playful`, and make it the new default on desktop.
- In `playful` mode:
  - show a robber preview that follows the pointer during robber placement,
  - allow the preview to feel slightly delayed or springy rather than perfectly locked,
  - make the preview magnetically stick to a valid robber target when the pointer hovers one,
  - keep the existing pulsing target circle and click behavior as the authoritative interaction.
- Do not build a user-facing settings panel in this slice.
- Do structure the code so a future settings UI can switch between `minimal` and `playful` without re-architecting robber placement.

## Interaction Model

### Minimal mode

- Preserve the current behavior:
  - pulsing target circles on valid robber tiles,
  - tile-local hover ghost,
  - click target to place robber.

### Playful mode

- Activate only while the active player is in robber placement.
- Render a single robber preview overlay above the board, not one preview per tile.
- In free movement:
  - preview follows the pointer in viewport space,
  - movement should feel soft and slightly delayed, not sluggish.
- In target hover:
  - preview should snap or ease toward the hovered target center,
  - motion should tighten so it feels like the robber is being pulled into place,
  - add a subtle settle cue such as a small scale pulse or brief lift/drop.
- When leaving a valid target:
  - preview releases back to free follow cleanly,
  - no abrupt jumps.
- Placement still occurs only on the existing valid tile action target.

## Motion and Fallback Rules

- Default to `playful` for pointer-precise desktop environments.
- Force `minimal` when:
  - the user prefers reduced motion,
  - the primary pointer is coarse/touch,
  - the overlay cannot reliably compute board/target positions.
- Do not add 3D tilt in this slice.
- Keep any springy feel restrained; this should read as polished guidance, not a novelty cursor.

## Architecture

- Introduce a small robber-placement motion mode seam rather than baking the new behavior directly into `Tile`.
- Move playful preview rendering to a board-level or effects-level overlay so there is only one follower instance.
- Keep valid tile discovery and click handling in the existing board/tile path.
- Allow tiles or board-level target elements to expose hover enter/leave metadata for:
  - target id,
  - target center in viewport or board-adjusted screen space.
- Prefer GSAP for the motion system:
  - pointer-follow with `quickTo()` or equivalent eased setters,
  - target snap via explicit tween updates,
  - avoid adding Motion or react-spring for this feature alone.
- The minimal and playful behaviors should share the same legality rules and target list.

## Future Settings Seam

- This slice should leave a clear internal contract for future UI settings:
  - `minimal`
  - `playful`
- The setting does not need persistent storage or controls yet.
- The code should make the motion mode easy to lift into a future global UI-preferences system.
- Document this seam in agent notes so a future settings pass can reuse it.

## Acceptance Criteria

- During robber placement on desktop, a single robber preview follows the pointer when `playful` mode is active.
- Hovering a valid robber target makes the preview visibly stick toward that target.
- Existing robber placement clicks continue to work through the current target affordance.
- The current minimal behavior remains available as a code path and fallback mode.
- Reduced-motion and coarse-pointer environments fall back to minimal behavior.
- No server or engine robber rules are changed.
- The new motion is scoped to robber placement only and does not affect normal board hover, build placement, or panning.
