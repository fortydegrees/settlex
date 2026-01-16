# Effects + Audio System Design (GSAP + Cue Bus)

Date: 2026-01-16

## Context
Animations are currently spread across CSS, react-spring, and ad-hoc DOM lookups (e.g., card distribution in `app/catana/Board.js`). Audio exists as assets in `sounds/` but has no centralized playback or theming. The goal is to make effects easy to add, modify, and disable without entangling UI components or server logic.

## Goals
- Centralize animation and sound handling on the client without changing server authority.
- Make multi-stage animations (e.g., card distribution) easy to sequence and cue sounds at phase boundaries.
- Keep UI components thin; avoid duplicating sound calls across the UI.
- Support settings: mute, reduced-motion, and turbo/fast animations.
- Allow future sound themes (swap mappings without editing animation code).

## Non-goals
- Make animations server-authoritative.
- Replace every CSS micro-animation (keep lightweight UI effects in CSS).

## Architecture Overview
- **Event sources:** `bgio-effects` listeners (e.g., `roll`, `distributeCardsFromTile`) plus derived UI events (e.g., `ui:turn-start` from `ctx.currentPlayer` changes).
- **Event bus:** in-memory pub/sub for normalized events with `effectId` de-dupe.
- **Effect registry:** maps event types to effect runners.
- **Effect runners (GSAP):** build timelines for board-level visuals and emit **cues** at labels or phase boundaries.
- **Audio manager:** subscribes to cues and plays sounds based on the active theme and settings.

Animations remain client-only; server state is still authoritative. The effect layer is cosmetic and can be skipped or shortened with settings.

## Components
- **GameEffects (provider):** top-level component that listens to `bgio-effects` and derived UI changes, then dispatches normalized events to the bus.
- **EffectBus:** `emit(event)` + `on(eventType, handler)` with short-window dedupe by `effectId`.
- **EffectRegistry:** event-type map to effect runners.
- **EffectLayer (portal overlay):** a fixed, pointer-events-none layer to host ephemeral animation nodes (cards, sparkles, flashes).
- **LayoutMetrics:** helpers to map tiles and HUD elements to screen positions; cached per frame and recomputed on resize.
- **AudioManager:** listens to cues and maps them to sound files via a theme.

## Data Flow (example: resource distribution)
1. Server emits `effects.distributeCardsFromTile` with card payload.
2. `GameEffects` normalizes and emits `effect:resource-distribution` with `effectId`.
3. `resourceDistribution` runner spawns card nodes in `EffectLayer`, builds a GSAP timeline.
4. Timeline sequence:
   - tile flash (optional)
   - card appear
   - **emit cue** `resource:travel:start`
   - card travel to player HUD
5. AudioManager listens for `resource:travel:start` and plays the "woosh" sound.

## Sound Themes + Settings
- **Themes:** a cue-to-sound mapping layer so theme swaps are one change (e.g., `resource:travel:start -> woosh-card.mp3`).
- **Settings:**
  - `muted` or `volume` (AudioManager).
  - `reducedMotion` (skip non-essential runners).
  - `turbo` (duration scale < 1 or skip intermediate phases).

## Error Handling
- Missing DOM targets or refs should not crash effects; fall back to safe defaults or skip the effect.
- GSAP timelines must be killed on unmount to avoid leaks.
- Audio is locked until first user interaction; cues may be dropped or the most recent queued.

## Performance
- Use transforms and opacity only; avoid layout thrashing.
- Cache layout metrics and only recompute on resize or relevant UI changes.
- Reuse nodes in `EffectLayer` where possible.
- Keep `EffectLayer` at fixed position with `pointer-events: none`.

## Testing
- Unit tests for:
  - Event bus dedupe behavior.
  - Effect registry dispatch.
  - Cue emission ordering for resource distribution.
  - Audio theme mapping (cue -> sound).
- Integration tests remain minimal: ensure `Moves` still emit effects and UI does not crash with missing targets.

## Migration Plan
1. Add EventBus + AudioManager (no behavior change).
2. Build GSAP-based resource distribution runner that mirrors current visuals.
3. Wire roll + turn-start cues/sounds.
4. Migrate additional board-level animations incrementally.
5. Optionally add more themes/turbo controls.
