---
name: catana-dev-surfaces
description: Use when choosing, adding, or using Catana dev-only verification surfaces including sandbox, effects lab, viewport wall, scenario controls, or tuning loops.
---

# Catana Dev Surfaces

## Pick The Surface

- `/catana/dev/sandbox`: real game screen, board UI, mobile HUD, command flow,
  effect-bus integration and state presets.
- `/catana/dev/effects`: deterministic replay for effects, audio cue timing,
  reduced-motion behavior, and isolated effect runner debugging.
- `/catana/dev/sandbox?viewportWall=1`: responsive comparison across phone,
  tablet, and desktop widths.
- Home-table or title-screen dev surfaces: presentation loops that should not
  depend on live match state.
- Board-underlay or visual tuning routes: background, layering, and motion
  decisions where screenshot comparison matters.
- `app/ui/` examples or showcase surfaces: shared primitive inspection after
  reading the Catana design-system guidance.

## Rules For New Dev Surfaces

- Keep them dev-only under `app/catana/dev/` unless the route is already
  established elsewhere.
- Reuse real components, helpers, and the effect bus whenever possible. A dev
  surface should reveal product behavior, not maintain a second implementation.
- Keep scenario controls local to the dev surface. They may shape sandbox
  state, seed payloads, or trigger browser events, but they should not change
  production game rules.
- Make state presets explicit enough to diagnose stage, active player, local
  player, resources, dev cards, and forced-action cases.
- Do not add dependencies or build-tool changes for a dev surface without
  asking first.

## When To Add Tests

Manual verification is enough for pure tuning, layout comparison, and value-only
surface controls.

Add focused tests when you change:

- Shared helpers used by product code.
- Effect payload builders or event routing.
- Dev-surface state preset builders that encode real game-stage assumptions.
- Route wiring that could affect production bundles.
- A regression that should stay locked in.

## Measured Performance Checks

Every timing or jank plan must state all five:

- Reproduce one named scenario in the same route, viewport, browser, and state before and after the change.
- Name whether React renders, listener fan-out, layout/paint, or pointer/frame work owns it.
- Report render counts, listener counts, a focused performance trace, or frame timing as applicable.
- Treat machine- and scenario-specific measurements as local evidence. Do not claim a whole-game speedup from one sampled path.
- Add a focused regression guard when shared ownership, subscriptions, batching, or state derivation changes.

## Verification Checklist

- Open the relevant dev route and confirm it renders the target state.
- Check the browser console for errors and React warnings.
- If mobile layout is involved, verify at least one short and one tall phone
  viewport.
- If effects/audio are involved, replay the exact event and confirm cleanup by
  switching scenario or route.
- If reduced motion, hidden-tab behavior, or haptics are relevant, check that
  path explicitly.
- Record the route and any viewport used in `docs/agent/PROGRESS.md` when the
  change is meaningful.

## Common Failure Modes

- Building a mockup that looks useful but does not exercise the real component
  or effect path.
- Leaving sandbox controls visible in screenshots used to judge product UI.
- Creating a state preset whose stage or active-player data contradicts the
  visible UI.
- Letting dev-surface event listeners or intervals persist after navigation.
- Broad test runs for tuning-only work while skipping the one route that proves
  the visual change.
