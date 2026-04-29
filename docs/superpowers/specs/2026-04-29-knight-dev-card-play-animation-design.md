# Knight Dev Card Play Animation Design

Date: 2026-04-29
Scope: Catana Knight play animation, local/opponent presentation split, sandbox tuning hooks
Status: Draft for implementation planning

## Goal

Make playing a Knight development card feel like a clear public game moment while preserving the different local and opponent experiences.

For this slice:
- implement Knight end to end first,
- use the existing `bgio-effects` + local effect bus + GSAP architecture,
- support local, opponent, and spectator presentation from one authoritative event contract,
- use `/catana/dev/sandbox` as the primary high-fidelity tuning surface,
- leave Year of Plenty, Monopoly, and Road Building for later slices.

## Non-goals

- No full redesign of the dev-card tray, opponent boxes, or player avatar stats.
- No animation implementation for non-Knight dev cards in this slice.
- No new persistent user settings UI.
- No gameplay-rule change to Knight, robber, stealing, or Largest Army scoring.
- No server-authoritative animation state. Animation remains client presentation.

## Existing Effect Architecture

Catana already has a cosmetic move/effect payload system:

1. Moves emit payloads through `context.effects`.
2. `app/catana/Game.js` registers effect names and durations with `EffectsPlugin`.
3. `app/catana/effects/GameEffects.js` listens with `useEffectListener(...)`.
4. `GameEffects` normalizes those events onto the local `EffectBus`.
5. `app/catana/effects/registry.js` routes bus events to GSAP runners.
6. Runners render detached DOM actors in `EffectLayer` and emit audio cues.

Resource distribution is the model:
- moves emit `distributeCardsFromTile`,
- `GameEffects` emits `resource:distribution`,
- `resourceDistribution.js` animates card fronts from board tiles to HUD targets,
- cue labels trigger sounds through `AudioManager`.

Piece placement is the model for local/opponent split:
- local pickup/cursor-follow is client-only interaction state,
- all viewers receive the same `placePiece` effect payload,
- all viewers see the final settlement/road/city drop.

Knight should follow the same separation:
- local pre-action affordance is local UI,
- public play/resolve moments come from move effects,
- the client chooses local vs opponent presentation from viewer perspective.

## Product Behavior

### Local Viewer

When the current player clicks a playable Knight:

1. The Knight card lifts or hops out of the local dev-card tray.
2. It grows slightly and stays visually active while the robber is being placed.
3. The normal robber placement/follower UI continues to work.
4. When robber placement/steal resolves, the played Knight card flies to that player's Largest Army / knight-count indicator.
5. The visible knight count and Largest Army highlight release on the landing boundary.

The underlying engine state may update immediately. The delayed count/highlight is local presentation, similar to the dev-card purchase reveal freezing local hand/VP display.

### Opponent / Spectator Viewer

When another player plays Knight:

1. A card emerges from that player's opponent dev-card stack.
2. It grows slightly, flips/reveals as a Knight, and rests below the opponent player box as a visible played-card marker.
3. It stays parked while the opponent moves the robber and steals.
4. When robber resolution finishes, the card flies to that player's Largest Army / knight-count indicator.
5. The visible knight count and Largest Army highlight release on landing.

Opponent and spectator presentation can share the same path for this slice.

## Event Contract

Add two public cosmetic effects.

### `devCardPlayStarted`

Emitted after `playDevCardStart("knight")` succeeds and before/while the robber stage begins.

Payload:

```js
{
  effectId: "devcard:knight:0:turn-12",
  playerId: "0",
  cardType: "knight",
  phase: "start",
  startedFromStage: "preRoll" | "postRoll",
  previousKnightsPlayed: 2,
  nextKnightsPlayed: 3,
  previousLargestArmyOwnerId: null,
  nextLargestArmyOwnerId: "0"
}
```

The exact `effectId` shape can vary, but it must be stable enough to dedupe duplicate local emissions.

### `devCardPlayResolved`

Emitted from robber resolution when the pending Knight play is complete. This includes normal `moveRobber`, automatic robber moves, and the no-valid-tile skip path.

Payload:

```js
{
  effectId: "devcard:knight:0:turn-12:resolve",
  playerId: "0",
  cardType: "knight",
  phase: "resolve",
  previousKnightsPlayed: 2,
  nextKnightsPlayed: 3,
  previousLargestArmyOwnerId: null,
  nextLargestArmyOwnerId: "0"
}
```

The move layer should keep a small outer-`G` pending presentation record after the start event so resolution can emit the matching resolve event without rediscovering prior display state.

## Client Perspective

The payload stays game-oriented. The client derives presentation:

```js
const perspective =
  String(payload.playerId) === String(viewerPlayerId)
    ? "local"
    : viewerPlayerId == null
      ? "spectator"
      : "opponent";
```

For this slice, `opponent` and `spectator` use the same animation.

## Presentation State

`GameScreen` should own small local presentation state for active Knight play animations:

- active/parked played card by `playerId`,
- frozen knight count and Largest Army owner display by `playerId`,
- whether the card is waiting for resolution or flying to the stat target.

This state should not change game rules. It only affects what `PlayerAvatarStats` and the overlay render while an animation is active.

Recommended display override:

```js
{
  playerId: "0",
  knightsPlayed: 2,
  largestArmyOwnerId: null
}
```

Release that override when the resolve animation completes.

## Anchors

The runner needs DOM anchors for source, parked, and destination positions.

Add stable IDs or ref registration for:

- local dev-card type group:
  - `p{playerId}-devcard-knight`
- opponent dev-card stack:
  - `p{playerId}-devcards`
- player Largest Army / knight-count indicator:
  - `p{playerId}-largest-army`

If an anchor is missing, the runner should fail quietly:
- start effect: skip the flourish and apply the display state immediately,
- resolve effect: release the frozen display immediately.

## Runner Shape

Add a dedicated effect runner:

- `app/catana/effects/devCardPlay.js`

Responsibilities:

- build detached card actors in `EffectLayer`,
- resolve source/destination rects through injected anchor lookup functions,
- choose local vs opponent choreography from perspective,
- emit cue labels,
- call completion handlers so `GameScreen` can release display overrides.

Do not put move logic or rule checks in this runner.

Potential helper files:

- `app/catana/effects/devCardPlayPerspective.js`
- `app/catana/utils/devCardPlayAnimation.js`

Keep helpers pure where possible so timing and perspective decisions are easy to test.

## Choreography

### Local Start

- Source: local `p{playerId}-devcard-knight` group.
- Actor starts at the tray card rect.
- It lifts out, scales up slightly, and parks near/above the local hand or robber interaction area.
- The card remains visible while `moveRobber` is active.

This is a hold state, not a fixed-duration blocking effect. Do not make `devCardPlayStarted` block the board state transition.

### Opponent Start

- Source: `p{playerId}-devcards`.
- Actor starts as a dev-card back.
- It lifts out, scales up, flips to the Knight face, and parks below the opponent player box.
- The parked card implies "this card has been publicly played."

### Resolve

- Source: current parked actor if present, otherwise a fallback source near the player box.
- Destination: `p{playerId}-largest-army`.
- Actor flies to the stat target using a resource-distribution-like travel feel:
  - around `0.6s`,
  - `power2.out`,
  - a single travel cue.
- On completion, remove the actor and release the frozen stat display.

## EffectsPlugin Duration

Do not let the start effect delay robber interaction.

Recommended:
- register `devCardPlayStarted` with a very short or zero duration,
- register `devCardPlayResolved` with the resolve flight duration,
- keep the actual hold state owned by `GameScreen` presentation state, not by a long-running bgio effect duration.

This avoids the `EffectsBoardWrapper(..., { updateStateAfterEffects: true })` delaying the stage change into robber placement.

## Motion Policy

Build a seam for local animation policy now:

```js
{
  reducedMotion: boolean,
  animationsEnabled: boolean
}
```

Initial sources:
- `prefers-reduced-motion`,
- a hardcoded default of animations enabled.

Future source:
- a user-facing "disable/reduce animations" setting.

Policy behavior:
- normal: full start, parked, and resolve animations,
- reduced/disabled: skip or collapse card motion and release frozen display immediately,
- no client should block another client's log, state, or presentation based on local animation settings.

## Audio Cues

Use the existing cue bus instead of direct `Howl` creation for new Knight play sounds.

Initial cue names:

- `devcard:knight:play`
- `devcard:knight:flip`
- `devcard:knight:resolve`

If no accepted sound assets exist yet, map conservatively to existing resource pop / card woosh sounds or leave cues unmapped until audio tuning.

## Sandbox Tuning

Use `/catana/dev/sandbox` as the primary loop.

Required sandbox affordances:

- existing viewer-seat switch remains the way to inspect local vs opponent perspective,
- normal local click flow should work when the viewer has a playable Knight,
- add dev-only buttons for synthetic visual events:
  - `Opponent Plays Knight`,
  - `Resolve Opponent Knight`,
  - optionally `Reset Knight Visual`.

Synthetic buttons may emit visual-only payloads for tuning. They should be clearly dev-only and should not be treated as gameplay tests.

Real gameplay verification still uses the actual `playDevCardStart("knight")` -> `moveRobber` path.

## Error Handling

- Missing source anchor: skip start flourish; keep gameplay moving.
- Missing parked actor at resolve: use player box or stat target as fallback source.
- Missing stat destination: release frozen display immediately.
- Reconnect/backlog: do not replay stale start holds; show current state immediately.
- Route unmount: kill GSAP timelines and release overrides.
- Duplicate start/resolve payloads: dedupe by `effectId`.

## Testing

Add focused automated coverage for:

- move-level `devCardPlayStarted` payload from successful Knight play,
- no start payload for illegal Knight play,
- pending Knight presentation record is stored and cleared,
- `devCardPlayResolved` payload is emitted from normal robber resolution,
- no-valid-tile/auto robber paths clear or resolve pending presentation safely,
- `GameEffects` forwards both new effects onto the local bus,
- registry wires the new dev-card play effect runner,
- perspective helper returns `local`, `opponent`, and `spectator` correctly,
- display override helper freezes and releases knight count/Largest Army state,
- reduced/disabled motion path completes without waiting for animation.

Manual verification in `/catana/dev/sandbox`:

- local player plays Knight before rolling,
- local player plays Knight after rolling,
- viewer switches to another seat and sees opponent start/park/resolve behavior,
- auto/no-valid robber path does not leave a parked card stuck,
- reduced-motion browser setting does not leave counts or UI stuck.

## Acceptance Criteria

- Playing Knight emits an authoritative public start effect.
- Completing the robber flow emits an authoritative public resolve effect.
- Local viewer sees a held/active Knight while placing the robber.
- Opponent/spectator sees the played Knight revealed and parked below the player's box.
- Resolve flight lands on the player's Largest Army / knight count indicator.
- Visible knight count and Largest Army highlight increment on landing, not before, when animations are enabled.
- Reduced/disabled motion releases presentation immediately and never blocks gameplay.
- `/catana/dev/sandbox` can exercise local and opponent Knight animation flows.

## Open Questions

- Exact final sound mapping can wait for audio tuning.
- Exact parked-card position below opponent boxes can be tuned visually in the sandbox.
- Whether spectator should later get a distinct presentation remains deferred; for this slice it matches opponent presentation.
