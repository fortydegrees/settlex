# Catana Synth Audio Canvas Design

Date: 2026-04-26
Scope: Dev-only audio workbench for Catana sound design and generated cue exports
Status: Approved for implementation

## Goal

Create a maintainable audio canvas for completing Catana's sound set with a consistent synthetic family.

The first pass should help us design, render, and audition sounds. It should not wire new gameplay cues into the live game yet.

The workflow should feel similar to the project's SVG iteration loop:

- keep editable source recipes in the repo,
- render concrete audio files from those recipes,
- audition variants in a dev-only surface,
- keep the current liked sounds as style anchors,
- export final files later when the direction is approved.

## Anchor Palette

Use the current Catana sounds that are already working as the reference family:

- resource pop out of tiles: `/public/sounds/ui-pop-resource-out.mp3`
- card/resource travel movement: `/public/sounds/card_woosh.mp3`
- road placement: `/public/sounds/road.mp3`
- settlement placement: `/public/sounds/settle.mp3`

These anchors imply short synthetic UI tactility:

- crisp but not harsh transients,
- rounded filtered noise movement,
- short pitched blips or chimes where useful,
- soft digital tails,
- restrained volume and duration.

## Non-goals

- No production gameplay sound wiring in v1.
- No changes to live game rules or move flow.
- No replacement of the existing liked resource and placement sounds.
- No dependency on external AI sound-generation services.
- No realistic foley, literal clock ticking, orchestral stingers, cartoon jokes, voice, or instrument-heavy cues.
- No broad refactor of `AudioManager` or the existing effects bus unless a tiny dev-lab hook proves necessary.

## Sound Direction

The sound family should feel electronic and board-game tactile rather than analog or cinematic.

Use:

- sine/triangle/square oscillators with subtle detune,
- filtered noise bursts,
- pitch envelopes,
- gain envelopes,
- short delays or comb-like resonance when they add polish,
- lightweight saturation or compression if needed for weight.

Avoid:

- realistic dice, clocks, wood knocks, coins, brass, horns, drums, or sad trombone language,
- long music-like phrases for normal gameplay actions,
- large reverbs that make the interface feel cinematic,
- one-off downloaded sounds that do not match the anchor palette.

## Approaches Considered

### 1. Anchor-matched synth pack

Generate missing sounds from code while keeping the liked existing assets as references.

Pros:

- consistent and repeatable,
- easy to iterate by changing recipe parameters,
- preserves the sounds that already fit,
- no external asset-hunting loop.

Cons:

- requires a small local synthesis/export tool,
- subjective quality still needs human auditioning.

### 2. Hybrid processed library pack

Keep anchors, then use selected external library or AI-generated clips and process them into the same family.

Pros:

- faster for complex win/lose moments,
- can fill gaps when synthesis is not expressive enough.

Cons:

- weaker consistency,
- licensing and provenance stay more fragmented,
- less maintainable than recipes.

### 3. Full generated replacement pack

Replace all Catana UI sounds with a new generated set.

Pros:

- maximum consistency.

Cons:

- discards sounds the project already likes,
- larger tuning surface,
- higher risk before the missing cue language is understood.

## Recommended Approach

Use approach 1: an anchor-matched synth pack.

The source of truth should be recipe code. Rendered audio files are outputs that can be checked into the repo when useful for auditioning or promoted into `public/sounds/` later.

## Workspace Shape

Add a separate sound-design workspace under:

- `sounds/catana-synth/`

Suggested files:

- `sounds/catana-synth/README.md`
- `sounds/catana-synth/recipes.js`
- `sounds/catana-synth/render.js`
- `sounds/catana-synth/output/`

The recipe module should define cue families and variants with explicit names, for example:

- `dice.heavy_roll_a`
- `timer.low_tick_a`
- `turn.end_press`
- `turn.end_release`
- `trade.card_shift`
- `dev.play`
- `robber.place`
- `robber.steal`
- `discard.over_limit`
- `award.vp`
- `award.longest_road`
- `award.largest_army`
- `game.start`
- `game.win`
- `game.lose`
- `chat.message`

## Rendering Model

The renderer should be deterministic for a given recipe and seed.

V1 can use a local Node script that writes PCM WAV files directly. MP3 export can use the existing local `ffmpeg` installation after WAV generation.

Recommended commands:

- `pnpm sounds:render` to render all recipes,
- optionally `pnpm sounds:render -- --cue timer.low_tick_a` for a single cue,
- optionally `pnpm sounds:render:mp3` if MP3 export is useful during auditioning.

If package script churn is not wanted in the first slice, the renderer can start as:

- `node sounds/catana-synth/render.js`

## Dev Lab

Add a dev-only route:

- `app/catana/dev/sounds/page.js`
- `app/catana/dev/sounds/SoundLabClient.js`

The route should be available only in development, matching existing Catana dev lab patterns.

The lab should:

- list generated cue groups and variants,
- play generated files from `sounds/catana-synth/output/` or a public dev-serving copy,
- show basic metadata such as duration, tags, and short recipe notes,
- include the anchor sounds in a separate reference section,
- allow fast A/B comparison between anchors and generated variants.

V1 does not need waveform editing, timeline editing, or in-browser synthesis. The goal is quick auditioning, not a full DAW.

## Cue Backlog For First Audition Pack

Draft generated variants for:

- dice: heavier electronic shake/impact options,
- timer: low-time pulse or tick that does not resemble an analog clock,
- end turn: press/release or single confirm sound based on `good_tock.mp3` direction but less real-world,
- trade: a short movement cue derived from the card/resource travel family,
- play dev card: concise reveal/commit shimmer,
- place robber: low obstruction/lock sound,
- steal card: small private pull/flick sound,
- discard / over-7: negative but not comic,
- +1 VP: small positive lift,
- longest road / largest army: award cues related to +VP but broader,
- game start: short readiness/arrival cue,
- game win / lose: restrained end-state cues, not music stingers,
- chat: quiet message arrival cue.

## Export Policy

Keep generated working files out of production paths until accepted.

During audition:

- render into `sounds/catana-synth/output/`,
- serve or copy only what the dev lab needs,
- do not replace files in `public/sounds/`.

When a cue is approved later:

- export the selected file to `public/sounds/`,
- add it to `app/catana/effects/soundThemes.js`,
- wire the relevant gameplay cue separately,
- update cue tests only for actual wiring changes.

## Testing And Verification

For v1, verification should be practical and focused:

- run the renderer and confirm expected audio files are created,
- verify the dev lab loads in development,
- verify all listed generated variants can play after browser audio unlock,
- verify anchor sounds remain playable from the same lab,
- run a targeted lint/test command only for files touched by the dev lab if needed.

Do not add game-rule tests, because v1 does not change rules or production gameplay flow.

## Open Decisions For Implementation

- Whether generated outputs should be served directly from a dev-only API route or mirrored to a public dev folder.
- Whether MP3 export should happen in v1 or WAV is enough for auditioning.
- Whether the first renderer should stay hand-written PCM synthesis or use a small audio library. Ask before adding a dependency.
