# Match-Found Game-Start Cue Design

Date: 2026-08-06
Status: Approved for implementation

## Goal

Replace the public matchmaking flow's reuse of `turn-start.mp3` with a
dedicated cue meaning:

> Match found. Return to SettleHex now; the game is opening.

The cue must attract someone who is waiting in another browser tab while still
feeling polished and pleasant when SettleHex is already in the foreground.

## Current Product Behavior

Public queue completion already has the correct basic presentation path:

- `useLobbyHomeActions` detects that every seat is occupied.
- It requests `match-found` tab attention, invokes the homepage
  `onMatchFound` callback, and navigates to `/g/:matchID`.
- `HomeTableClient` currently makes one best-effort play of
  `/sounds/turn-start.mp3` through that callback.
- The callback respects `catana:audioMuted`, contains synchronous and autoplay
  failures, and never blocks navigation.
- `tabAttention` independently changes the hidden tab's title and favicon, so
  visual attention remains available when browser audio is unavailable.

The sound asset is therefore the main missing piece. This slice does not add a
second notification system.

## Approved Sonic Identity

The cue is a polished consumer-tech micro-mnemonic with a small amount of
playful game energy:

- approximately 75% glossy notification,
- approximately 25% kinetic pop,
- clean, modern, quick, engaging, and lightly futuristic,
- tonally open or suspended rather than explicitly major, triumphant, or
  orchestral.

It must not sound like:

- 8-bit or deliberately lo-fi game audio,
- a brittle bell, exposed sine beep, tinny hi-hat, or cheap stock UI sound,
- science-fiction ambience, an alarm, a level-up fanfare, or a cinematic
  stinger,
- acoustic fantasy or tabletop instrumentation.

## Cue Structure

The final cue should use three perceptual stages:

1. **Attention transient, 0-40 ms**
   - A clean, rounded pop with useful midrange energy.
   - It must remain audible through laptop and phone speakers without relying
     on deep bass or sharp high-frequency noise.
2. **Rising mnemonic, approximately 40-250 ms**
   - Two compact tonal events with a rising contour.
   - Use an open or suspended interval and a slight kinetic pitch gesture.
   - The motif should read as arrival and forward movement, not success or
     victory.
3. **Polished bloom, approximately 250-1,200 ms**
   - A restrained resonant tail with subtle stereo width.
   - The tail must decay cleanly and must not turn into an ambient pad or large
     reverb wash.

Target total duration is 1.0-1.3 seconds. The recognisable information must be
present within the first 300 ms so the cue still works when partially masked by
audio from another tab.

## Sound Construction

Use a hybrid, authored construction rather than a one-shot text-to-SFX result:

- a tactile recorded or resampled transient for physical polish,
- a clean synthesized or tightly processed tonal layer for the modern
  identity,
- a quiet resonant sample layer for body and bloom,
- precise envelopes, filtering, stereo placement, and final mastering to make
  the layers behave as one sound.

The first audition pack should contain three close variants of this one design,
not three unrelated concepts:

- **Clean lift:** the most neutral and premium balance.
- **Soft launch:** slightly rounder and weightier in the opening pop.
- **Kinetic gloss:** slightly more pitch movement and playful bounce.

Existing resource, card-movement, road, and settlement sounds remain contextual
anchors. The new cue may be more melodic and polished because it communicates a
rare match-level event, but its opening tactility should keep it in the same
product family.

## Calibration Batch

Before refining the three close production candidates, generate one deliberately
spread four-cue calibration batch. The batch is a hot/cold search for the melody
and notification character, not a set of presumed finalists.

The intended semantic balance is:

- 60% recognisable SettleHex signature,
- 30% connection-established confirmation,
- 10% attention notification.

Melody should carry the SettleHex identity. All four anchors must share the same
clean synthetic material, processing, loudness target, and compact envelope so
the comparison isolates melodic gesture rather than unrelated sound palettes.
Each should last approximately 0.7-1.0 seconds, communicate its identity within
the first 250 ms, and avoid shimmer, bells, pads, exposed beeps, large reverb,
and fantasy-style bloom.

Generate these four anchors:

1. **Connected** — low to high to middle, with an even rhythm and confident
   landing.
2. **Signature** — a clean three-note rising hook, cut tightly before it reads
   as magical or celebratory.
3. **Playful** — high to low to high, slightly syncopated and more pop-forward.
4. **Notification baseline** — a simpler two-note rise paired with a soft,
   tactile connection latch.

Use the current Stable Audio A2A render as the explicit “too mystical” negative
reference. Author a simple melodic guide for each anchor, then use the corrected
deterministic A2A path at a conservative guide-preserving strength. Keep rejected
working WAVs outside `public/sounds/`; promote nothing into the game during this
calibration pass.

After the user marks each anchor hotter or colder, retain the strongest gesture
and vary one dimension at a time: interval shape, rhythm, or timbre. Do not
polish all four branches in parallel.

## Runtime Contract

- Use one dedicated production asset at `/sounds/game-start.mp3` after a
  variant is explicitly approved.
- Replace only the homepage matchmaking callback's current
  `/sounds/turn-start.mp3` source.
- Play once when public queue completion commits to the match transition,
  before navigation to `/g/:matchID`.
- Use the same cue in foreground and hidden-tab cases.
- Continue respecting `catana:audioMuted`.
- Continue treating playback as best-effort. Rejected autoplay, load errors,
  or decode failures must not delay or cancel navigation.
- Do not emit the cue again from the arriving game screen.
- Preserve the existing `turn:start` cue for later player-turn transitions.
  Its initialization guard already avoids an extra turn ding merely because
  the game screen mounted.

Browser autoplay policy means background-tab sound cannot be guaranteed on
every browser or device. The existing title/favicon attention remains the
fallback; browser notification or permission-flow changes are outside this
slice.

## Asset Workflow

- Keep working WAV renders and rejected variants outside `public/sounds/`.
- Record source/library provenance alongside the audition files.
- Audition WAV masters before lossy export.
- Promote only the approved render to `public/sounds/game-start.mp3`.
- Retain a lossless source master outside the production serving path so the
  cue can be remastered without regenerating it.

## Verification

### Sound audition

- Compare all three variants at matched perceived loudness.
- Compare them against `turn-start.mp3`, `ui-pop-resource-out.mp3`,
  `card_woosh.mp3`, `road.mp3`, and `settle.mp3`.
- Check at modest volume through built-in laptop speakers and ordinary
  headphones.
- Reject any version whose attention transient becomes brittle, clicky, or
  startling in the foreground.

### Product flow

- Use the existing Catana effects lab for isolated playback and A/B checks.
- Exercise one real public queue completion with SettleHex visible.
- Exercise one completion while another browser tab is visible.
- Confirm muted mode remains silent.
- Confirm navigation continues when `audio.play()` rejects.
- Confirm the game screen does not replay `game-start` and does not create a
  duplicate initial turn notification.

## Non-Goals

- Completing the rest of the sound backlog.
- Replacing the existing liked tactile cue family.
- Adding browser notification permissions or guaranteed background playback.
- Adding a new sound-design dev route.
- Changing matchmaking, match creation, game rules, or route timing.
