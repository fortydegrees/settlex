"""Loudness-match all candidates to a common integrated level (-16 LUFS)
so the audition compares character, not volume."""

import os
from candidates import CANDIDATES, OUT
from synth import report, write_wav

MEASURED = {                      # ffmpeg ebur128 integrated LUFS, first render
    "settlehex-gamestart-01-ignition": -16.1,
    "settlehex-gamestart-02-glasswork": -11.2,
    "settlehex-gamestart-03-liftoff": -14.1,
    "settlehex-gamestart-04-heartbeat": -12.3,
    "settlehex-gamestart-05-bounce": -13.6,
}
TARGET = -16.0

for name, fn in CANDIDATES.items():
    gain_db = TARGET - MEASURED[name]
    gain = 10 ** (gain_db / 20)
    l, r = fn()
    write_wav(os.path.join(OUT, f"{name}.wav"), l, r, gain=min(gain, 1.0))
    report(name, l * gain, r * gain)
print("matched to", TARGET, "LUFS")
