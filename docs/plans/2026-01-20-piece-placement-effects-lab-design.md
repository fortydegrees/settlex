# Piece Placement Effects Lab Design

## Goal
Add a dev-only Effects Lab entry that lets us quickly tune the settlement/road placement animation (drop + dust ring) with live controls and shared audio cue.

## Non-goals
- No new game logic or rules.
- No additional sound assets.
- No production UI changes beyond supporting tuning overrides.

## UX Summary
A new “Piece Placement” entry appears in `/catana/dev/effects`. The lab shows a board-sized surface and controls to choose piece type, player color, target index, and tuning sliders for timings, scales, dust opacity, and easing strings. Pressing “Play” replays the effect with current tuning. Audio can be toggled from the lab header (existing control), reusing the `build:place` cue.

## Architecture
- Extend `createPiecePlacementRunner` to accept an optional `tuning` object. Defaults remain unchanged so production behavior is stable.
- Add `PiecePlacementLab` in `app/catana/dev/effects/` that:
  - Builds a deterministic tile set using `generateBoard(resolveBoardConfig("standard-random"), rng, true)`.
  - Uses `buildRenderMaps` to derive node/edge lists for target selection.
  - Computes layout via `getBoardLayout` and reuses the board ref for correct screen coords.
  - Calls the runner with selected payload and `tuning` overrides.
- Register the lab in `app/catana/dev/effects/registry.js` so it appears in the Effects Lab dropdown.

## Data Flow
1. Lab UI collects tuning values + piece selection.
2. On “Play,” build `payload = { pieceType, id, playerId }` and pass to `runner(payload, tuning)`.
3. Runner applies overrides to animation constants and emits `build:place` cue at impact.

## Guardrails
- Clamp selection indices to valid node/edge lists.
- No DOM or GSAP work if refs/layout are missing.
- Keep overrides optional and scoped to the lab.

## Testing
- No automated DOM tests required for the lab; verify manually in `/catana/dev/effects`.
- Existing runner tests remain unchanged.
