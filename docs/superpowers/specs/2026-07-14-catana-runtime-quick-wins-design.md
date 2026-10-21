# Catana Runtime Quick Wins Design

## Goal

Reduce avoidable steady-state React work and redundant browser listeners in the live 2D Catana game without changing countdown behaviour, board geometry, game rules, or visual presentation.

## Scope

This slice contains two independent runtime optimizations:

1. Move the regular turn timer's 250ms clock out of `GameScreen` and into the smallest desktop/mobile timer display boundary.
2. Stop each rendered road edge from subscribing independently to `window.resize`; reuse the viewport width already measured by `Board`.

Each change will be implemented and committed separately. Both changes must remain compatible with the existing action-node and HUD animation quick wins on this branch.

## Out of Scope

- A general `GameScreen` decomposition or broad component rewrite.
- Moving disconnect or idle countdown ownership out of `GameScreen`.
- Changing the 250ms countdown cadence, timer rounding, server-delay correction, low-time threshold, or low-time suppression rules.
- Changing board coordinates, road transforms, pan/zoom behaviour, or responsive breakpoints.
- Profiling or changing the left meta rail, award effects, dice, resource-count effects, log virtualization, memory soak behaviour, or network payloads.
- Adding dependencies, changing build tooling, or modifying server/game-engine behaviour.

The production performance certification harness, measured visual-effect fixes, long-session checks, and network analysis are follow-on projects with separate specs.

## Current Behaviour and Root Cause

### Turn timer

`GameScreen` owns `nowMs` and updates it every 250ms whenever the regular turn timer is visible or a disconnect/idle countdown is active. The memoized board normally rejects unchanged props, but the state update still reruns the large `GameScreen` function and the un-memoized desktop or mobile player HUD.

The timer presentation itself only needs the normalized timer snapshot plus stable status fields. Keeping the ticking state in `GameScreen` places frequently changing state above substantially more UI than necessary.

### Road edges

`Board` already calls `useWindowSize` and uses the measured width to derive its layout. `Edge`, `PlaceableEdge`, and `HoverableEdge` each call `useWindowSize` again solely to pass width into `getEdgeTransform`. Because the outer `Edge` can render one of the specialized edge components, an interactive road can register two resize listeners for the same width.

The duplicated subscriptions do not explain ordinary board-panning cost, but they are unnecessary retained listeners and duplicate work on browser resize.

## Design

### 1. Timer ownership boundary

Create a focused live-turn-timer presentation hook/component under `app/catana/components/`. It will:

- consume the already normalized `timerSnapshot` produced by `GameScreen`,
- own a local `nowMs` state and 250ms interval only while its timer is enabled,
- calculate remaining time with the existing `getTimerRemainingMs` helper,
- preserve the existing `formatTimer`, low-time threshold, and roll-status suppression behaviour,
- clean up its interval on disable, snapshot replacement, and unmount.

The tick must live inside the timer leaf, not in `PlayerActionContainer`, `MobilePlayerCockpit`, or a context provider, because those placements would continue rerendering the full HUD every 250ms.

Desktop and mobile will share the countdown calculation but keep their current markup:

- the desktop timer leaf continues to render the existing `turn-control-strip__timer` segment and low-time classes/styles,
- the mobile timer leaf continues to render the existing command-row timer box, including the `--:--` placeholder when no timer is visible.

`GameScreen` will stop calculating and passing a changing `timerMs`. It will pass the normalized snapshot plus stable visibility/status inputs. Its existing `nowMs` state remains temporarily for disconnect and idle presence. The root interval will run only while one of those presence countdowns is active.

This preserves server-authoritative timing: the server snapshot and server-delay correction remain unchanged; only the component that advances the local display clock changes.

### 2. Shared board width for edges

Add an explicit viewport-width prop to `Edge` and pass the `width` already measured by `Board` at every `Edge` render site. The outer `Edge` will use that value for `getEdgeTransform` and forward it to `PlaceableEdge` or `HoverableEdge`.

All three edge components will remove their `useWindowSize` calls, and `Edge.js` will remove the hook import. No global singleton, context, or new resize abstraction is required.

Passing the same width that `Board` already uses keeps road geometry synchronized with the board layout and removes the listener fan-out without changing coordinate calculations.

## Data Flow

### Timer

```text
server timer snapshot
  -> GameScreen normalization and visibility gate
  -> stable timerSnapshot/status props
  -> desktop or mobile timer leaf
  -> local 250ms nowMs
  -> getTimerRemainingMs
  -> existing timer text and low-time presentation
```

Disconnect and idle presence continue through the existing `GameScreen` clock in this slice.

### Edge width

```text
useWindowSize in Board
  -> Board width
  -> Edge viewportWidth prop
  -> PlaceableEdge or HoverableEdge
  -> getEdgeTransform
```

## Testing

### Timer regression coverage

- Update the render-performance guard to require that `GameScreen`'s interval is gated only by disconnect/idle countdowns.
- Add focused coverage for the timer leaf's enabled/disabled interval lifecycle using injected or fake clock functions where practical.
- Keep pure formatting, remaining-time, server-delay, low-time threshold, and suppression tests.
- Update desktop and mobile presentation tests so their existing timer text, hidden state, placeholder, and low-time classes remain locked in.
- Verify that a normal visible turn timer no longer changes `GameScreen` state every 250ms.

### Edge regression coverage

- Add a source-level guard that `Edge.js` no longer imports or calls `useWindowSize`.
- Require all `Board` edge render paths to pass the measured viewport width.
- Keep existing passive-hover, build-placement, and board-layout tests green.

## Manual and Performance Verification

- Use the production-style 2D game surface at `1440x900` and `390x844`.
- Confirm desktop and mobile countdown text, timer hiding, `--:--` mobile fallback, and five-second urgency styling are visually unchanged.
- Confirm timer intervals stop when hidden and after unmount.
- Confirm placed, placement, passive-hover, and buildable road transforms remain aligned before and after viewport resize.
- Capture a focused React render-count comparison showing that a normal visible timer updates the timer leaf without recurring `GameScreen` or full player-HUD commits.
- Run focused tests and lint for every touched file, followed by the smallest relevant Catana verification set.

## Acceptance Criteria

- A normal visible turn timer does not update `GameScreen` state every 250ms.
- Only the mounted desktop or mobile timer leaf advances the regular turn countdown.
- Countdown cadence, formatting, server-delay handling, hiding rules, and low-time behaviour are unchanged.
- Disconnect and idle countdowns continue to update correctly.
- `Edge.js` has no `useWindowSize` subscription and receives viewport width from `Board`.
- Road geometry and all placement/hover interactions remain unchanged at desktop and mobile sizes and after resize.
- No dependency, server, engine, network, rail-animation, or broad `GameScreen` refactor is included.

## Follow-On Work

After these two changes land, create a separate production performance certification design covering concurrent gameplay scenarios, frame/long-task traces, React commits, heap/DOM/listener soak checks, and WebSocket message sizes. Use that evidence to rank any rail, effect, log, memory, or network work instead of changing those paths speculatively.
