# Catana Synth Audio Canvas Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-only audio canvas for generating, rendering, and auditioning Catana's missing synthetic sound cues without wiring them into gameplay.

**Architecture:** Keep deterministic sound recipes under `sounds/catana-synth/` as the editable source of truth. Render WAV audition files and a manifest into `sounds/catana-synth/output/`, then expose those files to a development-only Next lab via a guarded file route. The live game audio mapping stays untouched.

**Tech Stack:** Node.js ESM scripts, hand-written PCM WAV synthesis, Vitest, Next.js App Router, React client component, Tailwind/Catana UI styling, no new dependencies.

---

## Scope Guardrails

- Do not modify `app/catana/effects/soundThemes.js` in this pass.
- Do not replace anything in `public/sounds/`.
- Do not add dependencies.
- Do not import or embed Strudel in v1. The official Strudel docs call out AGPL integration obligations, and a full live-coding/pattern engine is more than this one-shot UI sound workflow needs.
- Do not add package scripts unless the user explicitly approves build-tooling/script changes during execution.
- Keep generated audition files under `sounds/catana-synth/output/`.
- If generated WAV output is unexpectedly large, stop before committing the generated files and ask whether to keep outputs checked in or require local rendering.
- Before building the lab UI, re-read `docs/agent/skills/catana-brand/SKILL.md`.

## Research Inputs To Capture

Use these sources as design references, not vendored code:

- Strudel docs: pattern/event scheduling, mini-notation ideas, synth waveforms, noise colors, additive partials, sample maps, and browser audition workflows.
- Dittytoy docs: compact JavaScript synth definitions, `play`/`sleep` style sequencing, ADSR envelopes, dynamic options, filters, and exportable browser-generated audio.
- Dittytoy example `#01 Play a Melody`: a simple short melodic motif can be close to the game-start/readiness family. Do not copy it as a final game cue; use it to justify adding MIDI-note helpers and event sequencing to the local renderer.
- HN discussion: treat live-coding tools as inspiration for fast exploration, but keep Settlex's source-of-truth recipe format small, deterministic, and local.

Implementation implication:

- Add a small local event scheduler instead of a Strudel dependency.
- Add `midiToHz` / note-name support so game-start and award cues can be written musically when that is clearer than raw Hz.
- Add tone partials, colored noise, and delay/filter processing before spending time hand-tuning individual cue files.
- Keep recipe metadata able to store `referenceUrls` for provenance and future review.

## File Structure

Create:

- `sounds/catana-synth/package.json`  
  Declares `"type": "module"` so local renderer files can use ESM without changing the repo root package type.

- `sounds/catana-synth/synth.js`  
  Small deterministic synthesis library: seeded random, oscillator rendering, tone partials, colored noise bursts, event scheduling, ADSR-ish gain envelopes, simple one-pole filters, delay, saturation, mixing, normalization, WAV encoding.

- `sounds/catana-synth/synth.test.js`  
  Unit tests for deterministic output, sample lengths, finite sample values, and WAV header encoding.

- `sounds/catana-synth/recipes.js`  
  Recipe catalog for anchor metadata and first audition variants.

- `sounds/catana-synth/references.md`  
  Short research notes and links explaining which Strudel/Dittytoy ideas influenced the local recipe format.

- `sounds/catana-synth/render.js`  
  CLI renderer. Supports all cues, `--cue <id>`, `--clean`, and writes `manifest.json`.

- `sounds/catana-synth/render.test.js`  
  Unit tests for recipe filtering and manifest generation using a temporary output directory.

- `sounds/catana-synth/output/.gitkeep`  
  Keeps the output folder present before first render.

- `sounds/catana-synth/README.md`  
  Short workflow notes for editing recipes, rendering, and auditioning.

- `app/catana/dev/sounds/page.js`  
  Development-only server route for the sound lab.

- `app/catana/dev/sounds/soundLabData.js`  
  Server-only helper that reads the generated manifest and builds anchor/generated data for the client.

- `app/catana/dev/sounds/files/[...file]/route.js`  
  Development-only guarded file route that serves generated WAV files from `sounds/catana-synth/output/`.

- `app/catana/dev/sounds/SoundLabClient.js`  
  Client lab UI for A/B playback of anchors and generated variants.

- `app/catana/__tests__/SoundLabRoute.source.test.js`  
  Source tests for dev-only gating and safe file-route structure.

- `app/catana/__tests__/SoundLabClient.source.test.js`  
  Source tests for anchor/generated playback affordances and no production sound-theme wiring.

Modify:

- `docs/agent/PROGRESS.md`  
  Add a short implementation note after meaningful changes.

- `docs/agent/NOTES.md`  
  Add any durable audio-canvas workflow notes learned during implementation.

Do not modify:

- `app/catana/effects/soundThemes.js`
- `public/sounds/*`
- `package-lock.json`

---

### Task 1: Create The Synth Workspace And Core Renderer Primitives

**Files:**
- Create: `sounds/catana-synth/package.json`
- Create: `sounds/catana-synth/synth.js`
- Create: `sounds/catana-synth/synth.test.js`
- Create: `sounds/catana-synth/output/.gitkeep`

- [ ] **Step 1: Add the local ESM package marker and output folder**

Create `sounds/catana-synth/package.json`:

```json
{
  "type": "module"
}
```

Create `sounds/catana-synth/output/.gitkeep` as an empty file.

- [ ] **Step 2: Write failing tests for core synthesis utilities**

Create `sounds/catana-synth/synth.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  createSeededRandom,
  encodeWav16,
  midiToHz,
  renderRecipeToSamples
} from "./synth.js";

describe("catana synth utilities", () => {
  it("renders deterministic finite samples for a recipe", () => {
    const recipe = {
      id: "test.ping",
      durationMs: 120,
      seed: 11,
      layers: [
        {
          type: "tone",
          wave: "sine",
          frequency: { from: 660, to: 440 },
          gain: 0.35,
          envelope: { attackMs: 2, decayMs: 35, sustain: 0.15, releaseMs: 70 }
        },
        {
          type: "noise",
          gain: 0.08,
          filter: { type: "lowpass", frequency: 1800 },
          envelope: { attackMs: 0, decayMs: 20, sustain: 0, releaseMs: 30 }
        }
      ]
    };

    const first = renderRecipeToSamples(recipe, { sampleRate: 8000 });
    const second = renderRecipeToSamples(recipe, { sampleRate: 8000 });

    expect(first).toHaveLength(960);
    expect(Array.from(first.slice(0, 24))).toEqual(Array.from(second.slice(0, 24)));
    expect(first.every(Number.isFinite)).toBe(true);
    expect(Math.max(...first)).toBeLessThanOrEqual(1);
    expect(Math.min(...first)).toBeGreaterThanOrEqual(-1);
  });

  it("creates repeatable seeded random streams", () => {
    const a = createSeededRandom(123);
    const b = createSeededRandom(123);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("converts midi notes to frequency for melodic cue recipes", () => {
    expect(Math.round(midiToHz(69))).toBe(440);
    expect(Math.round(midiToHz("c4"))).toBe(262);
    expect(Math.round(midiToHz("f#4"))).toBe(370);
  });

  it("renders event sequences at their scheduled offsets", () => {
    const recipe = {
      id: "test.sequence",
      durationMs: 350,
      seed: 12,
      events: [
        {
          atMs: 0,
          layers: [
            {
              type: "tone",
              wave: "sine",
              frequency: "c4",
              gain: 0.25,
              durationMs: 80,
              envelope: { attackMs: 1, decayMs: 20, sustain: 0.1, releaseMs: 45 }
            }
          ]
        },
        {
          atMs: 180,
          layers: [
            {
              type: "tone",
              wave: "triangle",
              frequency: "f4",
              gain: 0.25,
              durationMs: 80,
              envelope: { attackMs: 1, decayMs: 20, sustain: 0.1, releaseMs: 45 }
            }
          ]
        }
      ]
    };

    const samples = renderRecipeToSamples(recipe, { sampleRate: 1000 });
    const earlyEnergy = samples.slice(0, 120).reduce((sum, value) => sum + Math.abs(value), 0);
    const middleEnergy = samples.slice(120, 170).reduce((sum, value) => sum + Math.abs(value), 0);
    const laterEnergy = samples.slice(180, 300).reduce((sum, value) => sum + Math.abs(value), 0);

    expect(earlyEnergy).toBeGreaterThan(middleEnergy);
    expect(laterEnergy).toBeGreaterThan(middleEnergy);
  });

  it("encodes a playable PCM WAV header", () => {
    const wav = encodeWav16(new Float32Array([0, 0.5, -0.5]), {
      sampleRate: 8000
    });

    expect(Buffer.isBuffer(wav)).toBe(true);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run:

```bash
pnpm exec vitest run sounds/catana-synth/synth.test.js
```

Expected: FAIL because `sounds/catana-synth/synth.js` does not exist yet.

- [ ] **Step 4: Implement minimal deterministic synthesis utilities**

Create `sounds/catana-synth/synth.js` with these exported functions:

```js
const TAU = Math.PI * 2;

export function createSeededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const NOTE_BASE = {
  c: 0,
  "c#": 1,
  db: 1,
  d: 2,
  "d#": 3,
  eb: 3,
  e: 4,
  f: 5,
  "f#": 6,
  gb: 6,
  g: 7,
  "g#": 8,
  ab: 8,
  a: 9,
  "a#": 10,
  bb: 10,
  b: 11
};

export function midiToHz(note) {
  if (typeof note === "number") return 440 * 2 ** ((note - 69) / 12);
  const match = String(note).toLowerCase().match(/^([a-g](?:#|b)?)(-?\d+)$/);
  if (!match) return 440;
  const [, pitch, octaveText] = match;
  const midi = (Number(octaveText) + 1) * 12 + NOTE_BASE[pitch];
  return midiToHz(midi);
}

const resolveRamp = (config, t) => {
  if (typeof config === "string") return midiToHz(config);
  if (typeof config === "number") return config;
  const from = config?.from ?? config?.to ?? 440;
  const to = config?.to ?? from;
  const fromHz = typeof from === "string" ? midiToHz(from) : from;
  const toHz = typeof to === "string" ? midiToHz(to) : to;
  return fromHz + (toHz - fromHz) * clamp(t, 0, 1);
};

const envelopeAt = (envelope = {}, timeMs, durationMs) => {
  const attackMs = Math.max(0, envelope.attackMs ?? 0);
  const decayMs = Math.max(0, envelope.decayMs ?? 0);
  const sustain = clamp(envelope.sustain ?? 0, 0, 1);
  const releaseMs = Math.max(0, envelope.releaseMs ?? 0);
  const releaseStartMs = Math.max(0, durationMs - releaseMs);

  if (attackMs > 0 && timeMs < attackMs) return timeMs / attackMs;
  if (decayMs > 0 && timeMs < attackMs + decayMs) {
    const t = (timeMs - attackMs) / decayMs;
    return 1 + (sustain - 1) * t;
  }
  if (releaseMs > 0 && timeMs > releaseStartMs) {
    const t = (timeMs - releaseStartMs) / releaseMs;
    return sustain * (1 - clamp(t, 0, 1));
  }
  return sustain;
};

const waveAt = (wave, phase) => {
  if (wave === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  if (wave === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  return Math.sin(phase);
};

const partialWaveAt = (phase, partials = []) => {
  if (!partials.length) return Math.sin(phase);
  let sum = 0;
  let total = 0;
  partials.forEach((gain, index) => {
    if (!gain) return;
    const harmonic = index + 1;
    sum += Math.sin(phase * harmonic) * gain;
    total += Math.abs(gain);
  });
  return total > 0 ? sum / total : 0;
};

const applyLowpass = (samples, frequency, sampleRate) => {
  const dt = 1 / sampleRate;
  const rc = 1 / (TAU * Math.max(20, frequency));
  const alpha = dt / (rc + dt);
  let last = 0;
  for (let index = 0; index < samples.length; index += 1) {
    last += alpha * (samples[index] - last);
    samples[index] = last;
  }
};

const applyHighpass = (samples, frequency, sampleRate) => {
  const dt = 1 / sampleRate;
  const rc = 1 / (TAU * Math.max(20, frequency));
  const alpha = rc / (rc + dt);
  let lastOut = 0;
  let lastIn = samples[0] ?? 0;
  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    const next = alpha * (lastOut + current - lastIn);
    samples[index] = next;
    lastOut = next;
    lastIn = current;
  }
};

const renderToneLayer = (layer, target, sampleRate, recipeSeed) => {
  const startSample = Math.round(((layer.startMs ?? 0) / 1000) * sampleRate);
  const durationMs = Math.max(1, layer.durationMs ?? target.length / sampleRate * 1000);
  const sampleCount = Math.round((durationMs / 1000) * sampleRate);
  let phase = layer.phase ?? 0;

  for (let i = 0; i < sampleCount; i += 1) {
    const outIndex = startSample + i;
    if (outIndex < 0 || outIndex >= target.length) continue;
    const timeMs = (i / sampleRate) * 1000;
    const t = sampleCount <= 1 ? 1 : i / (sampleCount - 1);
    const frequency = resolveRamp(layer.frequency, t);
    phase += TAU * frequency / sampleRate;
    const value = layer.partials?.length
      ? partialWaveAt(phase, layer.partials)
      : waveAt(layer.wave, phase);
    target[outIndex] += value * (layer.gain ?? 0.2) * envelopeAt(layer.envelope, timeMs, durationMs);
  }
};

const renderNoiseLayer = (layer, target, sampleRate, recipeSeed) => {
  const startSample = Math.round(((layer.startMs ?? 0) / 1000) * sampleRate);
  const durationMs = Math.max(1, layer.durationMs ?? target.length / sampleRate * 1000);
  const sampleCount = Math.round((durationMs / 1000) * sampleRate);
  const random = createSeededRandom((recipeSeed ?? 1) + (layer.seed ?? 0));
  const buffer = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const timeMs = (i / sampleRate) * 1000;
    const white = random() * 2 - 1;
    const noise = layer.color === "brown"
      ? white * 0.55
      : layer.color === "pink"
        ? white * 0.75
        : white;
    buffer[i] = noise * (layer.gain ?? 0.1) * envelopeAt(layer.envelope, timeMs, durationMs);
  }

  if (layer.filter?.type === "lowpass") applyLowpass(buffer, layer.filter.frequency, sampleRate);
  if (layer.filter?.type === "highpass") applyHighpass(buffer, layer.filter.frequency, sampleRate);

  for (let i = 0; i < buffer.length; i += 1) {
    const outIndex = startSample + i;
    if (outIndex >= 0 && outIndex < target.length) target[outIndex] += buffer[i];
  }
};

export function renderRecipeToSamples(recipe, { sampleRate = 44100 } = {}) {
  const durationMs = Math.max(1, recipe.durationMs);
  const samples = new Float32Array(Math.ceil((durationMs / 1000) * sampleRate));

  for (const layer of recipe.layers ?? []) {
    if (layer.type === "noise") {
      renderNoiseLayer(layer, samples, sampleRate, recipe.seed);
    } else {
      renderToneLayer(layer, samples, sampleRate, recipe.seed);
    }
  }

  for (const event of recipe.events ?? []) {
    for (const layer of event.layers ?? []) {
      const scheduledLayer = { ...layer, startMs: (event.atMs ?? 0) + (layer.startMs ?? 0) };
      if (scheduledLayer.type === "noise") {
        renderNoiseLayer(scheduledLayer, samples, sampleRate, recipe.seed);
      } else {
        renderToneLayer(scheduledLayer, samples, sampleRate, recipe.seed);
      }
    }
  }

  if (recipe.delay) {
    const delaySamples = Math.round(((recipe.delay.timeMs ?? 90) / 1000) * sampleRate);
    const feedback = clamp(recipe.delay.feedback ?? 0.18, 0, 0.8);
    const wet = clamp(recipe.delay.wet ?? 0.2, 0, 1);
    for (let i = delaySamples; i < samples.length; i += 1) {
      samples[i] += samples[i - delaySamples] * feedback * wet;
    }
  }

  const saturation = recipe.saturation ?? 1;
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.tanh(samples[i] * saturation);
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const normalizeTo = recipe.normalizeTo ?? 0.95;
  if (peak > normalizeTo && peak > 0) {
    const scale = normalizeTo / peak;
    for (let i = 0; i < samples.length; i += 1) samples[i] *= scale;
  }
  return samples;
}

export function encodeWav16(samples, { sampleRate = 44100 } = {}) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const value = clamp(samples[i], -1, 1);
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * bytesPerSample);
  }
  return buffer;
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run:

```bash
pnpm exec vitest run sounds/catana-synth/synth.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sounds/catana-synth/package.json sounds/catana-synth/synth.js sounds/catana-synth/synth.test.js sounds/catana-synth/output/.gitkeep
git commit -m "feat(catana): add synth audio primitives"
```

---

### Task 2: Add Recipes, Renderer CLI, And Manifest Generation

**Files:**
- Create: `sounds/catana-synth/recipes.js`
- Create: `sounds/catana-synth/render.js`
- Create: `sounds/catana-synth/render.test.js`

- [ ] **Step 1: Write failing tests for renderer helpers**

Create `sounds/catana-synth/render.test.js`:

```js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildManifest, resolveSelectedRecipes, renderRecipes } from "./render.js";
import { RECIPES } from "./recipes.js";

let tmpDir = null;

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
});

describe("catana synth renderer", () => {
  it("filters recipes by cue id", () => {
    const selected = resolveSelectedRecipes(RECIPES, { cue: "chat.message_a" });

    expect(selected.map((recipe) => recipe.id)).toEqual(["chat.message_a"]);
  });

  it("throws for an unknown cue id", () => {
    expect(() =>
      resolveSelectedRecipes(RECIPES, { cue: "missing.cue" })
    ).toThrow(/Unknown cue/);
  });

  it("builds a client-safe manifest", () => {
    const recipe = RECIPES.find((entry) => entry.id === "chat.message_a");
    const manifest = buildManifest([recipe]);

    expect(manifest.generated).toEqual([
      expect.objectContaining({
        id: "chat.message_a",
        group: "chat",
        fileName: "chat.message_a.wav",
        src: "/catana/dev/sounds/files/chat.message_a.wav"
      })
    ]);
    expect(manifest.generated[0]).not.toHaveProperty("layers");
  });

  it("renders selected recipes and a manifest to an output directory", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "catana-synth-"));

    await renderRecipes([RECIPES.find((entry) => entry.id === "chat.message_a")], {
      outputDir: tmpDir,
      sampleRate: 8000,
      clean: true
    });

    expect(fs.existsSync(path.join(tmpDir, "chat.message_a.wav"))).toBe(true);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "manifest.json"), "utf8")
    );
    expect(manifest.generated[0].id).toBe("chat.message_a");
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm exec vitest run sounds/catana-synth/render.test.js
```

Expected: FAIL because `recipes.js` and `render.js` do not exist.

- [ ] **Step 3: Add the first recipe catalog**

Create `sounds/catana-synth/recipes.js`.

Use this structure:

```js
export const ANCHOR_SOUNDS = [
  {
    id: "anchor.resource_pop",
    group: "anchors",
    label: "Resource pop",
    src: "/sounds/ui-pop-resource-out.mp3",
    note: "Existing approved tile pop sound."
  },
  {
    id: "anchor.resource_travel",
    group: "anchors",
    label: "Card/resource travel",
    src: "/sounds/card_woosh.mp3",
    note: "Existing approved card movement sound."
  },
  {
    id: "anchor.road_place",
    group: "anchors",
    label: "Road placement",
    src: "/sounds/road.mp3",
    note: "Existing approved road placement sound."
  },
  {
    id: "anchor.settlement_place",
    group: "anchors",
    label: "Settlement placement",
    src: "/sounds/settle.mp3",
    note: "Existing approved settlement placement sound."
  }
];

export const RECIPES = [
  {
    id: "chat.message_a",
    group: "chat",
    label: "Chat message A",
    description: "Quiet two-blip digital arrival cue.",
    durationMs: 220,
    seed: 101,
    tags: ["quiet", "positive", "short"],
    normalizeTo: 0.7,
    saturation: 1.2,
    layers: [
      {
        type: "tone",
        wave: "sine",
        frequency: { from: 880, to: 1040 },
        gain: 0.16,
        durationMs: 95,
        envelope: { attackMs: 2, decayMs: 22, sustain: 0.15, releaseMs: 70 }
      },
      {
        type: "tone",
        wave: "triangle",
        startMs: 82,
        frequency: { from: 1320, to: 1180 },
        gain: 0.1,
        durationMs: 105,
        envelope: { attackMs: 2, decayMs: 24, sustain: 0.12, releaseMs: 72 }
      }
    ]
  },
  {
    id: "game.start_motif_a",
    group: "game",
    label: "Game start motif A",
    description: "Short bright readiness motif inspired by Dittytoy-style play/sleep sequencing.",
    durationMs: 900,
    seed: 151,
    tags: ["positive", "melodic", "start"],
    referenceUrls: ["https://dittytoy.net/ditty/555180eb60"],
    normalizeTo: 0.72,
    saturation: 1.2,
    delay: { timeMs: 95, feedback: 0.14, wet: 0.18 },
    events: [
      { atMs: 0, layers: [{ type: "tone", wave: "sine", frequency: "c4", gain: 0.14, durationMs: 120, envelope: { attackMs: 3, decayMs: 35, sustain: 0.25, releaseMs: 70 } }] },
      { atMs: 120, layers: [{ type: "tone", wave: "sine", frequency: "c4", gain: 0.12, durationMs: 120, envelope: { attackMs: 3, decayMs: 35, sustain: 0.2, releaseMs: 70 } }] },
      { atMs: 240, layers: [{ type: "tone", wave: "triangle", frequency: "d4", gain: 0.13, durationMs: 150, envelope: { attackMs: 3, decayMs: 40, sustain: 0.18, releaseMs: 85 } }] },
      { atMs: 420, layers: [{ type: "tone", wave: "triangle", frequency: "f4", gain: 0.15, durationMs: 220, envelope: { attackMs: 4, decayMs: 60, sustain: 0.2, releaseMs: 140 } }] }
    ],
    layers: [
      {
        type: "noise",
        color: "pink",
        gain: 0.025,
        durationMs: 720,
        filter: { type: "lowpass", frequency: 3200 },
        envelope: { attackMs: 15, decayMs: 180, sustain: 0.25, releaseMs: 420 }
      }
    ]
  },
  {
    id: "timer.low_tick_a",
    group: "timer",
    label: "Low timer pulse A",
    description: "Short synthetic pulse, explicitly not an analog clock tick.",
    durationMs: 150,
    seed: 201,
    tags: ["urgent", "dry", "short"],
    normalizeTo: 0.8,
    saturation: 1.6,
    layers: [
      {
        type: "tone",
        wave: "square",
        frequency: { from: 520, to: 430 },
        gain: 0.08,
        durationMs: 70,
        envelope: { attackMs: 1, decayMs: 18, sustain: 0.08, releaseMs: 50 }
      },
      {
        type: "noise",
        gain: 0.07,
        durationMs: 55,
        filter: { type: "highpass", frequency: 1600 },
        envelope: { attackMs: 0, decayMs: 18, sustain: 0, releaseMs: 30 }
      }
    ]
  }
];
```

Then extend `RECIPES` in the same file with at least one draft for every backlog group:

- `dice.heavy_roll_a`
- `dice.heavy_impact_a`
- `turn.end_press`
- `turn.end_release`
- `trade.card_shift_a`
- `dev.play_a`
- `robber.place_a`
- `robber.steal_a`
- `discard.over_limit_a`
- `award.vp_a`
- `award.longest_road_a`
- `award.largest_army_a`
- `game.start_a` or `game.start_motif_a`
- `game.win_a`
- `game.lose_a`

Keep normal action cues under 700ms. Only `game.win_a` and `game.lose_a` may exceed 1s, and they should stay under 2.5s for v1.

- [ ] **Step 4: Implement renderer helpers and CLI**

Create `sounds/catana-synth/render.js`.

Required exports:

```js
export function resolveSelectedRecipes(recipes, { cue } = {}) {}
export function buildManifest(recipes) {}
export async function renderRecipes(recipes, options = {}) {}
```

Required behavior:

- default output directory: `sounds/catana-synth/output/`
- default sample rate: `44100`
- `--cue <id>` renders only one cue,
- `--clean` removes existing `.wav` files and `manifest.json` from the output directory first,
- write one `<recipe.id>.wav` per recipe,
- write `manifest.json` with only client-safe metadata,
- manifest `src` values must use `/catana/dev/sounds/files/<fileName>`,
- no production `/sounds/*` path for generated files.

Implementation sketch:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./recipes.js";
import { encodeWav16, renderRecipeToSamples } from "./synth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = path.join(__dirname, "output");

const parseArgs = (argv) => {
  const args = { cue: null, clean: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--clean") args.clean = true;
    if (value === "--cue") args.cue = argv[index + 1] ?? null;
  }
  return args;
};

export function resolveSelectedRecipes(recipes, { cue } = {}) {
  if (!cue) return recipes;
  const selected = recipes.filter((recipe) => recipe.id === cue);
  if (!selected.length) throw new Error(`Unknown cue: ${cue}`);
  return selected;
}

export function buildManifest(recipes) {
  return {
    version: 1,
    generatedAt: new Date(0).toISOString(),
    generated: recipes.map(({ id, group, label, description, durationMs, tags = [], referenceUrls = [] }) => {
      const fileName = `${id}.wav`;
      return {
        id,
        group,
        label,
        description,
        durationMs,
        tags,
        referenceUrls,
        fileName,
        src: `/catana/dev/sounds/files/${fileName}`
      };
    })
  };
}

const cleanOutput = (outputDir) => {
  if (!fs.existsSync(outputDir)) return;
  for (const name of fs.readdirSync(outputDir)) {
    if (name.endsWith(".wav") || name === "manifest.json") {
      fs.rmSync(path.join(outputDir, name), { force: true });
    }
  }
};

export async function renderRecipes(recipes, {
  outputDir = DEFAULT_OUTPUT_DIR,
  sampleRate = 44100,
  clean = false
} = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  if (clean) cleanOutput(outputDir);

  for (const recipe of recipes) {
    const samples = renderRecipeToSamples(recipe, { sampleRate });
    const wav = encodeWav16(samples, { sampleRate });
    fs.writeFileSync(path.join(outputDir, `${recipe.id}.wav`), wav);
  }

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(buildManifest(recipes), null, 2)}\n`
  );
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const args = parseArgs(process.argv.slice(2));
  const recipes = resolveSelectedRecipes(RECIPES, args);
  await renderRecipes(recipes, { clean: args.clean });
  console.log(`Rendered ${recipes.length} Catana synth sound(s).`);
}
```

Adjust the direct-run check if needed during implementation.

- [ ] **Step 5: Run renderer tests and fix until passing**

Run:

```bash
pnpm exec vitest run sounds/catana-synth/render.test.js sounds/catana-synth/synth.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sounds/catana-synth/recipes.js sounds/catana-synth/render.js sounds/catana-synth/render.test.js
git commit -m "feat(catana): add synth sound recipes"
```

---

### Task 3: Render The First Audition Pack

**Files:**
- Modify: `sounds/catana-synth/output/`

- [ ] **Step 1: Render all recipes**

Run:

```bash
node sounds/catana-synth/render.js --clean
```

Expected:

- stdout includes `Rendered`
- `sounds/catana-synth/output/manifest.json` exists
- one `.wav` exists for each entry in `RECIPES`

- [ ] **Step 2: Validate output files with ffprobe**

Run:

```bash
for f in sounds/catana-synth/output/*.wav; do ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f"; done
```

Expected:

- every command prints a positive duration,
- no `ffprobe` errors.

- [ ] **Step 3: Check generated output size before committing**

Run:

```bash
du -sh sounds/catana-synth/output
```

Expected: output is comfortably small for git. If the directory is larger than 5MB, stop and ask whether to commit generated audition files or keep them local-only.

- [ ] **Step 4: Commit generated audition outputs**

```bash
git add sounds/catana-synth/output
git commit -m "chore(catana): render synth audition sounds"
```

---

### Task 4: Add Server-Side Sound Lab Data And Dev File Route

**Files:**
- Create: `app/catana/dev/sounds/soundLabData.js`
- Create: `app/catana/dev/sounds/files/[...file]/route.js`
- Create: `app/catana/dev/sounds/page.js`
- Create: `app/catana/__tests__/SoundLabRoute.source.test.js`

- [ ] **Step 1: Write failing source tests for the route and data guardrails**

Create `app/catana/__tests__/SoundLabRoute.source.test.js`:

```js
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

describe("Catana sound lab route source", () => {
  it("keeps the sound lab page development-only", () => {
    const source = read("../dev/sounds/page.js");

    expect(source).toContain('process.env.NODE_ENV !== "development"');
    expect(source).toContain("notFound()");
    expect(source).toContain("SoundLabClient");
    expect(source).toContain("getSoundLabData");
  });

  it("serves generated files from the synth output directory through a guarded dev route", () => {
    const source = read("../dev/sounds/files/[...file]/route.js");

    expect(source).toContain('process.env.NODE_ENV !== "development"');
    expect(source).toContain("sounds/catana-synth/output");
    expect(source).toContain("path.resolve");
    expect(source).toContain("startsWith");
    expect(source).toContain("audio/wav");
    expect(source).not.toContain("public/sounds");
  });

  it("loads anchors from recipes and generated sounds from manifest", () => {
    const source = read("../dev/sounds/soundLabData.js");

    expect(source).toContain("ANCHOR_SOUNDS");
    expect(source).toContain("manifest.json");
    expect(source).toContain("sounds/catana-synth/output");
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/SoundLabRoute.source.test.js
```

Expected: FAIL because the route files do not exist.

- [ ] **Step 3: Implement `soundLabData.js`**

Create `app/catana/dev/sounds/soundLabData.js`.

Implementation requirements:

- import `ANCHOR_SOUNDS` from `../../../../sounds/catana-synth/recipes.js`,
- read `sounds/catana-synth/output/manifest.json` from `process.cwd()`,
- return `{ anchors, generated, manifestMissing }`,
- if the manifest is missing, return `generated: []` and `manifestMissing: true` instead of throwing.

Implementation sketch:

```js
import fs from "node:fs";
import path from "node:path";
import { ANCHOR_SOUNDS } from "../../../../sounds/catana-synth/recipes.js";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "sounds/catana-synth/output/manifest.json"
);

export function getSoundLabData() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {
      anchors: ANCHOR_SOUNDS,
      generated: [],
      manifestMissing: true
    };
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  return {
    anchors: ANCHOR_SOUNDS,
    generated: manifest.generated ?? [],
    manifestMissing: false
  };
}
```

- [ ] **Step 4: Implement the guarded generated-file route**

Create `app/catana/dev/sounds/files/[...file]/route.js`.

Implementation requirements:

- return 404 outside development,
- resolve requested file segments under `sounds/catana-synth/output`,
- reject path traversal,
- only serve `.wav`,
- return `audio/wav`,
- return 404 if missing.

Implementation sketch:

```js
import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_ROOT = path.resolve(process.cwd(), "sounds/catana-synth/output");

export async function GET(_request, { params }) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.resolve(OUTPUT_ROOT, ...(params?.file ?? []));
  if (!filePath.startsWith(`${OUTPUT_ROOT}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }
  if (!filePath.endsWith(".wav")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await fs.readFile(filePath);
    return new Response(body, {
      headers: {
        "content-type": "audio/wav",
        "cache-control": "no-store"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
```

- [ ] **Step 5: Implement the dev-only page**

Create `app/catana/dev/sounds/page.js`:

```js
import { notFound } from "next/navigation";
import { SoundLabClient } from "./SoundLabClient";
import { getSoundLabData } from "./soundLabData";

export default function SoundLabPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <SoundLabClient data={getSoundLabData()} />;
}
```

This will fail until `SoundLabClient.js` is added in the next task.

- [ ] **Step 6: Run source tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/SoundLabRoute.source.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/catana/dev/sounds/page.js app/catana/dev/sounds/soundLabData.js app/catana/dev/sounds/files/[...file]/route.js app/catana/__tests__/SoundLabRoute.source.test.js
git commit -m "feat(catana): add sound lab file routes"
```

---

### Task 5: Build The Dev-Only Sound Lab UI

**Files:**
- Create: `app/catana/dev/sounds/SoundLabClient.js`
- Create: `app/catana/__tests__/SoundLabClient.source.test.js`

- [ ] **Step 1: Re-read the Catana brand guide**

Run:

```bash
sed -n '1,220p' docs/agent/skills/catana-brand/SKILL.md
```

Expected: confirm the lab uses light Catana styling, not the darker existing effects lab styling.

- [ ] **Step 2: Write failing source tests for the client**

Create `app/catana/__tests__/SoundLabClient.source.test.js`:

```js
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

describe("Catana sound lab client source", () => {
  it("renders anchor and generated sound sections with native audio playback", () => {
    const source = read("../dev/sounds/SoundLabClient.js");

    expect(source).toContain('"use client"');
    expect(source).toContain("Approved Anchors");
    expect(source).toContain("Generated Auditions");
    expect(source).toContain("new Audio");
    expect(source).toContain("currentlyPlayingId");
    expect(source).toContain("manifestMissing");
  });

  it("keeps the lab isolated from production sound theme wiring", () => {
    const source = read("../dev/sounds/SoundLabClient.js");

    expect(source).not.toContain("DEFAULT_THEME");
    expect(source).not.toContain("soundThemes");
    expect(source).not.toContain("createAudioManager");
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/SoundLabClient.source.test.js
```

Expected: FAIL because `SoundLabClient.js` does not exist.

- [ ] **Step 4: Implement the lab client**

Create `app/catana/dev/sounds/SoundLabClient.js`.

Implementation requirements:

- `"use client"`,
- no Howler or `AudioManager`; use browser `Audio` directly for auditioning,
- one active sound at a time,
- sections for `Approved Anchors` and `Generated Auditions`,
- group generated sounds by `group`,
- display label, id, description, duration, tags,
- include a missing-manifest note that tells the developer to run `node sounds/catana-synth/render.js --clean`,
- use light Catana styling, no dark full-page lab shell,
- no in-app feature tutorial text beyond practical labels and empty-state copy.

Implementation sketch:

```js
"use client";

import React, { useMemo, useRef, useState } from "react";

const formatDuration = (durationMs) => `${(durationMs / 1000).toFixed(2)}s`;

const groupBy = (items) =>
  items.reduce((groups, item) => {
    const key = item.group ?? "other";
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});

function SoundRow({ item, active, onPlay }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="grid w-full gap-2 rounded-lg bg-white/55 px-4 py-3 text-left text-slate-800 shadow-sm ring-1 ring-white/60 transition hover:bg-white/75"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{item.label}</div>
          <div className="text-xs font-medium text-slate-500">{item.id}</div>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-white/70">
          {active ? "Playing" : "Play"}
        </span>
      </div>
      {item.description || item.note ? (
        <p className="text-sm text-slate-600">{item.description ?? item.note}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
        {item.durationMs ? <span>{formatDuration(item.durationMs)}</span> : null}
        {(item.tags ?? []).map((tag) => (
          <span key={tag} className="rounded-full bg-blue-100/80 px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

export function SoundLabClient({ data }) {
  const audioRef = useRef(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null);
  const generatedByGroup = useMemo(
    () => groupBy(data?.generated ?? []),
    [data?.generated]
  );

  const playSound = (item) => {
    audioRef.current?.pause();
    const audio = new Audio(item.src);
    audioRef.current = audio;
    setCurrentlyPlayingId(item.id);
    audio.addEventListener("ended", () => setCurrentlyPlayingId(null), {
      once: true
    });
    audio.play().catch(() => setCurrentlyPlayingId(null));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,1)_0%,_rgba(59,130,246,1)_45%,_rgba(2,132,199,1)_100%)] px-4 py-8 text-slate-800 md:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-xl bg-white/35 p-5 shadow-lg ring-1 ring-white/40 backdrop-blur-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
            Catana Audio
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Sound Canvas
          </h1>
          {data?.manifestMissing ? (
            <div className="mt-4 rounded-lg bg-amber-100/80 p-3 text-sm font-semibold text-slate-700 ring-1 ring-amber-200">
              Run `node sounds/catana-synth/render.js --clean`.
            </div>
          ) : null}
        </aside>

        <section className="space-y-6">
          <div className="rounded-xl bg-white/35 p-5 shadow-lg ring-1 ring-white/40 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-slate-900">Approved Anchors</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(data?.anchors ?? []).map((item) => (
                <SoundRow
                  key={item.id}
                  item={item}
                  active={currentlyPlayingId === item.id}
                  onPlay={playSound}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white/35 p-5 shadow-lg ring-1 ring-white/40 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-slate-900">Generated Auditions</h2>
            <div className="mt-4 space-y-5">
              {Object.entries(generatedByGroup).map(([group, items]) => (
                <div key={group}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                    {group}
                  </h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {items.map((item) => (
                      <SoundRow
                        key={item.id}
                        item={item}
                        active={currentlyPlayingId === item.id}
                        onPlay={playSound}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
```

Adjust copy and classes during implementation, but preserve the tested strings and the isolated direct-audio playback model.

- [ ] **Step 5: Run source tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/SoundLabClient.source.test.js app/catana/__tests__/SoundLabRoute.source.test.js
```

Expected: PASS.

- [ ] **Step 6: Run targeted lint**

Run:

```bash
pnpm exec eslint app/catana/dev/sounds/SoundLabClient.js app/catana/dev/sounds/page.js app/catana/dev/sounds/soundLabData.js app/catana/dev/sounds/files/[...file]/route.js app/catana/__tests__/SoundLabClient.source.test.js app/catana/__tests__/SoundLabRoute.source.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/catana/dev/sounds app/catana/__tests__/SoundLabClient.source.test.js
git commit -m "feat(catana): add synth sound lab"
```

---

### Task 6: Document The Audio Canvas Workflow

**Files:**
- Create: `sounds/catana-synth/README.md`
- Create: `sounds/catana-synth/references.md`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Write the synth workspace README**

Create `sounds/catana-synth/README.md`:

```md
# Catana Synth Sounds

This folder is the editable source for generated Catana sound auditions.

The current approved anchor sounds live in `public/sounds/` and are listed in
`recipes.js`. Generated audition files are rendered into `output/` and served
only by the dev sound lab.

## Render

```bash
node sounds/catana-synth/render.js --clean
```

Render one cue:

```bash
node sounds/catana-synth/render.js --cue chat.message_a
```

## Audition

Start the app and open:

```bash
pnpm dev
```

Then visit `/catana/dev/sounds`.

## Promotion

Do not copy files to `public/sounds/` until a cue is accepted. Promotion into
production cue wiring is a separate task.
```
```

- [ ] **Step 2: Write the research references note**

Create `sounds/catana-synth/references.md`:

```md
# Catana Synth References

These references inform the local recipe format. They are not vendored runtime
dependencies.

## Strudel

- https://strudel.cc/
- https://strudel.cc/technical-manual/project-start/
- https://strudel.patternclub.org/learn/synths/
- https://strudel.patternclub.org/learn/samples/

Useful ideas:

- pattern/event scheduling,
- compact mini-notation for rhythm,
- built-in waveforms and noise colors,
- additive partials for timbre shaping,
- sample maps for audition workflows.

Do not embed or import Strudel in v1. The official docs call out AGPL
integration obligations, and this project only needs deterministic one-shot UI
SFX exports right now.

## Dittytoy

- https://dittytoy.net/syntax/
- https://dittytoy.net/user/Dittytoy
- https://dittytoy.net/ditty/555180eb60

Useful ideas:

- small JavaScript synth functions,
- `play` and `sleep` sequencing,
- ADSR envelopes,
- dynamic options,
- filters,
- exportable browser-generated audio.

The `#01 Play a Melody` example suggests that a very short melodic sequence can
work for game-start/readiness cues. Keep Catana's final cue original; use the
example as a reference for recipe ergonomics, not as copied game audio.
```

- [ ] **Step 3: Update agent progress**

Append a concise note to `docs/agent/PROGRESS.md`:

```md
## Status (2026-04-26, Catana synth audio canvas)
- Added a dev-only Catana synth sound workspace and renderer under `sounds/catana-synth/`.
- Rendered the first generated audition WAV pack into `sounds/catana-synth/output/`.
- Added `/catana/dev/sounds` for A/B auditioning generated variants against the approved resource and placement anchor sounds.
- Left production sound theme wiring and `public/sounds/` untouched.
```

If a same-day section already exists, merge this into it instead of duplicating unnecessarily.

- [ ] **Step 4: Update durable agent notes only if needed**

If implementation reveals a lasting workflow rule, append to `docs/agent/NOTES.md` under the Catana audio note:

```md
- `sounds/catana-synth/recipes.js` is the source of truth for generated audition sounds; `sounds/catana-synth/output/` is rendered output for the dev lab.
- `/catana/dev/sounds` should stay an audition surface only until a cue is explicitly promoted into `public/sounds/` and `soundThemes.js`.
```

- [ ] **Step 5: Commit docs**

```bash
git add sounds/catana-synth/README.md sounds/catana-synth/references.md docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: document catana synth sound workflow"
```

---

### Task 7: Final Verification And Manual Audition

**Files:**
- No new source files unless verification reveals a focused bug.

- [ ] **Step 1: Run the focused automated checks**

Run:

```bash
pnpm exec vitest run sounds/catana-synth/synth.test.js sounds/catana-synth/render.test.js app/catana/__tests__/SoundLabRoute.source.test.js app/catana/__tests__/SoundLabClient.source.test.js
```

Expected: PASS.

- [ ] **Step 2: Re-render from scratch**

Run:

```bash
node sounds/catana-synth/render.js --clean
```

Expected:

- all generated `.wav` files are recreated,
- `manifest.json` is recreated,
- no unexpected changes outside `sounds/catana-synth/output/`.

- [ ] **Step 3: Run targeted lint**

Run:

```bash
pnpm exec eslint sounds/catana-synth/*.js app/catana/dev/sounds/SoundLabClient.js app/catana/dev/sounds/page.js app/catana/dev/sounds/soundLabData.js app/catana/dev/sounds/files/[...file]/route.js app/catana/__tests__/SoundLabClient.source.test.js app/catana/__tests__/SoundLabRoute.source.test.js
```

Expected: PASS.

- [ ] **Step 4: Start the dev server**

Run:

```bash
pnpm dev
```

Expected: local Next dev server starts. If port 3000 is occupied, use the port printed by Next.

- [ ] **Step 5: Browser-check the lab**

Open:

```text
http://127.0.0.1:3000/catana/dev/sounds
```

Verify:

- page loads in development,
- approved anchor sounds are listed,
- generated auditions are grouped,
- clicking a row plays the sound,
- clicking another row stops/replaces the prior sound,
- missing manifest state is not shown after rendering,
- no production gameplay screen is affected.

- [ ] **Step 6: Check production guard**

Run a source-level check:

```bash
pnpm exec vitest run app/catana/__tests__/SoundLabRoute.source.test.js
```

Expected: PASS, confirming the dev-only checks remain in source.

- [ ] **Step 7: Inspect git status**

Run:

```bash
git status --short
```

Expected:

- only intended files changed,
- existing unrelated dirty worktree changes are not reverted or included accidentally.

Do not run broad `pnpm verify` unless the touched surface grows beyond the sound workspace and dev lab.
