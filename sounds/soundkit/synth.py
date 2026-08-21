"""SettleHex sound identity toolkit.

Clean, polished, lightly futuristic synthesis primitives:
- FM "glass keys" (harmonic ratios, fast-damped index -> premium, not fantasy shimmer)
- Additive saw stacks with a time-varying harmonic-cutoff (analog-style filter sweep,
  computed at the oscillator level so no IIR filters are needed)
- Clean sub thumps with a mid "knock" layer so they register on laptop speakers
- FFT-filtered noise risers / air
- Synthetic-IR convolution reverb (short, controlled, decorrelated stereo)

Everything renders at 48 kHz stereo float64 and is mixed into a Session buffer.
"""

import numpy as np

SR = 48000
TAU = 2 * np.pi

# ---------------------------------------------------------------- note helpers

NOTE_BASE = {"c": 0, "c#": 1, "db": 1, "d": 2, "d#": 3, "eb": 3, "e": 4,
             "f": 5, "f#": 6, "gb": 6, "g": 7, "g#": 8, "ab": 8, "a": 9,
             "a#": 10, "bb": 10, "b": 11}


def hz(note):
    """'d4' / 'f#5' / midi number -> frequency in Hz."""
    if isinstance(note, (int, float)):
        return 440.0 * 2 ** ((note - 69) / 12)
    s = note.lower()
    pitch = s.rstrip("-0123456789")
    octave = int(s[len(pitch):])
    midi = (octave + 1) * 12 + NOTE_BASE[pitch]
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---------------------------------------------------------------- envelopes

def env_perc(n, attack=0.003, decay=0.4, curve=5.0):
    """Percussive envelope: smooth attack, exponential decay, ends near zero."""
    t = np.arange(n) / SR
    a = np.minimum(t / max(attack, 1e-4), 1.0)
    a = 0.5 - 0.5 * np.cos(np.pi * a)          # cosine attack, no click
    d = np.exp(-curve * t / decay)
    env = a * d
    # force the very end to zero with a short fade
    fade = min(n, int(0.008 * SR))
    if fade > 1:
        env[-fade:] *= np.linspace(1, 0, fade)
    return env


def env_swell(n, attack, release, hold=0.0, power=2.0):
    """Swell: slow rise (power-curved), optional hold, cosine release."""
    t = np.arange(n) / SR
    total = attack + hold + release
    env = np.zeros(n)
    ai = int(attack * SR)
    hi = int(hold * SR)
    ri = n - ai - hi
    if ai > 0:
        env[:ai] = np.linspace(0, 1, ai) ** power
    if hi > 0:
        env[ai:ai + hi] = 1.0
    if ri > 0:
        env[ai + hi:] = 0.5 + 0.5 * np.cos(np.pi * np.linspace(0, 1, ri))
    return env


# ---------------------------------------------------------------- voices

def fm_glass(f0, dur, mod_ratio=3.0, index=2.0, index_decay=0.09,
             decay=0.55, attack=0.002, body=0.35, curve=5.0):
    """FM glass/keys hybrid. Harmonic mod ratios (2,3,4) keep it 'consumer-tech
    clean'; inharmonic ratios (3.5, 5.7...) would drift toward fantasy bells,
    so we avoid them. A quiet sub-octave sine adds body."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    idx = index * np.exp(-t / index_decay)
    mod = np.sin(TAU * f0 * mod_ratio * t) * idx
    car = np.sin(TAU * f0 * t + mod)
    sub = np.sin(TAU * f0 * 0.5 * t) * body
    sig = (car + sub) / (1 + body)
    return sig * env_perc(n, attack=attack, decay=decay, curve=curve)


def fm_pluck(f0, dur=0.35, brightness=3.5, decay=0.16):
    """Tight digital pluck: FM with very fast index decay + soft click."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    idx = brightness * np.exp(-t / 0.025)
    sig = np.sin(TAU * f0 * t + np.sin(TAU * f0 * 2.0 * t) * idx)
    sig *= env_perc(n, attack=0.001, decay=decay, curve=5.0)
    return sig


def bright_saw_chord(freqs, dur, nc_start=6.0, nc_end=6.0, amp_env=None,
                     detune_cents=(-7.0, 0.0, 7.0), max_harm=40, seed=7):
    """Detuned saw stack with a time-varying harmonic cutoff nc(t).

    Brightness is shaped at the oscillator level (per-harmonic rolloff around
    harmonic number nc) instead of an IIR filter -- an analog-feeling sweep
    with zero filter artifacts. Returns (left, right).
    """
    n = int(dur * SR)
    t = np.arange(n) / SR
    nc = nc_start + (nc_end - nc_start) * (t / t[-1])
    rng = np.random.default_rng(seed)
    out_l = np.zeros(n)
    out_r = np.zeros(n)
    for f0 in freqs:
        for ci, cents in enumerate(detune_cents):
            f = f0 * 2 ** (cents / 1200)
            n_harm = int(min(max_harm, 0.45 * SR / f))
            harmonics = np.arange(1, n_harm + 1)
            # per-harmonic time-varying rolloff: smooth "filter" around nc(t)
            roll = 1.0 / np.sqrt(1.0 + (harmonics[None, :] / nc[:, None]) ** 6)
            amps = roll / harmonics[None, :]
            phases = np.outer(t * TAU * f, harmonics) + rng.uniform(0, TAU, n_harm)
            voice = (np.sin(phases) * amps).sum(axis=1)
            # spread detuned voices across the field, center voice in middle
            pan = 0.5 + cents / 30.0
            out_l += voice * np.sqrt(max(0.0, 1 - pan))
            out_r += voice * np.sqrt(max(0.0, pan))
    norm = len(freqs) * len(detune_cents)
    out_l /= norm
    out_r /= norm
    if amp_env is not None:
        out_l *= amp_env
        out_r *= amp_env
    return out_l, out_r


def sub_thump(f_start=85.0, f_end=42.0, dur=0.5, glide=0.08, knock=0.12):
    """Round, confident low-end hit: exponential pitch drop + quiet mid knock
    layer (~700 Hz) so the hit still registers on small speakers."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_end + (f_start - f_end) * np.exp(-t / glide)
    phase = np.cumsum(TAU * f / SR)
    body = np.sin(phase) * env_perc(n, attack=0.002, decay=dur * 0.85, curve=5.0)
    body = np.tanh(body * 1.6) / np.tanh(1.6)
    kn = np.sin(TAU * 2 * f * t) * env_perc(n, attack=0.001, decay=0.05) * knock
    kb = fft_bandpass(np.random.default_rng(3).standard_normal(n), 500, 1600)
    kb *= env_perc(n, attack=0.0005, decay=0.02) * knock * 0.7
    return body + kn + kb


def noise_riser(dur, f_lo=400, f_hi=9000, seed=11):
    """Filtered-noise lift: crossfade dark->bright over the swell."""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    white = rng.standard_normal(n)
    dark = fft_bandpass(white, 250, f_lo)
    brightband = fft_bandpass(white, 250, f_hi)
    mix = (np.arange(n) / n) ** 2
    sig = dark * (1 - mix) + brightband * mix
    return sig * env_swell(n, attack=dur * 0.9, release=dur * 0.1, power=2.2)


def ping(f0, dur=0.8, level=1.0):
    """Small glass ping accent for the very top of a hit."""
    return fm_glass(f0, dur, mod_ratio=4.0, index=0.8, index_decay=0.04,
                    decay=0.5, body=0.0) * level


# ---------------------------------------------------------------- FFT filters

def _fft_mask(n, lo, hi, sr=SR):
    freqs = np.fft.rfftfreq(n, 1 / sr)
    mask = np.ones(len(freqs))
    if lo and lo > 0:
        mask *= 1.0 / np.sqrt(1.0 + (np.maximum(lo, 1) / np.maximum(freqs, 1e-6)) ** 4)
    if hi and hi < sr / 2:
        mask *= 1.0 / np.sqrt(1.0 + (freqs / hi) ** 4)
    return mask


def fft_bandpass(sig, lo, hi):
    spec = np.fft.rfft(sig)
    spec *= _fft_mask(len(sig), lo, hi)
    return np.fft.irfft(spec, len(sig))


def fft_highpass(sig, lo):
    return fft_bandpass(sig, lo, None)


def fft_lowpass(sig, hi):
    return fft_bandpass(sig, None, hi)


# ---------------------------------------------------------------- reverb

def make_ir(dur=1.1, decay=0.32, predelay=0.015, lo=250, hi=6800, seed=99):
    """Synthetic stereo IR: decorrelated exponentially-decaying noise,
    band-shaped for a soft, expensive-sounding tail."""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    shape = np.exp(-t / decay)
    irs = []
    for ch in range(2):
        noise = rng.standard_normal(n) * shape
        noise = fft_bandpass(noise, lo, hi)
        pd = np.zeros(int(predelay * SR))
        ir = np.concatenate([pd, noise])
        # energy-normalize so convolution roughly preserves source loudness
        ir /= np.sqrt((ir ** 2).sum()) + 1e-12
        irs.append(ir)
    return irs


def convolve(sig, ir):
    n = len(sig) + len(ir) - 1
    nfft = 1 << (n - 1).bit_length()
    out = np.fft.irfft(np.fft.rfft(sig, nfft) * np.fft.rfft(ir, nfft), nfft)
    return out[:n]


# ---------------------------------------------------------------- session

class Session:
    """Stereo mix buffer with sample-accurate placement."""

    def __init__(self, dur):
        self.n = int(dur * SR)
        self.left = np.zeros(self.n)
        self.right = np.zeros(self.n)

    def place(self, sig, at=0.0, gain=1.0, pan=0.5, width=0.0):
        """Place mono or (l, r) signal at time `at`. pan 0=L 1=R.
        width: extra Haas-style decorrelation (seconds) for mono sources."""
        if isinstance(sig, tuple):
            l, r = sig
        else:
            l = sig * np.sqrt(1 - pan)
            r = sig * np.sqrt(pan)
            if width > 0:
                shift = int(width * SR)
                r = np.concatenate([np.zeros(shift), r])[:len(l) + shift]
                l = np.concatenate([l, np.zeros(shift)])
        for buf, ch in ((self.left, l), (self.right, r)):
            i0 = int(at * SR)
            i1 = min(self.n, i0 + len(ch))
            if i1 > i0:
                buf[i0:i1] += ch[: i1 - i0] * gain

    def master(self, reverb_wet=0.22, ir_kwargs=None, drive=1.05, peak=0.891):
        """Reverb -> gentle saturation -> HP cleanup -> peak normalize -> fades."""
        irs = make_ir(**(ir_kwargs or {}))
        wl = convolve(self.left, irs[0])[: self.n]
        wr = convolve(self.right, irs[1])[: self.n]
        l = self.left + wl * reverb_wet
        r = self.right + wr * reverb_wet
        l = np.tanh(l * drive) / np.tanh(drive)
        r = np.tanh(r * drive) / np.tanh(drive)
        l = fft_highpass(l, 28)
        r = fft_highpass(r, 28)
        mx = max(np.abs(l).max(), np.abs(r).max(), 1e-9)
        l *= peak / mx
        r *= peak / mx
        fade_in = int(0.003 * SR)
        fade_out = int(0.06 * SR)
        for ch in (l, r):
            ch[:fade_in] *= np.linspace(0, 1, fade_in)
            ch[-fade_out:] *= 0.5 + 0.5 * np.cos(np.pi * np.linspace(0, 1, fade_out))
        return l, r


# ---------------------------------------------------------------- output

def write_wav(path, l, r, gain=1.0):
    """16-bit stereo WAV with TPDF dither."""
    import struct
    data = np.stack([l, r], axis=1) * gain
    data = np.clip(data, -1.0, 1.0)
    rng = np.random.default_rng(1234)
    dither = (rng.random(data.shape) - rng.random(data.shape)) / 32768.0
    pcm = np.clip((data + dither) * 32767.0, -32768, 32767).astype("<i2")
    raw = pcm.tobytes()
    with open(path, "wb") as f:
        f.write(b"RIFF" + struct.pack("<I", 36 + len(raw)) + b"WAVE")
        f.write(b"fmt " + struct.pack("<IHHIIHH", 16, 1, 2, SR, SR * 4, 4, 16))
        f.write(b"data" + struct.pack("<I", len(raw)) + raw)


def report(name, l, r):
    mono = (l + r) / 2
    rms = 20 * np.log10(np.sqrt((mono ** 2).mean()) + 1e-12)
    stereo_rms = 20 * np.log10(np.sqrt(((l ** 2 + r ** 2) / 2).mean()) + 1e-12)
    peak = 20 * np.log10(max(np.abs(l).max(), np.abs(r).max()) + 1e-12)
    print(f"{name:28s} len {len(l)/SR:5.2f}s  peak {peak:6.2f} dBFS  "
          f"rms {stereo_rms:6.2f}  mono-drop {stereo_rms - rms:5.2f} dB")


# --------------------------------------------------- round-2 "pure" voices
# Calibrated to the Sonic Pi :beep character David's earlier sketches used:
# sine-forward, gentle chorus, almost no FM bite.

def beep_glass(f0, dur, decay=0.7, attack=0.006, detune=(-4.0, 0.0, 4.0),
               h2=0.14, sheen=0.06):
    """Premium :beep — detuned sine unison + quiet octave harmonic + a fast
    3rd-harmonic 'sheen' on the attack so the note stays tactile. Stereo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out_l = np.zeros(n)
    out_r = np.zeros(n)
    for cents in detune:
        f = f0 * 2 ** (cents / 1200)
        v = (np.sin(TAU * f * t)
             + h2 * np.sin(TAU * 2 * f * t)
             + sheen * np.sin(TAU * 3 * f * t) * np.exp(-t / 0.05))
        pan = 0.5 + cents / 30.0
        out_l += v * np.sqrt(max(0.0, 1 - pan))
        out_r += v * np.sqrt(max(0.0, pan))
    env = env_perc(n, attack=attack, decay=decay, curve=5.0)
    k = len(detune)
    return out_l * env / k, out_r * env / k


def sine_pluck(f0, dur=0.32, decay=0.14):
    """Clean sine pluck: pure fundamental, small octave, fast-decaying
    brightness on the pick moment only."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (np.sin(TAU * f0 * t)
           + 0.12 * np.sin(TAU * 2 * f0 * t)
           + 0.18 * np.sin(TAU * 4 * f0 * t) * np.exp(-t / 0.03))
    return sig * env_perc(n, attack=0.001, decay=decay, curve=5.0)


def sine_bloom(freqs, dur, amp_env, detune_cents=(-5.0, 0.0, 5.0), h2=0.10):
    """Octave-bloom pad: stacked detuned sines per note, stereo spread.
    The pure-tone counterpart of bright_saw_chord."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out_l = np.zeros(n)
    out_r = np.zeros(n)
    for f0 in freqs:
        for cents in detune_cents:
            f = f0 * 2 ** (cents / 1200)
            v = np.sin(TAU * f * t) + h2 * np.sin(TAU * 2 * f * t)
            pan = 0.5 + cents / 26.0
            out_l += v * np.sqrt(max(0.0, 1 - pan))
            out_r += v * np.sqrt(max(0.0, pan))
    k = len(freqs) * len(detune_cents)
    return out_l * amp_env / k, out_r * amp_env / k


def beep_droop(f_start, f_end, dur, hold=0.10, glide_tau=0.16, decay=0.7,
               attack=0.008, detune=(-4.0, 0.0, 4.0), h2=0.10,
               vib_hz=4.5, vib_cents=6.0, vib_delay=0.35):
    """The 'sad trombone' gesture in the pure-sine palette: hold the pitch,
    then let it sag exponentially toward f_end, with a late, gentle vibrato.
    The droop reads as deflation; no brass anywhere. Stereo like beep_glass."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    tg = np.maximum(t - hold, 0.0)
    f_track = f_end + (f_start - f_end) * np.exp(-tg / glide_tau)
    vib_env = np.clip((t - vib_delay) / 0.25, 0.0, 1.0)
    vib = 2.0 ** ((vib_cents / 1200.0) * np.sin(TAU * vib_hz * t) * vib_env)
    f_track = f_track * vib
    out_l = np.zeros(n)
    out_r = np.zeros(n)
    for cents in detune:
        phase = np.cumsum(TAU * f_track * 2 ** (cents / 1200) / SR)
        v = np.sin(phase) + h2 * np.sin(2 * phase)
        pan = 0.5 + cents / 30.0
        out_l += v * np.sqrt(max(0.0, 1 - pan))
        out_r += v * np.sqrt(max(0.0, pan))
    env = env_perc(n, attack=attack, decay=decay, curve=5.0)
    k = len(detune)
    return out_l * env / k, out_r * env / k
