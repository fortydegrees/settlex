---
name: catana-game-feel-effects
description: Use when working on Catana gameplay feel, animations, effects, audio, haptics, dice/card/piece motion, effect payloads, cue routing, or semantic presentation loops.
---

# Catana Game Feel + Effects

## Core Principle

Authoritative game or effect events drive presentation. React state, moving
elements, audio, and haptics may echo that truth; they must not create another
source of game truth.

## Classify Before Editing

- **Presentation-only tuning:** timing, easing, sound choice, visual polish,
  copy, spacing, or cue timing. Prefer a direct edit and focused manual check.
- **Shared presentation wiring:** effect payload shape, effect-bus routing,
  cleanup, dedupe, hidden-tab policy, reduced-motion behavior, or reusable
  helpers. Add focused tests.
- **Game state or rules:** moves, stages, `playerView` masking, timer semantics,
  or server authority. Use the normal test-first workflow.

## Trace Ownership

Read the smallest relevant set:

- `app/catana/effects/GameEffects.js`: EffectBus, manager wiring, cue emission,
  and browser lifecycle.
- `app/catana/effects/registry.js`: semantic event names and runner routing.
- The relevant runner, such as `resourceDistribution.js`, `cardTransfer.js`,
  `devCardPlay.js`, `diceRollTimeline.js`, `robberMove.js`, or
  `placePiece.js`: timeline, temporary elements, and cue labels.
- `soundThemes.js`, `AudioManager.js`, and `HapticManager.js`: cue mapping,
  playback policy, hidden tabs, and haptics.

**REQUIRED SUB-SKILL:** Use `catana-dev-surfaces` to select and verify in the
existing sandbox/effects-lab route rather than creating another harness.

## Event Contract

Before changing an effect, identify:

- The authoritative event/state and any presentation-only echo.
- Payload shape and owner, plus a stable effect id or dedupe key.
- Viewer perspective: local player, opponents, spectators, masked state, and
  replay/postgame.
- Source/destination anchors and whether a static element must hide while its
  temporary counterpart moves.
- Reduced-motion fallback, hidden-tab behavior, and cleanup on unmount, route
  change, interruption, or timeout cancellation.
- Audio/haptic cue names and labels. The runner owns timeline timing; cues emit
  from its labels, the registry routes the semantic event, and managers own
  playback policy.

## Implementation Rules

- Route semantic gameplay presentation through `GameEffects`, the registry,
  and the relevant runner, not a one-off component animation.
- Never emit from optimistic or masked UI state when server state is
  authoritative. Rejection/reconciliation must not leave or duplicate a visual.
- Keep moving elements deterministic and explain their relationship to static
  board elements.
- Keep payload building in focused helpers when `GameScreen.js` accumulates
  shape logic. Ask before adding dependencies.

## Proportionate Verification

- Tuning-only values: use the routed dev surface; check the exact scenario,
  console, cleanup, reduced motion/hidden tabs when relevant, and add no tests.
- Payload shape, event routing, dedupe, shared helper, or cleanup changes: add
  focused tests, then run the relevant Vitest and ESLint targets.
- Game-state changes: failing-first coverage plus a focused dev-surface smoke.

Common failures are component-local effects, stale anchors, duplicated static
and moving elements, cue timing split across files, leaked timers/Howls/GSAP
handles/listeners, and tests for value-only tuning while shared wiring goes
untested.
