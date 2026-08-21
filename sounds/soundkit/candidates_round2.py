"""Round 2: refinements of the two winners (Glasswork, Liftoff) plus a hybrid.

Calibration from David: the tones he historically liked came from Sonic Pi's
:beep (a pure sine + ADSR) — "clean beeps", "03-pentatonic-skip",
"octave blooms". So round 2 shifts the winning structures onto purer,
sine-forward voices (beep_glass / sine_pluck / sine_bloom) and quotes the
pentatonic-skip and octave-bloom gestures directly.
"""

from synth import (SR, Session, beep_glass, bright_saw_chord, env_perc,
                   env_swell, hz, noise_riser, ping, report, sine_bloom,
                   sine_pluck, sub_thump, write_wav)
import numpy as np
import os

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)


# -------------------------------------------------------- 06 GLASSWORK PURE
# The D-A-B signature on the purified voice, with a literal octave bloom:
# octaves of D swelling under the held sixth. "The chime, distilled."

def glasspure():
    s = Session(2.4)
    motif = [("d4", 0.00, 0.52), ("a4", 0.22, 0.58), ("b4", 0.46, 0.78)]
    for note, at, gain in motif:
        s.place(beep_glass(hz(note), 1.5, decay=0.85), at=at, gain=gain)
    bloom_at = 0.46
    bloom_dur = 1.8
    env = env_swell(int(bloom_dur * SR), attack=0.35, hold=0.25, release=1.2)
    s.place(sine_bloom([hz("d2"), hz("d3"), hz("a3"), hz("d4")], bloom_dur, env),
            at=bloom_at, gain=0.52)
    s.place(noise_riser(0.46, f_hi=5500, seed=23), at=0.0, gain=0.028)
    return s.master(reverb_wet=0.24, ir_kwargs={"decay": 0.36})


# --------------------------------------------------------- 07 LIFTOFF SKIP
# The ladder rebuilt as a pentatonic skip -- up two, back one -- the gesture
# of the old Sonic Pi 03-pentatonic-skip sketch, on clean sine plucks.

def liftskip():
    s = Session(2.5)
    step = 0.110                                # ~136 BPM sixteenths
    skip = ["d4", "f#4", "e4", "a4", "f#4", "b4", "a4", "d5"]
    for i, note in enumerate(skip):
        frac = i / (len(skip) - 1)
        pan = 0.5 + (0.20 * frac) * (1 if i % 2 else -1)
        s.place(sine_pluck(hz(note), 0.32, decay=0.15),
                at=0.05 + i * step, gain=0.40 + 0.18 * frac, pan=pan)
    land_at = 0.05 + len(skip) * step           # 0.93 s
    s.place(noise_riser(land_at - 0.05, f_hi=7000, seed=19), at=0.05, gain=0.05)
    s.place(sub_thump(80, 42, dur=0.6), at=land_at, gain=0.85)
    env = env_perc(int(1.4 * SR), attack=0.005, decay=1.05, curve=5.0)
    s.place(sine_bloom([hz("d3"), hz("a3"), hz("d4"), hz("a4")], 1.4, env),
            at=land_at, gain=0.62)
    l, r = bright_saw_chord([hz("d3"), hz("a3")], 1.4, nc_start=6, nc_end=3,
                            amp_env=env, seed=37)      # faint warm sheen only
    s.place((l, r), at=land_at, gain=0.18)
    s.place(beep_glass(hz("b4"), 1.1, decay=0.85), at=land_at + 0.12, gain=0.34)
    s.place(ping(hz("a5"), 0.8), at=land_at, gain=0.11, pan=0.40, width=0.010)
    return s.master(reverb_wet=0.22, ir_kwargs={"decay": 0.33})


# ----------------------------------------------------------- 08 GLASSLIFT
# Hybrid: a four-note pentatonic pickup sprints into Glasswork's bloom and
# lands on the signature's hanging B. Liftoff's motion, Glasswork's arrival.

def glasslift():
    s = Session(2.3)
    run = ["d4", "e4", "f#4", "a4"]
    for i, note in enumerate(run):
        frac = i / (len(run) - 1)
        s.place(sine_pluck(hz(note), 0.26, decay=0.11),
                at=i * 0.085, gain=0.34 + 0.14 * frac,
                pan=0.42 + 0.16 * frac)
    land_at = 4 * 0.085 + 0.06                  # 0.40 s
    s.place(beep_glass(hz("b4"), 1.5, decay=0.9), at=land_at, gain=0.72)
    bloom_dur = 1.7
    env = env_swell(int(bloom_dur * SR), attack=0.30, hold=0.25, release=1.15)
    s.place(sine_bloom([hz("d2"), hz("d3"), hz("a3"), hz("d4")], bloom_dur, env),
            at=land_at - 0.06, gain=0.50)
    s.place(sub_thump(85, 45, dur=0.55, knock=0.08), at=land_at, gain=0.45)
    s.place(beep_glass(hz("a5"), 0.7, decay=0.45, h2=0.0, sheen=0.0),
            at=land_at + 0.42, gain=0.10)
    return s.master(reverb_wet=0.24, ir_kwargs={"decay": 0.35})


CANDIDATES_R2 = {
    "settlehex-gamestart-06-glasspure": glasspure,
    "settlehex-gamestart-07-liftskip": liftskip,
    "settlehex-gamestart-08-glasslift": glasslift,
}

if __name__ == "__main__":
    import sys
    gains_db = {}
    if len(sys.argv) > 1:                       # e.g. "06-glasspure=-3.1"
        for arg in sys.argv[1:]:
            k, v = arg.split("=")
            gains_db[k] = float(v)
    for name, fn in CANDIDATES_R2.items():
        l, r = fn()
        gain = 10 ** (gains_db.get(name, 0.0) / 20)
        report(name, l * gain, r * gain)
        write_wav(os.path.join(OUT, f"{name}.wav"), l, r, gain=min(gain, 1.0))
    print("done ->", OUT)
