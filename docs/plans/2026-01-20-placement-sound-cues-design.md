# Placement Sound Cues Design

Date: 2026-01-20

## Goal
- Use a distinct sound for settlement placement and road placement.
- Keep the placement animation visuals unchanged.
- Keep the pipeline simple so future city sound can be added later.

## Non-goals
- No new audio system or cue bus changes beyond adding cues.
- No city-specific sound yet (handled later).
- No animation timing or visual changes.

## Current state
- Placement visuals are triggered by the effect bus event `build:place`.
- Placement audio uses cue `build:place`, mapped in `app/catana/effects/soundThemes.js`.
- Effects Lab placement entry currently exposes only `build:place`.

## Proposed approach
1. Emit distinct audio cues from placement:
   - `build:settlement` for settlement placement.
   - `build:road` for road placement.
2. Keep the existing effect bus event `build:place` for visuals.
3. Map the new cues in `soundThemes.js`:
   - `build:settlement` -> `/sounds/settle.mp3`
   - `build:road` -> `/sounds/road.mp3`
4. Keep `build:place` mapping for compatibility (optional fallback).
5. Update Effects Lab placement entry to include both new cues so the override applies.
6. Move audio assets into `public/sounds/` so they are served under `/sounds/*`.

## Data flow
Placement action
-> effect bus event `build:place` (visuals)
-> audio cue `build:settlement` or `build:road`
-> AudioManager plays mapped file via soundThemes

## Error handling
- If a sound file is missing, audio fails silently but visuals still run.
- No new runtime logging; keep behavior deterministic.

## Testing & verification
- Update Effects Lab audio override test to expect new cues.
- Update AudioManager format test to use a new cue.
- Add/extend placement wiring test to assert cue selection per piece type.
- Manual: in Effects Lab and live placement, verify distinct sounds play.
