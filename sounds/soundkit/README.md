# SettleHex sound kit

Deterministic synthesis recipes for the SettleHex sound identity. Every
shipped cue in `public/sounds/` is rendered from code here — nothing is
recorded, everything is regenerable and tweakable.

- `synth.py` — the toolkit: beep_glass / sine_pluck / sine_bloom / beep_droop
  voices, sub thumps, noise risers, convolution reverb, WAV output.
- `candidates_family.py` — the cue recipes (wired ones and retired variants).
- `candidates.py`, `candidates_round2.py`, `match.py` — the game-start
  exploration rounds that produced Glasslift.
- `build_audition.py` — builds the audition/reference page (published as a
  Claude artifact with embedded audio).

Render into `out/` (gitignored, ~24 MB when full):

```bash
python3 sounds/soundkit/candidates_family.py
```

Promotion: encode the approved WAV to 192k mp3 into `public/sounds/` and map
it in `app/catana/effects/soundThemes.js`. Cues are loudness-matched to
-16 LUFS (ffmpeg ebur128); ticks and confirmations are set by peak instead.
