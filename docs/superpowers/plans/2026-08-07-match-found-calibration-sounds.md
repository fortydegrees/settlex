# Match-Found Calibration Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce four deliberately different match-found melodies for a fast hot/cold audition without changing any production game asset.

**Architecture:** Render four deterministic, lossless melodic guide WAVs with one shared compact synthetic voice. Transform each guide through the corrected Stable Audio 3 MLX audio-to-audio path using identical model, prompt, strength, steps, and seed, then apply one shared mastering pass and expose the four final WAVs for direct audition.

**Tech Stack:** Python 3, NumPy, standard-library PCM WAV I/O, Stable Audio 3 MLX `sm-sfx`, existing local model weights, ffprobe, no new dependencies.

## Global Constraints

- Keep every guide, raw render, script, metric, and audition WAV under `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/`.
- Do not modify `public/sounds/`, `app/catana/effects/soundThemes.js`, matchmaking code, or production cue wiring.
- Use 44.1 kHz stereo PCM WAV throughout and a final duration of exactly 0.95 seconds.
- Keep Stable Audio settings identical across variants: `sm-sfx`, `same-s`, 8 steps, seed `43100`, CFG `1.0`, APG `1.0`, and A2A strength `0.08`. The initial `0.15` pass was rejected because the simple short guides developed excessive percussive energy.
- The shared prompt must explicitly reject bells, shimmer, pads, fantasy, magic, cinematic bloom, and large reverb.
- Treat the batch as calibration; do not promote a candidate until the user identifies the hottest melodic gesture.

---

### Task 1: Render Four Shared-Voice Melodic Guides

**Files:**
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/render_guides.py`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/guides/01-connected.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/guides/02-signature.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/guides/03-playful.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/guides/04-notification.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/manifest.json`

**Interfaces:**
- Consumes: the four approved contour definitions from `docs/superpowers/specs/2026-08-06-match-found-game-start-cue-design.md`.
- Produces: four stereo float-derived PCM16 guides and a manifest containing `id`, `label`, `notes`, `onsetsMs`, `durationSeconds`, and `guidePath`.

**Verification shape:** Presentation/manual. The guides must be structurally distinct while sharing one voice and mastering level.

- [ ] **Step 1: Create the guide renderer**

Implement a deterministic NumPy renderer at 44,100 Hz with:

- a shared voice comprising a sine fundamental, quiet triangle second partial, and very short filtered-noise onset;
- 4 ms attack, 70 ms decay, 0.28 sustain, and 110 ms release per tonal event;
- a 30-cent downward pitch relaxation over the first 45 ms of each note;
- 5 ms master fades and a `-3 dBFS` peak ceiling;
- these exact contour definitions:
  - `connected`: MIDI `[60, 67, 64]`, onsets `[0, 115, 255]` ms, note lengths `[175, 190, 300]` ms;
  - `signature`: MIDI `[62, 65, 69]`, onsets `[0, 95, 205]` ms, note lengths `[155, 165, 320]` ms;
  - `playful`: MIDI `[72, 65, 74]`, onsets `[0, 145, 235]` ms, note lengths `[115, 150, 290]` ms;
  - `notification`: MIDI `[67, 74]`, onsets `[28, 185]` ms, note lengths `[160, 330]` ms, plus a rounded 55 Hz latch transient at 0 ms lasting 55 ms.

- [ ] **Step 2: Render the four guide WAVs and manifest**

Run:

```bash
/Users/david/coding/stable-audio-3/optimized/mlx/.venv/bin/python /Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/render_guides.py
```

Expected: four guide WAVs and `manifest.json`, with no clipping or non-finite samples.

- [ ] **Step 3: Verify guide file structure**

Run:

```bash
for calibration_wav in /Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/guides/*.wav; do
  ffprobe -v error -show_entries stream=sample_rate,channels,duration -of compact=p=0:nk=1 "$calibration_wav"
done
```

Expected for all four files: 44,100 Hz, 2 channels, 0.95 seconds.

---

### Task 2: Transform The Guides Through One Stable Audio Sound Font

**Files:**
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/generate_batch.py`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/raw/01-connected.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/raw/02-signature.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/raw/03-playful.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/raw/04-notification.wav`

**Interfaces:**
- Consumes: the four guide files and manifest from Task 1.
- Produces: four raw Stable Audio A2A WAVs with identical transformation settings.

**Verification shape:** Presentation/manual plus command-based generation evidence.

- [ ] **Step 1: Create the sequential batch runner**

Make `generate_batch.py` invoke `optimized/mlx/scripts/sa3_mlx.py` once per manifest entry with:

```text
prompt: premium consumer technology notification earcon, compact branded match-ready mnemonic, clean rounded synthetic polymer pluck, tactile connection onset, dry modern studio sound, concise confident melodic identity, no bell, no shimmer, no pad, no fantasy, no magic, no cinematic bloom, no large reverb, complete within 0.8 seconds
dit: sm-sfx
decoder: same-s
seconds: 0.95
steps: 8
seed: 43100
init-noise-level: 0.08
cfg: 1.0
apg: 1.0
```

Fail immediately if any subprocess exits non-zero or its output file is missing.

- [ ] **Step 2: Generate all four raw candidates**

Run:

```bash
/Users/david/coding/stable-audio-3/optimized/mlx/.venv/bin/python /Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/generate_batch.py
```

Expected: four successful A2A runs using a sampled latent duration of approximately 6.95 seconds before trimming, with four raw output WAVs.

---

### Task 3: Master And Verify The Audition Set

**Files:**
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/finalize_auditions.py`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/audition/01-connected.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/audition/02-signature.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/audition/03-playful.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/audition/04-notification.wav`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/metrics.json`
- Create: `/Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/spectrograms.png`

**Interfaces:**
- Consumes: four raw A2A WAVs from Task 2.
- Produces: four level-matched audition WAVs plus machine-readable metrics and one diagnostic image.

**Verification shape:** Presentation/manual. Objective checks catch clipping, silence, excessive tails, and the known repetitive-noise failure; the user makes the subjective hot/cold judgment.

- [ ] **Step 1: Create the shared finalization and analysis pass**

For each raw render:

- remove DC offset;
- apply a 4 ms fade-in and 35 ms fade-out;
- match active-signal RMS to `-20 dBFS`, measured only where the smoothed envelope exceeds `-45 dBFS`;
- limit scale so peak never exceeds `-1 dBFS`;
- write stereo PCM16 at 44.1 kHz;
- record duration, peak dBFS, active RMS dBFS, zero-crossing rate, spectral centroid, onset count, percussive-energy ratio, and final-250-ms RMS in `metrics.json`;
- render waveform and log-frequency spectrogram rows for all four files into `spectrograms.png`.

- [ ] **Step 2: Run finalization**

Run:

```bash
/Users/david/coding/stable-audio-3/optimized/mlx/.venv/bin/python /Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/finalize_auditions.py
```

Expected: four audition WAVs, `metrics.json`, and `spectrograms.png` with no clipping or non-finite metric values.

- [ ] **Step 3: Perform the focused verification**

Run:

```bash
for calibration_wav in /Users/david/.codex/visualizations/2026/08/03/019fc91a-81ce-75e2-9a6e-9a233390669d/settlehex-sounds/stable-audio-3/calibration-batch/audition/*.wav; do
  ffprobe -v error -show_entries stream=sample_rate,channels,duration -of compact=p=0:nk=1 "$calibration_wav"
done
```

Expected for all four files: 44,100 Hz, 2 channels, 0.95 seconds. Inspect `spectrograms.png` and reject any render with a dense repeating broadband tail resembling the previously diagnosed pneumatic-drill failure.

- [ ] **Step 4: Present the four audition WAVs for hot/cold feedback**

Embed all four absolute WAV paths in the Codex response, label them only by the approved anchor names, and ask which one or two are hottest. Do not claim a final production choice.
