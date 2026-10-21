# Homepage Demo Board Design

Date: 2026-06-04
Scope: Settlehex homepage board attract loop
Status: Approved design

## Goal

Build the homepage board as a title-screen attract loop that shows real Settlehex polish without behaving like a live match.

The page should show a curated board, animate a small legal-ish four-colour sequence, use the existing build/effect sounds where browser policy allows, and leave the visitor focused on the homepage actions from the approved homepage direction brief.

## Product Position

This design extends `docs/superpowers/specs/2026-06-03-settlehex-homepage-direction-brief.md`.

The homepage board is presentation, not gameplay. It should feel alive like a polished game title screen, while preserving the CTA hierarchy:

- `Play Online` is primary.
- `Play vs Bot` is the strong no-wait secondary.
- `Play a Friend` is tertiary.

The demo board must not imply that landing-page visitors can edit tiles, place pieces manually, or interact with match controls.

## Core Architecture

The homepage board should become a small demo surface, not a patched live-game screen.

It uses:

- a curated static board preset,
- the real board geometry and visual system,
- demo-only committed piece state,
- an authored four-colour event sequence,
- the existing `GameEffects`, `createEffectBus`, `createPiecePlacementRunner`, and audio cue stack,
- tunable timing and reset values.

The key rule is:

**GSAP effects animate transitions; demo state owns what remains on the board.**

When a road, settlement, or city animates in, the placement runner creates temporary GSAP DOM. The demo board then commits the final piece into its own rendered piece state at the handoff point. The shared placement runner may continue removing its temporary DOM on completion; that behaviour is correct for real games and should not be changed for the homepage.

The demo must not call game moves, open a server connection, generate a live board, or mutate match state.

## Components

### `HomeDemoBoardShell`

Owns the homepage/title-screen layout around the board and CTA layer.

Responsibilities:

- keep CTAs readable while the board animates,
- preserve the homepage hierarchy from the direction brief,
- provide sound and identity shell controls,
- avoid active-match HUD surfaces.

### `HomeDemoBoard`

Renders the board-only visual surface.

Responsibilities:

- use the curated board preset,
- reuse the real Catana board geometry, tiles, ports, and underlay visuals,
- avoid importing a full active-game screen or live scenario that already contains pieces.

### `HomeDemoPieceLayer`

Renders committed demo roads, settlements, and cities from demo state.

Responsibilities:

- be the canonical visual state for demo pieces,
- render the final result after animation handoff,
- avoid duplicate pieces behind GSAP drops,
- support reduced-motion stable state.

### `HomeDemoEffectBridge`

Sends demo events into the existing effect stack.

Responsibilities:

- emit existing `build:place` events with stable effect ids,
- route road events to the road placement layer and node events to the node placement layer,
- map the four demo players to existing piece colours,
- use existing audio cues through `GameEffects`.

## Board Preset

V1 should use a static curated board preset.

Do not run board generation on each homepage render. The preset can be stored as JSON-like data and chosen for composition, readability, and good piece-placement targets.

The board should still use actual board geometry and real tile/port visuals so it feels native to the product.

Preset data should include the tile list, port data, and intentionally empty or sparse initial piece lists. The implementation plan should choose concrete node and edge ids for the authored loop after the curated preset is selected.

Future versions may support a small list of curated presets, selected once per session or per day. That is different from live procedural generation and should remain optional.

## Event Loop

The first loop should be authored, legal-ish, and four-colour.

Legal-ish means placements should mostly look plausible:

- roads visually connect to owned or nearby settlements,
- cities usually replace prior settlements,
- the sequence reads like players are taking turns,
- exact rule legality is less important than avoiding visually strange states.

The loop can include a slightly toy-like moment, such as a city appearing earlier than a real game would, if that moment looks good and reads clearly.

The sequence is data-driven. The final authored sequence should contain concrete target ids for every event.

```ts
type DemoEvent = {
  id: string;
  type: "place-road" | "place-settlement" | "place-city";
  player: "blue" | "red" | "green" | "orange";
  target: { edgeId: string } | { nodeId: number };
  delayMs: [number, number];
};
```

Runtime flow:

1. Start from an empty or deliberately sparse demo piece state.
2. Pick the next authored event.
3. Wait a semi-random delay within that event's configured range.
4. Emit the existing placement effect and audio cue.
5. Commit the final piece into demo state at the configured handoff timing.
6. Continue until the configured event count or sequence end.
7. Hold the completed board briefly.
8. Reset cleanly and replay.

## Tunable Parameters

The exact pacing is not product truth. It should be easy to tune during visual iteration.

Initial parameters:

- `playerCount`: default `4`
- `eventCount`: default range `8-12`
- `maxCommittedPieces`: default `8`
- `eventGapMs`: per-event range, semi-random after mount
- `resetHoldMs`: time to hold the completed board before reset
- `commitTimingMs`: handoff from temporary GSAP DOM to committed demo state
- `sequenceMode`: default `authored`
- `allowHeroCityDrop`: optional single toy-like city moment
- `activeColors`: fixed four-colour palette for the loop

Randomness should be harmless presentation randomness only. Board composition and target nodes/edges should stay curated for v1.

## Audio

V1 uses existing game sounds only.

The homepage demo is sound-on by preference, but browser autoplay policy must be handled gracefully:

- try to play existing build/effect cues when the loop starts,
- if autoplay is blocked, keep the visual loop running silently,
- arm audio on first user gesture,
- keep the visible sound control consistent with the intended sound-on state,
- do not add homepage-only sound assets in v1.

Sound should stay sparse: placement/build moments only. No ambient loop is part of v1.

## Reduced Motion

Reduced-motion mode should not run the animated event loop.

Instead, it should render a stable curated board state that still shows the product clearly. That state can include a small set of pieces from the same four-colour palette, but it should avoid repeated timed motion.

## Performance

The homepage should be cheap to load and stable:

- no runtime board generation,
- no server connection,
- no game engine moves,
- no full live-game HUD,
- static curated board preset,
- client-only timing jitter after mount,
- timers and effect subscriptions cleaned up on unmount.

The board should be safe for desktop and mobile homepage rendering.

## Verification

V1 should be verified in the dev homepage route before promotion:

- desktop screenshot,
- mobile screenshot,
- timing check that committed pieces persist after GSAP cleanup,
- check that no duplicate scenario pieces show behind animated drops,
- check that four colours appear during the loop,
- check that the reset reads intentional,
- check reduced-motion mode,
- check console cleanliness,
- check that CTA layout remains readable over the board.

Focused automated checks can stay light unless shared logic changes. This is presentation work; browser verification is more important than broad test coverage unless the implementation changes reusable event or state helpers.

## Rollout

Stage the work in `/catana/dev/home-table` first.

After the loop is visually stable:

1. remove dependency on any dev scenario pieces,
2. verify the title-screen composition with CTAs,
3. promote the demo-board surface into the real homepage,
4. keep the old homepage route or prototype available only if useful for comparison.

## Non-Goals

- Do not build a real replay engine for v1.
- Do not run board generation on every homepage render.
- Do not make the homepage board interactive.
- Do not modify shared game effect cleanup semantics just for the homepage.
- Do not add new sound assets or ambience in v1.
- Do not introduce active-match HUD controls into the homepage.
