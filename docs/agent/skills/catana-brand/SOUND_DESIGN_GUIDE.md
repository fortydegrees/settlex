# SettleHex Sound Design Guide

Read this before designing, revising, or wiring any game audio. It captures the
shipped sound identity, the working process that produced it, and the lessons
learned, so new cues extend the system instead of reinventing it.

The living reference is the audition artifact ("SettleHex Start Cues",
https://claude.ai/code/artifact/04f03bf5-327c-4752-8c49-97dc41c92fb4) — every
decided cue playable with its rationale, plus parked proposals. Recipes live in
`sounds/soundkit/` (see its README for render/promote mechanics).

## The two-layer soundscape

The axis players hear is **material vs musical**, not recorded vs synthesized:

- **Table layer** — events you could film on a real table (dice, piece
  placement, card movement, the robber landing). These sound like *matter*:
  thumps, noise, impacts, **no melody**. Production method is inaudible; the
  dice stay recordings because they're great, not because they must be.
- **Interface layer** — the game talking to you (turn flow, prompts, awards,
  outcomes, timers). These speak in **pitch and motif**.
- **The glyph pattern** — when a physical event carries hidden meaning (a
  steal vs an ordinary card move), the real sound carries the event and a
  small pitched glyph layered *under* it carries the meaning. Never replace a
  physical sound to add meaning; layer.

## The family grammar

Everything is in **D major**, built from the Glasslift game-start anchor.

- **Signature motif**: 1–5–6 (D–A–B), "a lift that never lands." Start states
  it; your-turn quotes its first two notes; turn-end returns them (A→D).
- **Only win resolves.** The octave cadence is spent exactly once per match —
  that scarcity is what makes winning sound like winning. Win is also the only
  cue that touches D6. Everything else ends open.
- **Frequency sets weight.** The more often a cue plays, the shorter and drier
  it is. Your-turn and ticks are near-dry; win/lose carry the reverb tails.
- **Scale-degree vocabulary**: low D = home/ground/time · C♯ (leading tone) =
  act now · F natural (minor third) = misfortune/loss · B♭ = lament · the
  octave = victory · repeated notes = herald (reserved for awards) · a pitch
  *droop* = deflation (discard, robber block). The discard sigh's quarter-tone
  sag is the family's one deliberately out-of-tune note — keep it unique.
- **Voices** (in `sounds/soundkit/synth.py`): `beep_glass` (detuned sine
  unison — the core voice, Sonic Pi `:beep` DNA), `sine_pluck` (motion),
  `sine_bloom` (octave-bloom arrivals), `beep_droop` (deflation), `sub_thump`
  + 700 Hz knock (ground that survives laptop speakers), filtered-noise
  risers (lift — if you can point at the whoosh, it's too loud).
- **Anti-patterns**: no FM/inharmonic pings in sine-pure contexts (they read
  as fantasy shimmer — a banned aesthetic); no chiptune, orchestration,
  casino, or wooden-tabletop sounds; awards/lesser cues never get win's bloom.

## Shipped cue inventory

| Cue key | Asset | Gesture |
|---|---|---|
| (lobby match-found hook) | game-start.mp3 | Glasslift: pluck run → bloom → hanging B |
| turn:start | your-turn.mp3 | D→A quote + low tap, featherweight |
| turn:end | turn-end.mp3 | "Full Stop": one muted low-D dot, quietest cue |
| award:claim:road | award-road.mp3 | fanfare walking 5-6-7-8, panning L→R |
| award:claim:army | award-army.mp3 | martial ta-ta-ta → held bugle third |
| discard:required | discard-required.mp3 | "Chromatic Sigh": G–F♯–F, last note sags flat |
| resource:blocked | resource-blocked.mp3 | payout that deflates (A→F micro-droop) |
| timer:low / timer:critical | timer-low/critical.mp3 | tick + half-tick per second; critical rises a fourth |
| game:win | game-win.mp3 | "Ta-Da": D–A–B statement → land D5 → crown D6 |
| game:lose | game-lose.mp3 | exact mirror: D–G–F falling → settle → sink |

Wiring lives in `app/catana/effects/soundThemes.js` (theme map; unknown cue
names no-op; `allowWhenHidden` for cues that must reach background tabs) and
emitters in `GameEffects.js` (bgio-effect listeners and state-transition
effects), `GameScreen.js` (discard prompt), `components/LowTimerCue.js` (owns
its own ticker so GameScreen never re-renders), and the lobby match-found hook
in `home/HomeTableClient.js`. Card transfers support a per-transfer `cueName`
override (`effects/cardTransfer.js`) — the route for premixed woosh+glyph
variants.
Tests: `__tests__/effects/soundThemes.test.js` (mapping assertions) and
`__tests__/effects/SoundCueWiring.source.test.js` (emitter source checks).

## The working process (with David)

1. **Decompose emotion into gesture, never imitate the reference.** David
   briefs by feel: "sad trombone" meant a descending line whose last note sags
   flat; "fanfare-esque" meant repeated-note pickup + short-short-LONG held
   ending. Extract the mechanics, rebuild them sine-pure.
2. **Audition before wiring.** Render candidates, loudness-match (melodic cues
   to −16 LUFS via `ffmpeg -af ebur128`; ticks/confirmations by peak — short
   files gate out of integrated LUFS), sanity-check spectrograms
   (`showspectrumpic`), publish to the audition artifact with WAVs attached,
   and let David verdict. Offer an **A/B pair when the emotional read is
   debatable** (kind vs neutral lose, breath vs material robber); a single
   candidate when the spec is precise. Exception: a precise mechanical spec
   from David ("a tick and then a half tick") can be built and wired directly.
3. **Keep the board honest.** Winners get decided/wired badges; losers are
   retired visibly; open proposals stay at the bottom. Republish the same
   file path (or pass `url`) to keep the artifact URL stable.
4. **Promotion**: approved WAV → 192k mp3 in `public/sounds/` → theme entry →
   emitter if new → test updates → run the effects test folder + awardLogging
   + tabAttention suites + eslint. Commit assets / wiring / recipes separately.
5. **Baked rhythm beats scheduled rhythm**: multi-hit cues that repeat (timer
   tick+half-tick) ship as one asset with the subdivision baked in, so event
   jitter can't smear it.

## Hard-won lessons

- **Check what already sounds before adding.** The steal "gap" turned out to
  already play the card woosh via cardTransfer; the robber-block event already
  had `blockedTileIds` and a visual flash, needing only a one-line cue emit.
- **Prevented events deserve cues.** Silence is ambiguous — the robber-block
  sound exists because "no resources" could mean "missed" or "robbed."
- **Loudness-match before comparing.** Unmatched A/Bs crown the loudest clip.
- **Win/lose are structural twins** — when win's shape changes, re-derive lose
  as its interval-exact inversion rather than leaving a stale mirror.
- **Never sweep concurrent working-tree changes into sound commits.**

## Parked backlog (agreed, deliberately not built)

Robber-landing + steal-glyph proposals (on the artifact board, unwired) ·
trade-confirmed tick · trade-offer attention cue (when `offerTrade` in
`Game.js` ships — discard-class) · chat message · invalid-action feedback ·
opponent award-loss (currently local claims only) · ambience/music (untouched
category; the homepage's "ambient tabletop life" direction is the natural
opening). A Catan Universe audio audit (2026-08) confirmed no other missing
event classes.
