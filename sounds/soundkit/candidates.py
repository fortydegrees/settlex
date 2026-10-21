"""SettleHex game-start jingle candidates.

Five genuinely different structural approaches, one shared sonic language:
- Key of D major throughout (signature motif: 1-5-6, D-A-B, "lift without landing")
- Shared palette: FM glass keys, warm additive saw stacks, clean sub thump,
  filtered-noise air. All future cues (win/lose/turn/timer...) draw on the same
  palette + motif so the family stays coherent.
- Every candidate ends UNRESOLVED or on an arrival that opens, never on a
  victory cadence: the message is "beginning", not "won".
"""

from synth import (Session, SR, bright_saw_chord, env_perc, env_swell,
                   fm_glass, fm_pluck, hz, noise_riser, ping, report,
                   sub_thump, write_wav)
import numpy as np
import os

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)


# ------------------------------------------------------------------ 01 IGNITION
# Rhythmic pulse-build -> downbeat arrival. Esports "match found" energy,
# but tidy: a pumping chord pulse that brightens and accelerates attention
# toward a single confident landing. Attention comes from repetition + arrival.

def ignition():
    s = Session(2.7)
    eighth = 60 / 130 / 2                      # 130 BPM eighth notes
    chord = [hz("d3"), hz("a3"), hz("e4")]     # open sus2: modern, no sweetness
    n_pulse = 6
    for i in range(n_pulse):
        frac = i / (n_pulse - 1)
        dur = 0.16
        env = env_perc(int(dur * SR), attack=0.004, decay=0.11, curve=5.0)
        nc = 3.0 + 11.0 * frac ** 1.5          # each pulse opens brighter
        l, r = bright_saw_chord(chord, dur, nc_start=nc, nc_end=nc * 1.3,
                                amp_env=env, seed=20 + i)
        s.place((l, r), at=i * eighth, gain=0.42 + 0.30 * frac)
    hit_at = n_pulse * eighth                  # 1.385 s: the downbeat
    s.place(noise_riser(hit_at - 0.25, seed=5), at=0.25, gain=0.075)
    s.place(sub_thump(90, 42, dur=0.6), at=hit_at, gain=0.95)
    stab_env = env_perc(int(1.1 * SR), attack=0.004, decay=0.85, curve=5.0)
    l, r = bright_saw_chord([hz("d3"), hz("a3"), hz("e4"), hz("b4")], 1.1,
                            nc_start=14, nc_end=5, amp_env=stab_env, seed=42)
    s.place((l, r), at=hit_at, gain=0.62)
    s.place(ping(hz("b5"), 0.9), at=hit_at, gain=0.16, pan=0.62, width=0.012)
    return s.master(reverb_wet=0.20, ir_kwargs={"decay": 0.30})


# ----------------------------------------------------------------- 02 GLASSWORK
# The signature motif, stated plainly: three FM-glass notes (D-A-B, 1-5-6)
# over a warm chord bloom. Closest to modern OS / consumer-tech chimes --
# calm confidence, the 6th on top keeps it anticipatory rather than final.

def glasswork():
    s = Session(2.3)
    motif = [("d4", 0.00, 0.50), ("a4", 0.20, 0.55), ("b4", 0.42, 0.72)]
    for i, (note, at, gain) in enumerate(motif):
        v = fm_glass(hz(note), 1.4, mod_ratio=3.0, index=2.1,
                     index_decay=0.10, decay=0.75, body=0.4)
        s.place(v, at=at, gain=gain, pan=0.40 + 0.10 * i, width=0.008)
    # chord bloom underneath the last note: soft, dark saw pad + gentle low D
    bloom_at = 0.42
    bloom_dur = 1.7
    env = env_swell(int(bloom_dur * SR), attack=0.30, hold=0.25, release=1.15)
    l, r = bright_saw_chord([hz("d3"), hz("a3"), hz("e4")], bloom_dur,
                            nc_start=3.0, nc_end=4.5, amp_env=env, seed=8)
    s.place((l, r), at=bloom_at, gain=0.34)
    n_low = int(1.6 * SR)
    low = np.sin(2 * np.pi * hz("d2") * np.arange(n_low) / SR)
    s.place(low * env_swell(n_low, attack=0.20, hold=0.3, release=1.1),
            at=bloom_at, gain=0.30)
    s.place(noise_riser(0.5, f_hi=6000, seed=21), at=0.0, gain=0.035)
    return s.master(reverb_wet=0.26, ir_kwargs={"decay": 0.36})


# ------------------------------------------------------------------- 03 LIFTOFF
# Ascending pluck arpeggio -> wide open landing. The most literal
# "anticipation" shape: energy climbs a pentatonic ladder and lands on an
# open-fifth chord that feels like a board snapping into place.

def liftoff():
    s = Session(2.5)
    step = 60 / 140 / 4                        # 140 BPM sixteenth notes
    arp = ["d4", "e4", "f#4", "a4", "b4", "d5", "e5", "f#5"]
    for i, note in enumerate(arp):
        frac = i / (len(arp) - 1)
        v = fm_pluck(hz(note), 0.30, brightness=3.2, decay=0.13)
        pan = 0.5 + (0.22 * frac) * (1 if i % 2 else -1)   # widen as it climbs
        s.place(v, at=0.05 + i * step, gain=0.34 + 0.18 * frac, pan=pan)
    land_at = 0.05 + len(arp) * step           # 0.907 s
    s.place(noise_riser(land_at - 0.05, seed=13), at=0.05, gain=0.055)
    s.place(sub_thump(85, 40, dur=0.65), at=land_at, gain=0.9)
    env = env_perc(int(1.4 * SR), attack=0.005, decay=1.05, curve=5.0)
    l, r = bright_saw_chord([hz("d3"), hz("a3"), hz("d4"), hz("a4")], 1.4,
                            nc_start=10, nc_end=4, amp_env=env, seed=31)
    s.place((l, r), at=land_at, gain=0.55)
    s.place(ping(hz("a5"), 0.9), at=land_at, gain=0.15, pan=0.38, width=0.010)
    s.place(fm_glass(hz("b4"), 1.0, decay=0.8, body=0.3),   # 6th on top: lift
            at=land_at + 0.12, gain=0.28, pan=0.60)
    return s.master(reverb_wet=0.24, ir_kwargs={"decay": 0.33})


# ----------------------------------------------------------------- 04 HEARTBEAT
# Minimal-premium: a deep double thump ("it's on") answered by a two-note
# glass call ending on the 9th. The most restrained, most OS-like option.
# Cuts through a busy mix via the low pulse; stays featherweight onscreen.

def heartbeat():
    s = Session(2.1)
    s.place(sub_thump(70, 46, dur=0.45, knock=0.10), at=0.00, gain=0.72)
    s.place(sub_thump(74, 46, dur=0.55, knock=0.13), at=0.32, gain=0.95)
    call = [("a4", 0.74, 0.50), ("e5", 1.04, 0.62)]        # 5 -> 9: open, modern
    for note, at, gain in call:
        v = fm_glass(hz(note), 1.0, mod_ratio=2.0, index=1.6,
                     index_decay=0.08, decay=0.6, body=0.35)
        s.place(v, at=at, gain=gain, pan=0.42 if note == "a4" else 0.58,
                width=0.009)
    for i, at in enumerate([1.36, 1.50]):                  # tiny tick detail
        s.place(fm_pluck(hz("e6"), 0.12, brightness=2.0, decay=0.05),
                at=at, gain=0.055, pan=0.35 + 0.3 * i)
    return s.master(reverb_wet=0.13, ir_kwargs={"decay": 0.28})


# -------------------------------------------------------------------- 05 BOUNCE
# Playful synth-pop stab rhythm: da-da .. DA -> landing on V(add9).
# The most overtly game-like option -- character comes from syncopation and
# bounce, polish from the clean stab timbre. Ends on the dominant: maximum
# "about to happen" without resolving.

def bounce():
    s = Session(2.5)
    eighth = 60 / 124 / 2                      # 124 BPM
    def stab(freqs, at, gain, dur=0.24, nc=8.0, seed=50):
        env = env_perc(int(dur * SR), attack=0.003, decay=0.16, curve=5.0)
        l, r = bright_saw_chord(freqs, dur, nc_start=nc, nc_end=nc * 0.7,
                                amp_env=env, seed=seed)
        s.place((l, r), at=at, gain=gain)
    d_chord = [hz("d4"), hz("f#4"), hz("a4")]
    g_chord = [hz("g3"), hz("b3"), hz("d4")]
    a_chord = [hz("a3"), hz("c#4"), hz("e4"), hz("b4")]    # V add9
    stab(d_chord, 0.00, 0.55, seed=51)
    stab(d_chord, eighth, 0.38, dur=0.18, seed=52)
    stab(g_chord, eighth * 3, 0.68, nc=9.0, seed=53)       # syncopated IV
    land_at = eighth * 5                                    # 1.21 s
    s.place(sub_thump(88, 44, dur=0.6), at=land_at, gain=0.85)
    env = env_perc(int(1.2 * SR), attack=0.004, decay=0.9, curve=5.0)
    l, r = bright_saw_chord(a_chord, 1.2, nc_start=11, nc_end=4,
                            amp_env=env, seed=54)
    s.place((l, r), at=land_at, gain=0.60)
    s.place(ping(hz("c#6"), 0.8), at=land_at, gain=0.13, pan=0.60, width=0.011)
    s.place(noise_riser(0.40, f_hi=6000, seed=17), at=land_at - 0.40, gain=0.05)
    return s.master(reverb_wet=0.16, ir_kwargs={"decay": 0.30})


CANDIDATES = {
    "settlehex-gamestart-01-ignition": ignition,
    "settlehex-gamestart-02-glasswork": glasswork,
    "settlehex-gamestart-03-liftoff": liftoff,
    "settlehex-gamestart-04-heartbeat": heartbeat,
    "settlehex-gamestart-05-bounce": bounce,
}

if __name__ == "__main__":
    for name, fn in CANDIDATES.items():
        l, r = fn()
        report(name, l, r)
        write_wav(os.path.join(OUT, f"{name}.wav"), l, r)
    print("done ->", OUT)
