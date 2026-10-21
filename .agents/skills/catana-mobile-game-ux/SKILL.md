---
name: catana-mobile-game-ux
description: Use when working on Catana phone gameplay UI, mobile HUD or cockpit, command rows, touch controls, drawers, haptics, narrow layouts, or mobile-browser interaction issues.
---

# Catana Mobile Gameplay UX

## Core Boundary

Mobile owns narrow-viewport layout, touch ergonomics, and scoped browser
behavior. It does not own another gameplay model: server state, `GameScreen`,
and shared view models must give desktop and mobile the same action eligibility.

Classify the change first:

- Layout, copy, CSS, or timing-only tuning: use focused manual verification.
- Command/state/hold derivation or shared event wiring: add focused tests.
- Moves, stages, masking, or game rules: use the normal failing-first workflow.

**REQUIRED SUB-SKILL:** Use `catana-dev-surfaces` for the real sandbox and
viewport verification loop. Use `catana-game-feel-effects` when changing
haptic/effect routing rather than duplicating those rules here.

## Trace Ownership

Read the smallest relevant set:

- `app/catana/GameScreen.js`: screen composition and authoritative view state.
- `app/catana/components/MobilePlayerCockpit.js`: phone HUD and command row.
- `app/catana/components/MobilePrimaryTurnButton.js`: primary action and hold
  semantics.
- `app/catana/components/MobileMetaDrawer.js`: Log/Chat secondary surface.
- `app/catana/components/useLocalPlayerDockModel.js`: shared local-player
  resources, status, and playable-action model.
- The mobile dev-card button/tray or desktop rail when that feature needs
  presentation parity.

Every state/verification plan must name the relevant owners inspected before
editing; for command-row work, name all four mobile components/model above.

Never add a mobile-only derivation of playable cards, commands, stages, or
forced actions. Consume the existing model; if its interface is insufficient,
extract one shared pure helper and migrate both consumers.

## Required State Matrix

Before editing visible controls, write the expected action, disabled reason,
drawer behavior, and board interaction for every state:

- pre-roll;
- post-roll;
- waiting for another player;
- forced discard;
- robber placement;
- road, settlement, or city placement;
- game over;
- spectator and replay/postgame read-only views.

Also cover no cards, playable/unplayable cards, timing blocks, resource
overflow/shortage, and disconnect/reconnect. Check active and disabled copy.
Hold-to-confirm must ignore taps and early release, cancel on pointer
leave/cancel or conflicting gesture, and invoke the action exactly once.

## Touch And Layout Contract

- Give important controls at least 44px targets and stable dimensions.
- Keep the primary turn action predictable and accessible when Log/Chat opens;
  drawers must not cover or steal its hold gesture.
- Keep board pan/zoom, drawer gestures, and long-press controls disjoint.
- Scope `touch-action`, context-menu suppression, tap-highlight, and selection
  CSS to the board or control that owns the gesture. Never disable normal
  browser behavior across the game screen.
- Preserve keyboard access. Route haptics through the existing haptic/effect
  layer, not direct DOM APIs.

## Verification

Use the real `/catana/dev/sandbox` state presets and
`/catana/dev/sandbox?viewportWall=1`. Verify a short phone at `375x667`, an
intermediate `390x844`, and a tall phone at `430x932`.

Walk the full state matrix; open Log and Chat; exercise board pan/zoom and
long-press; complete and cancel holds; inspect target size, text fit, board
occlusion, safe areas, drawer focus, orientation assumptions, and console
errors. Add tests for command/state/hold derivation or shared wiring. Do not add
tests for value-only CSS or timing tweaks unless requested.

Common failures are fixing only width, covering the resolving command with a
drawer, globally suppressing Safari behavior, making spectator/replay
interactive, and letting a mobile selector drift from shared gameplay truth.
