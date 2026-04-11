# Bottom-Right Turn Controls Design

Date: 2026-04-11
Scope: Catana bottom-right timer / status / roll / end-turn control redesign
Status: Approved for implementation planning

## Goal

Redesign the bottom-right turn-control area so it feels intentional, modern, and Catana-native instead of like an MVP stack of unrelated widgets.

For this slice:
- treat the bottom-right corner as the player's turn-interaction module,
- keep dice/roll affordance in that corner,
- keep a numeric timer when the timer is relevant,
- replace the current separate status box with a tighter attached status chip,
- preserve existing authoritative game-state logic and existing viewer-aware copy wherever possible.

## Non-goals

- No gameplay-rule, timer-authority, or move-legality changes.
- No rewrite of the existing status-copy model.
- No redesign of the central build/action dock itself in this slice.
- No audio/ticking implementation in this slice, though the design should leave room for low-time urgency cues later.
- No mobile-specific redesign beyond keeping the module compact and layout-stable.

## Approved Direction

Use the "Action Orb / Morph Button" structure from the design exploration, adapted to Catana's existing glass-and-lime visual language.

The bottom-right corner becomes one persistent turn-control module:
- right side: one dominant primary action button,
- left side: two stacked helper chips,
- top chip: numeric timer,
- bottom chip: short status text.

The large button keeps the same footprint and position across turn states:
- pre-roll: the button is the roll affordance,
- post-roll: the same button becomes End Turn,
- forced-action states with no click action available: the button stays visible but muted/disabled.

## UX Summary

The intended read order is:

1. See the timer at a glance.
2. Read the current short prompt/status if needed.
3. Hit the large button when a primary action is available.

The module should feel like a compact, stable control surface rather than three unrelated floating elements.

The redesign intentionally separates concerns:
- the action dock remains the place for build/trade/dev-card interactions,
- the bottom-right module becomes the place for turn pacing and turn-level actions.

## Product Rules

- The timer should remain numeric, using the existing timer visibility/gating rules.
- A visual timer ring/glow around the main button is optional secondary feedback only, not the sole time indicator.
- The main button should not move when its meaning changes from Roll to End Turn.
- The old larger standalone status box in this corner should be removed.
- Status text in the new chip should come from the existing shared status model (`gameStatus.title`) rather than from a new copy system.
- The module should remain visible through timed/forced sub-states so the corner stays spatially consistent.
- If there is no actionable button for the current local player/state, keep the button footprint and show it as disabled rather than removing it.
- Hide the entire module for game-over / replay / no-local-player states where the corner is no longer meaningful.

## Layout Structure

### Overall arrangement

- Anchor the module in the existing bottom-right zone used by the current dice/status/end-turn controls.
- The module reads as a two-column cluster:
  - left column: two stacked chips,
  - right column: large primary button.

### Left column

- Top chip: timer only.
- Bottom chip: status only.
- Both chips use compact glass styling and should feel attached to the main button as one unit.
- The timer chip should be visually tighter and slightly more numeric/instrumental.
- The status chip can be slightly wider than the timer chip to accommodate existing copy.
- When the timer is hidden, the status chip should shift into the top position rather than preserving an empty timer slot.

### Right column

- One large rounded-square button, visually dominant.
- It should feel like a Catana CTA, not a generic HUD control or skeuomorphic board-game asset.
- Rounded-square is preferred over a perfect circle because it better matches existing Catana geometry and button language.

## Visual Treatment

Follow `docs/agent/skills/catana-brand/SKILL.md`:

- main button:
  - vibrant lime CTA styling,
  - rounded-square shape,
  - strong but clean shadow,
  - subtle ring/glass framing rather than heavy chrome,
  - same placement and overall size in all button states.
- timer + status chips:
  - light glass treatment (`white/70-80` range),
  - slate text,
  - soft shadow,
  - rounded corners matching Catana's soft geometry.

Typography:
- timer uses tabular numerals and should read immediately at a glance,
- status stays concise and action-oriented,
- optional tiny uppercase kicker styling may be used only if it helps hierarchy without adding noise.

Urgency treatment:
- normal timer state stays neutral,
- low-time state may warm toward amber/rose,
- the ring/glow around the main button should become more noticeable only when time is meaningfully low,
- future ticking audio should be able to align with this same low-time state, but is not part of this slice,
- exact low-time threshold is intentionally deferred; v1 should preserve a clean path for urgency styling without requiring that threshold to be finalized during implementation planning.

## State Behavior

### Primary button modes

- `Roll`
  - shown when `canRoll` is true,
  - button icon/affordance is dice-oriented,
  - same button position/size as End Turn.
- `End Turn`
  - shown when `canEnd` is true,
  - uses the existing forward/end-turn iconography or a close evolution of it,
  - no layout shift relative to Roll.
- `Inactive`
  - shown when neither `canRoll` nor `canEnd` is true but the module itself is still relevant,
  - button remains visible and disabled/muted,
  - used for robber/discard/placement/forced-action states where the corner still provides timer + orientation value.

If both `canRoll` and `canEnd` are ever true in a transient local state, `Roll` should take precedence for presentation.

### Timer chip

- Driven by the existing timer snapshot / visibility logic.
- Remains numeric-only, for example `0:38`.
- Only renders when the current status/timer rules already allow it.

### Status chip

- Driven by existing `gameStatus.title`.
- Should remain short and viewer-aware, for example:
  - `Roll dice`
  - `Your turn`
  - `Place road`
  - `Move robber`
  - `Discard resources`
- This slice should not invent a second status semantics layer.

### Edge-case behavior

- pre-roll:
  - timer chip visible if timed,
  - status chip shows the existing roll prompt,
  - main button is active Roll.
- post-roll:
  - timer chip visible if timed,
  - status chip shows the existing current-turn prompt,
  - main button is active End Turn.
- forced-action gameplay states (`placeRoad`, `placeSettlement`, `placeCity`, robber, discard, road-building, similar):
  - timer/status chips remain active when applicable,
  - main button becomes inactive unless the state still has a real local button action.
- non-main but still relevant timed states:
  - keep the same module location and structure so the UI remains spatially stable.
- game over / replay / no active local seat:
  - hide the module entirely.

## Data + Rendering Contract

This redesign should primarily be a presentation refactor around existing state.

Reuse the existing inputs already flowing into `PlayerActionContainer`:
- `canRoll`
- `canEnd`
- `gameStatus.title`
- timer visibility derived from existing `gameStatus.showTimer` / timer snapshot logic
- existing local timer formatting unless implementation chooses to move that helper into a more focused module

Do not introduce a parallel status source or a new turn-action state machine for this slice unless implementation discovers a concrete gap in the current data model.

## File-Level Direction

Likely implementation shape:

- `app/catana/components/PlayerActionContainer.js`
  - remove the current bottom-right dice/status/end-turn presentation,
  - keep feeding the existing state into a new turn-control presentation.
- new focused turn-control component near Catana UI components
  - render the bottom-right module in isolation,
  - keep state mapping simple and presentation-focused,
  - own the visual structure for:
    - timer chip,
    - status chip,
    - morphing main button,
    - optional urgency ring/glow treatment.
- `app/catana/GameScreen.js`
  - keep existing upstream status/timer composition unless implementation finds a clean reason to extract a tiny shared helper.

An implementation may decide to keep everything in `PlayerActionContainer.js` if the diff stays small and clear, but extracting a focused turn-control child is preferred if it makes the presentation easier to reason about.

## Testing + Verification

Add focused coverage for:
- roll vs end-turn button-mode selection from existing `canRoll` / `canEnd` inputs,
- explicit precedence when both `canRoll` and `canEnd` are transiently true (`Roll` wins),
- disabled-state behavior when no button action is available but status/timer remain relevant,
- status chip using `gameStatus.title`,
- timer chip remaining gated by existing timer visibility logic,
- layout/source guards as needed for the new structure.

Manual verification should use the Catana dev sandbox:
- `/catana/dev/sandbox`

Manual states to verify:
- pre-roll local turn,
- post-roll local turn,
- forced-action states such as robber/discard/placement,
- low-time state,
- disabled/inactive button styling,
- game-over hiding behavior.

## Acceptance Criteria

- The bottom-right corner no longer reads as separate dice, status, and end-turn widgets.
- The corner instead reads as one cohesive turn-control module.
- The timer is numeric whenever it is shown.
- The main button morphs between Roll and End Turn without moving position or changing footprint.
- Forced-action states keep timer/status orientation in the same corner while showing a muted main button.
- Status copy continues to come from the existing shared status model.
- The module styling feels consistent with Catana's current glass/lime/slate design system.
- The redesign does not require gameplay-rule or timer-authority changes.

## Open Questions

- Final exact icon treatment for Roll vs End Turn is intentionally deferred to implementation/polish as long as the structure above is preserved.
- Exact low-time threshold for warm urgency styling can follow the current/future timer-audio decision, but the visual structure should support a low-time mode cleanly.
