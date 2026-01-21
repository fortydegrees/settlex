# Dice Roll Audio Variants Design

Date: 2026-01-21

## Goal
- Replace the single dice roll cue with 5 roll variants.
- Avoid repetitive playback via a shuffle bag (no immediate repeats).
- Add subtle per-play volume/pitch jitter that does not affect performance.
- Keep the existing cue bus + AudioManager workflow intact.
- Move dice roll assets to `public/sounds/` so they resolve under `/sounds/*`.

## Non-goals
- No new cues or gameplay logic changes.
- No new UI controls or settings for audio variation.
- No per-sound start-offset jitter (protect the transient).
- No changes to effect bus or hidden-tab policy.

## Current state
- `dice:roll` maps to a single file in `app/catana/effects/soundThemes.js`.
- `createAudioManager` caches one Howl per cue and plays via the cue bus.
- Cue entries support `volume`, `format`, and `allowWhenHidden`.

## Proposed approach
1. Update the `dice:roll` theme entry to use variants:
   - `variants: ["/sounds/dice_roll1.mp3", ..., "/sounds/dice_roll5.mp3"]`.
   - Keep `volume` and `allowWhenHidden` as-is.
   - Add dice-only options: `shuffle: true` and `randomize: { volume: [0.9, 1.0], rate: [0.98, 1.02] }`.
2. Extend `AudioManager` to support `variants`:
   - Maintain a per-cue shuffle bag of variant indices.
   - Draw without replacement; when empty, refill and reshuffle.
   - Prevent immediate repeats across refills by swapping if the first draw matches the last variant.
   - Cache a Howl per variant `src` (not per cue), so only 5 Howls total for dice.
   - On play, apply jitter using the per-sound id from `howl.play()`:
     - `howl.rate(value, id)` and `howl.volume(value, id)`.
3. Move dice roll mp3s from `sounds/` to `public/sounds/`.
4. Keep the existing hidden-tab policy (`allowWhenHidden`) and mute behavior intact.

## Data flow
Dice roll action
-> effect bus cue `dice:roll`
-> AudioManager selects a variant (shuffle bag)
-> Howler plays variant with per-play rate/volume jitter

## Error handling
- Missing theme entry or variant list: do nothing (current behavior).
- Missing audio file: Howler plays silence; no new logging.
- If `variants` is present but empty, fall back to no-op.

## Testing & verification
- Manual: trigger dice roll in-game (or via dev tooling) and verify no immediate repeats.
- Manual: listen for subtle variation in loudness/pitch over multiple rolls.
- Manual: confirm dice roll still plays while tab is hidden (allowed cue).
