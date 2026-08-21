"""The SettleHex cue family, derived from Glasslift (the locked-in game-start).

Palette rules inherited from Glasslift:
- sine plucks = motion, beep_glass = voice, octave sine blooms = arrival,
  sub thump = ground, filtered air = lift. Key of D. Signature = the hanging B.
- Only game:win may resolve (B -> D5). Everything else stays open.
- Frequent cues (your-turn, ticks) are featherweight and dry; rare cues
  (win/lose) get the tails.
"""

from synth import (SR, Session, beep_glass, env_perc, env_swell, hz,
                   noise_riser, report, sine_bloom, sine_pluck, sub_thump,
                   write_wav)
import numpy as np
import os

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)


# ------------------------------------------------------------------ YOUR TURN
# The pickup-run's first two notes, quoted. Plays dozens of times per match,
# so: two plucks, one soft low tap, tiny reverb, done in ~0.65 s.

def yourturn():
    s = Session(0.9)
    s.place(sine_pluck(hz("d4"), 0.28, decay=0.12), at=0.00, gain=0.44, pan=0.45)
    s.place(sine_pluck(hz("a4"), 0.30, decay=0.13), at=0.09, gain=0.52, pan=0.55)
    s.place(beep_glass(hz("a4"), 0.5, decay=0.35), at=0.09, gain=0.26)
    n = int(0.3 * SR)
    low = np.sin(2 * np.pi * hz("d3") * np.arange(n) / SR)
    s.place(low * env_perc(n, attack=0.004, decay=0.22), at=0.02, gain=0.30)
    return s.master(reverb_wet=0.10, ir_kwargs={"decay": 0.22})


# --------------------------------------------------------------------- AWARDS
# A small arrival: three quick plucks climbing 5-6-8, a light glass hold on
# the octave. No bloom, no thump -- the octave is touched, not landed on.

def awards():
    s = Session(1.3)
    run = [("a4", 0.00, 0.36), ("b4", 0.08, 0.42), ("d5", 0.16, 0.50)]
    for note, at, gain in run:
        s.place(sine_pluck(hz(note), 0.26, decay=0.11), at=at, gain=gain,
                pan=0.44 + (at / 0.16) * 0.12 if at else 0.44)
    s.place(beep_glass(hz("d5"), 0.8, decay=0.5), at=0.16, gain=0.42)
    s.place(beep_glass(hz("a5"), 0.5, decay=0.35, h2=0.0, sheen=0.0),
            at=0.34, gain=0.09)
    return s.master(reverb_wet=0.16, ir_kwargs={"decay": 0.28})


# ------------------------------------------------------------------- GAME WIN
# The promise, kept: Glasslift's run and hanging B, then the one resolution
# in the family -- B steps up to D5 over the biggest octave bloom, grounded
# by a warm thump. Still sine-pure: celebration through scale, not fanfare.

def win():
    s = Session(3.3)
    run = ["d4", "e4", "f#4", "a4"]
    for i, note in enumerate(run):
        frac = i / (len(run) - 1)
        s.place(sine_pluck(hz(note), 0.26, decay=0.11),
                at=i * 0.085, gain=0.34 + 0.14 * frac, pan=0.42 + 0.16 * frac)
    s.place(beep_glass(hz("b4"), 1.0, decay=0.6), at=0.40, gain=0.60)
    res_at = 0.95
    s.place(beep_glass(hz("d5"), 1.8, decay=1.0), at=res_at, gain=0.78)
    bloom_dur = 2.1
    env = env_swell(int(bloom_dur * SR), attack=0.30, hold=0.45, release=1.35)
    s.place(sine_bloom([hz("d2"), hz("d3"), hz("a3"), hz("d4"), hz("a4")],
                       bloom_dur, env), at=res_at - 0.06, gain=0.55)
    s.place(sub_thump(85, 45, dur=0.6, knock=0.08), at=res_at, gain=0.55)
    s.place(beep_glass(hz("a5"), 0.9, decay=0.55, h2=0.0, sheen=0.0),
            at=res_at + 0.40, gain=0.11)
    s.place(beep_glass(hz("d6"), 0.8, decay=0.5, h2=0.0, sheen=0.0),
            at=res_at + 0.62, gain=0.07)
    s.place(noise_riser(res_at, f_hi=5500, seed=29), at=0.0, gain=0.030)
    return s.master(reverb_wet=0.28, ir_kwargs={"decay": 0.42})


# ------------------------------------------------------------- GAME LOSE (A)
# "Kind fall": the motif mirrored -- B, A, then F natural (the minor third).
# Honest about the loss, gentle about it: soft attacks, sinking minor bloom,
# no thump, nothing sharp.

def lose_kind():
    s = Session(2.2)
    fall = [("b4", 0.00, 0.46), ("a4", 0.28, 0.42), ("f4", 0.60, 0.52)]
    for note, at, gain in fall:
        s.place(beep_glass(hz(note), 1.2, decay=0.7, attack=0.012, sheen=0.02),
                at=at, gain=gain)
    bloom_dur = 1.5
    env = env_swell(int(bloom_dur * SR), attack=0.35, hold=0.2, release=0.95)
    s.place(sine_bloom([hz("d3"), hz("f3"), hz("a3")], bloom_dur, env),
            at=0.55, gain=0.40)
    return s.master(reverb_wet=0.22, ir_kwargs={"decay": 0.36})


# ------------------------------------------------------------- GAME LOSE (B)
# "Soft set-down": stays in major -- the lift lowered, D5 down to A over an
# open A ground. Less sad, more "the match is over". For if variant A feels
# too mournful for a quick 1v1 rematch loop.

def lose_soft():
    s = Session(2.0)
    fall = [("d5", 0.00, 0.44), ("b4", 0.26, 0.40), ("a4", 0.56, 0.48)]
    for note, at, gain in fall:
        s.place(beep_glass(hz(note), 1.1, decay=0.65, attack=0.010, sheen=0.02),
                at=at, gain=gain)
    bloom_dur = 1.4
    env = env_swell(int(bloom_dur * SR), attack=0.30, hold=0.2, release=0.9)
    s.place(sine_bloom([hz("a2"), hz("a3"), hz("e4")], bloom_dur, env),
            at=0.50, gain=0.36)
    return s.master(reverb_wet=0.20, ir_kwargs={"decay": 0.34})


# ---------------------------------------------------------------- DISCARD (A)
# "Leading call": E down to C-sharp -- the leading tone, the scale degree that
# demands resolution. Musically encodes "action required". Dry and firm,
# with a small dark air puff; zero celebration, zero punishment.

def discard_call():
    s = Session(1.2)
    s.place(beep_glass(hz("e5"), 0.7, decay=0.40), at=0.00, gain=0.52)
    s.place(beep_glass(hz("c#5"), 0.9, decay=0.50), at=0.22, gain=0.50)
    n = int(0.30 * SR)
    rng = np.random.default_rng(41)
    from synth import fft_bandpass
    puff = fft_bandpass(rng.standard_normal(n), 300, 1400)
    s.place(puff * env_perc(n, attack=0.01, decay=0.2), at=0.18, gain=0.05)
    return s.master(reverb_wet=0.10, ir_kwargs={"decay": 0.24})


# ---------------------------------------------------------------- DISCARD (B)
# "Double tap": the same C-sharp twice -- attention through repetition,
# emotionally neutral. For if variant A reads as too melodic for a prompt.

def discard_tap():
    s = Session(1.0)
    s.place(beep_glass(hz("c#5"), 0.6, decay=0.35), at=0.00, gain=0.52)
    s.place(beep_glass(hz("c#5"), 0.8, decay=0.45), at=0.18, gain=0.44)
    return s.master(reverb_wet=0.08, ir_kwargs={"decay": 0.22})


# ---------------------------------------------------------------- TIMER TICKS
# A muted low-D pulse the game repeats as the clock runs down. Soft version
# for the first threshold; urgent adds a quiet fifth and more attack presence
# for the final stretch. Nearly dry so repetition never smears.

def _tick(urgent):
    s = Session(0.30)
    s.place(sine_pluck(hz("d3"), 0.16, decay=0.055), at=0.0,
            gain=0.62 if urgent else 0.5)
    n = int(0.05 * SR)
    rng = np.random.default_rng(7)
    from synth import fft_bandpass
    knock = fft_bandpass(rng.standard_normal(n), 500, 1800)
    s.place(knock * env_perc(n, attack=0.0005, decay=0.02), at=0.0,
            gain=0.10 if urgent else 0.06)
    if urgent:
        s.place(sine_pluck(hz("a3"), 0.12, decay=0.045), at=0.004, gain=0.30)
    return s.master(reverb_wet=0.04, ir_kwargs={"decay": 0.15})


def tick_soft():
    return _tick(False)


def tick_urgent():
    return _tick(True)


FAMILY = {
    "settlehex-family-yourturn": yourturn,
    "settlehex-family-awards": awards,
    "settlehex-family-win": win,
    "settlehex-family-lose-a-kind": lose_kind,
    "settlehex-family-lose-b-soft": lose_soft,
    "settlehex-family-discard-a-call": discard_call,
    "settlehex-family-discard-b-tap": discard_tap,
    "settlehex-family-timer-tick-soft": tick_soft,
    "settlehex-family-timer-tick-urgent": tick_urgent,
}

if __name__ == "__main__":
    import sys
    gains_db = {}
    for arg in sys.argv[1:]:
        k, v = arg.split("=")
        gains_db[k] = float(v)
    for name, fn in FAMILY.items():
        l, r = fn()
        gain = 10 ** (gains_db.get(name, 0.0) / 20)
        report(name, l * gain, r * gain)
        write_wav(os.path.join(OUT, f"{name}.wav"), l, r, gain=min(gain, 1.0))
    print("done ->", OUT)


# ------------------------------------------------------- DISCARD v2 (C) WOMP
# Sadder revision per David: the sad-trombone *emotion* in the sine palette.
# B, then A sliding down to F (the family's misfortune note) with a hint of
# late vibrato -- the slide is the joke, the F is the sigh. Wry, not punishing.

def discard_womp():
    from synth import beep_droop, fft_bandpass
    s = Session(1.6)
    s.place(beep_glass(hz("b4"), 0.6, decay=0.38), at=0.00, gain=0.46)
    s.place(beep_droop(hz("a4"), hz("f4"), 1.15, hold=0.12, glide_tau=0.16,
                       decay=0.78, vib_hz=4.5, vib_cents=6, vib_delay=0.40),
            at=0.24, gain=0.56)
    n = int(0.30 * SR)
    rng = np.random.default_rng(43)
    puff = fft_bandpass(rng.standard_normal(n), 300, 1200)
    s.place(puff * env_perc(n, attack=0.012, decay=0.2), at=0.26, gain=0.045)
    return s.master(reverb_wet=0.12, ir_kwargs={"decay": 0.26})


# ------------------------------------------------- DISCARD v2 (D) CHROMATIC SIGH
# The trombone contour in miniature: G, F-sharp, F descending chromatically,
# the last note sagging ~a quarter tone flat as it fades. Deflation, no drama.

def discard_sigh():
    from synth import beep_droop, fft_bandpass
    s = Session(1.5)
    s.place(beep_glass(hz("g4"), 0.5, decay=0.34), at=0.00, gain=0.44)
    s.place(beep_glass(hz("f#4"), 0.5, decay=0.34), at=0.20, gain=0.40)
    s.place(beep_droop(hz("f4"), hz("f4") * 2 ** (-55 / 1200), 1.0,
                       hold=0.10, glide_tau=0.24, decay=0.72,
                       vib_hz=4.2, vib_cents=5, vib_delay=0.35),
            at=0.44, gain=0.52)
    n = int(0.26 * SR)
    rng = np.random.default_rng(44)
    puff = fft_bandpass(rng.standard_normal(n), 300, 1200)
    s.place(puff * env_perc(n, attack=0.012, decay=0.18), at=0.42, gain=0.04)
    return s.master(reverb_wet=0.12, ir_kwargs={"decay": 0.26})


FAMILY["settlehex-family-discard-c-womp"] = discard_womp
FAMILY["settlehex-family-discard-d-sigh"] = discard_sigh


# ------------------------------------------------------- GAME LOSE v2: MIRROR
# Per David: "similar to game win but mirror-sad." Beat-for-beat inversion of
# win -- the run descends in natural minor (D5, C5, Bb4, A4) and diminuendos
# where win's crescendos; the hang lands on Bb (the lament note) where win
# hangs on B; the resolution steps DOWN to D4 over a D-minor octave bloom with
# a softer, deeper thump; one low echo answers where win had two high ones.

def lose_mirror():
    s = Session(3.1)
    run = ["d5", "c5", "bb4", "a4"]
    for i, note in enumerate(run):
        frac = i / (len(run) - 1)
        s.place(sine_pluck(hz(note), 0.28, decay=0.13),
                at=i * 0.10, gain=0.48 - 0.12 * frac, pan=0.58 - 0.16 * frac)
    s.place(beep_glass(hz("bb4"), 1.0, decay=0.6, attack=0.010, sheen=0.02),
            at=0.46, gain=0.52)
    res_at = 1.02
    s.place(beep_glass(hz("d4"), 1.7, decay=0.95, attack=0.012, sheen=0.02),
            at=res_at, gain=0.62)
    bloom_dur = 1.9
    env = env_swell(int(bloom_dur * SR), attack=0.32, hold=0.35, release=1.2)
    s.place(sine_bloom([hz("d2"), hz("d3"), hz("f3"), hz("a3"), hz("d4")],
                       bloom_dur, env), at=res_at - 0.06, gain=0.48)
    s.place(sub_thump(70, 40, dur=0.55, knock=0.05), at=res_at, gain=0.38)
    s.place(beep_glass(hz("a3"), 0.9, decay=0.6, h2=0.0, sheen=0.0),
            at=res_at + 0.45, gain=0.10)
    return s.master(reverb_wet=0.26, ir_kwargs={"decay": 0.40})


FAMILY["settlehex-family-lose-c-mirror"] = lose_mirror


# ------------------------------------------------------------ LOW TIMER v2 (B)
# "Tock": a clean synthetic tick with actual tick legibility -- D4 body plus a
# small 1.5-2.5kHz definition click so it reads as *time* on laptop speakers.
# Critical rises to A4 (the your-turn answer note) with a brighter click.

def _tock(critical):
    from synth import fft_bandpass
    s = Session(0.26)
    note = "a4" if critical else "d4"
    s.place(sine_pluck(hz(note), 0.15, decay=0.055), at=0.0,
            gain=0.55 if critical else 0.46)
    n = int(0.03 * SR)
    rng = np.random.default_rng(9)
    click = fft_bandpass(rng.standard_normal(n), 1400, 2800)
    s.place(click * env_perc(n, attack=0.0004, decay=0.010), at=0.0,
            gain=0.16 if critical else 0.10)
    return s.master(reverb_wet=0.03, ir_kwargs={"decay": 0.12})


def tock_soft():
    return _tock(False)


def tock_critical():
    return _tock(True)


# ------------------------------------------------------------ LOW TIMER v2 (C)
# "Heartbeat": a lub-dub pulse on low D -- organic pressure rather than a
# clock. Critical tightens the gap, rises a fourth, and sharpens the knock.

def _heartbeat_tick(critical):
    from synth import fft_bandpass
    s = Session(0.45)
    note = "g3" if critical else "d3"
    gap = 0.11 if critical else 0.15
    s.place(sine_pluck(hz(note), 0.14, decay=0.06), at=0.0,
            gain=0.58 if critical else 0.50)
    s.place(sine_pluck(hz(note), 0.12, decay=0.05), at=gap,
            gain=0.44 if critical else 0.36)
    n = int(0.04 * SR)
    rng = np.random.default_rng(15)
    knock = fft_bandpass(rng.standard_normal(n), 700, 2000)
    s.place(knock * env_perc(n, attack=0.0005, decay=0.015), at=0.0,
            gain=0.11 if critical else 0.06)
    return s.master(reverb_wet=0.03, ir_kwargs={"decay": 0.12})


def heartbeat_soft():
    return _heartbeat_tick(False)


def heartbeat_critical():
    return _heartbeat_tick(True)


FAMILY["settlehex-family-timer2-tock-soft"] = tock_soft
FAMILY["settlehex-family-timer2-tock-critical"] = tock_critical
FAMILY["settlehex-family-timer3-heartbeat-soft"] = heartbeat_soft
FAMILY["settlehex-family-timer3-heartbeat-critical"] = heartbeat_critical


# ---------------------------------------------------- LOW TIMER v3: TICK-TOCK
# Per David: "a tick and then a half tick" from ~5s out. One 1-second asset
# per intensity -- full tick on the beat, lighter half-tick on the half-second
# -- so the subdivision is baked in and stays sample-accurate no matter how
# the per-second cue emissions jitter. Critical rises a fourth and brightens.

def _ticktock(critical):
    from synth import fft_bandpass
    s = Session(1.0)
    tick_note = "a4" if critical else "d4"
    half_note = "d5" if critical else "a4"
    rng = np.random.default_rng(9)

    def click(at, gain, lo=1400, hi=2800):
        n = int(0.03 * SR)
        c = fft_bandpass(rng.standard_normal(n), lo, hi)
        s.place(c * env_perc(n, attack=0.0004, decay=0.010), at=at, gain=gain)

    s.place(sine_pluck(hz(tick_note), 0.15, decay=0.055), at=0.0,
            gain=0.55 if critical else 0.46)
    click(0.0, 0.16 if critical else 0.10)
    # the half tick: half the level, half the length, a step up
    s.place(sine_pluck(hz(half_note), 0.10, decay=0.035), at=0.5,
            gain=0.27 if critical else 0.21)
    click(0.5, 0.08 if critical else 0.05, lo=1800, hi=3400)
    return s.master(reverb_wet=0.03, ir_kwargs={"decay": 0.12})


def ticktock_soft():
    return _ticktock(False)


def ticktock_critical():
    return _ticktock(True)


FAMILY["settlehex-family-timer4-ticktock-soft"] = ticktock_soft
FAMILY["settlehex-family-timer4-ticktock-critical"] = ticktock_critical


# =========================================================== PROPOSED ADDITIONS
# Three cues from the "what else needs sound?" audit. Interface cues stay in
# the family; the robber landing is table-layer with family DNA (the F).

# TURN END -- the your-turn quote, returned: A falls to D, softer and drier
# than your-turn. Pick up / set down. Pure confirmation feedback.

def turnend():
    s = Session(0.8)
    s.place(sine_pluck(hz("a4"), 0.26, decay=0.11), at=0.00, gain=0.38, pan=0.55)
    s.place(sine_pluck(hz("d4"), 0.30, decay=0.14), at=0.09, gain=0.34, pan=0.45)
    n = int(0.26 * SR)
    low = np.sin(2 * np.pi * hz("d3") * np.arange(n) / SR)
    s.place(low * env_perc(n, attack=0.005, decay=0.2), at=0.10, gain=0.20)
    return s.master(reverb_wet=0.08, ir_kwargs={"decay": 0.20})


# ROBBER PLACED -- table-layer: a deep soft landing thud with a quiet low-F
# breath (the misfortune color) and dark air. No melody; a shadow arriving.

def robberplace():
    from synth import fft_bandpass
    s = Session(1.1)
    s.place(sub_thump(60, 34, dur=0.6, glide=0.10, knock=0.06), at=0.02, gain=0.85)
    n = int(0.8 * SR)
    breath = np.sin(2 * np.pi * hz("f2") * np.arange(n) / SR)
    breath += 0.5 * np.sin(2 * np.pi * hz("f3") * np.arange(n) / SR)
    s.place(breath * env_swell(n, attack=0.10, hold=0.15, release=0.5),
            at=0.05, gain=0.16)
    rng = np.random.default_rng(53)
    air = fft_bandpass(rng.standard_normal(int(0.4 * SR)), 150, 700)
    s.place(air * env_perc(int(0.4 * SR), attack=0.01, decay=0.3),
            at=0.0, gain=0.05)
    return s.master(reverb_wet=0.14, ir_kwargs={"decay": 0.30})


# STEAL -- interface-layer: a quick dark downward swipe with one muted F pluck
# at the end. Sneaky, neutral for both sides, over in half a second.

def steal():
    from synth import fft_bandpass
    s = Session(0.9)
    n = int(0.30 * SR)
    rng = np.random.default_rng(61)
    white = rng.standard_normal(n)
    hi = fft_bandpass(white, 900, 2600)
    lo = fft_bandpass(white, 250, 900)
    mix = (np.arange(n) / n) ** 1.4                 # bright -> dark: swipe DOWN
    swipe = hi * (1 - mix) + lo * mix
    s.place(swipe * env_perc(n, attack=0.015, decay=0.22), at=0.0, gain=0.30)
    s.place(sine_pluck(hz("f3"), 0.24, decay=0.10), at=0.20, gain=0.42)
    s.place(sine_pluck(hz("f4"), 0.12, decay=0.05), at=0.20, gain=0.10)
    return s.master(reverb_wet=0.10, ir_kwargs={"decay": 0.22})


FAMILY["settlehex-family-turnend"] = turnend
FAMILY["settlehex-family-robberplace"] = robberplace
FAMILY["settlehex-family-steal"] = steal


# ROBBER PLACED (B) -- pure material: the same landing with zero pitched
# content. Thud + low noise settle only; the table speaking, not the game.

def robberplace_material():
    from synth import fft_bandpass
    s = Session(1.0)
    s.place(sub_thump(60, 34, dur=0.6, glide=0.10, knock=0.07), at=0.02, gain=0.9)
    rng = np.random.default_rng(57)
    n = int(0.55 * SR)
    settle = fft_bandpass(rng.standard_normal(n), 80, 500)
    s.place(settle * env_perc(n, attack=0.008, decay=0.4), at=0.02, gain=0.09)
    air = fft_bandpass(rng.standard_normal(int(0.3 * SR)), 400, 1200)
    s.place(air * env_perc(int(0.3 * SR), attack=0.004, decay=0.08), at=0.0,
            gain=0.035)
    return s.master(reverb_wet=0.12, ir_kwargs={"decay": 0.28})


FAMILY["settlehex-family-robberplace-material"] = robberplace_material


# STEAL v2: a GLYPH, not a replacement. The card movement already plays the
# real woosh through the cardTransfer pipeline; this is the meaning layered
# under it -- one muted F (the misfortune note) with a low undertone, 0.35s,
# quiet enough to shadow the woosh rather than compete with it.

def steal_accent():
    s = Session(0.7)
    s.place(sine_pluck(hz("f3"), 0.30, decay=0.13), at=0.0, gain=0.48)
    n = int(0.35 * SR)
    under = np.sin(2 * np.pi * hz("f2") * np.arange(n) / SR)
    s.place(under * env_perc(n, attack=0.004, decay=0.25), at=0.0, gain=0.22)
    return s.master(reverb_wet=0.08, ir_kwargs={"decay": 0.20})


FAMILY["settlehex-family-steal-accent"] = steal_accent


# ============================================================== GAME WIN v2
# Per David: win is "a bit too similar to the intro" and wants "a tiny bit
# more celebratory". Two levers, offered as an A/B:
#   v2a CROWNED  -- keep the structure, add triumph: major-third bloom, a
#                   rising crown flourish (D5-F#5-A5-D6) after the landing.
#   v2b TA-DA    -- restructure the opening away from Glasslift's run: state
#                   the D-A-B signature fast, then a double hit -- land D5,
#                   then a second, higher crowning hit. Unmistakably an ending.

def win_crowned():
    s = Session(3.4)
    run = ["d4", "e4", "f#4", "a4"]
    for i, note in enumerate(run):
        frac = i / (len(run) - 1)
        s.place(sine_pluck(hz(note), 0.26, decay=0.11),
                at=i * 0.085, gain=0.34 + 0.14 * frac, pan=0.42 + 0.16 * frac)
    s.place(beep_glass(hz("b4"), 1.0, decay=0.6), at=0.40, gain=0.60)
    res_at = 0.95
    s.place(beep_glass(hz("d5"), 1.8, decay=1.0, sheen=0.10), at=res_at, gain=0.78)
    bloom_dur = 2.2
    env = env_swell(int(bloom_dur * SR), attack=0.28, hold=0.5, release=1.4)
    s.place(sine_bloom([hz("d2"), hz("d3"), hz("f#3"), hz("a3"), hz("d4")],
                       bloom_dur, env), at=res_at - 0.06, gain=0.55)
    s.place(sub_thump(85, 45, dur=0.6, knock=0.09), at=res_at, gain=0.62)
    # the crown: a rising flourish where v1 had two shy echoes
    for i, note in enumerate(["d5", "f#5", "a5"]):
        s.place(sine_pluck(hz(note), 0.22, decay=0.09),
                at=res_at + 0.34 + i * 0.07, gain=0.26 + 0.05 * i,
                pan=0.44 + 0.06 * i)
    s.place(beep_glass(hz("d6"), 1.0, decay=0.6, h2=0.0, sheen=0.0),
            at=res_at + 0.58, gain=0.24)
    s.place(noise_riser(res_at, f_hi=7000, seed=29), at=0.0, gain=0.034)
    return s.master(reverb_wet=0.30, ir_kwargs={"decay": 0.44})


def win_tada():
    s = Session(3.4)
    # fast signature statement -- the motif, not the intro's run
    motif = [("d4", 0.00, 0.40), ("a4", 0.14, 0.48), ("b4", 0.28, 0.56)]
    for note, at, gain in motif:
        s.place(sine_pluck(hz(note), 0.24, decay=0.10), at=at, gain=gain)
        s.place(beep_glass(hz(note), 0.5, decay=0.35), at=at, gain=gain * 0.45)
    # hit one: the resolution
    hit1 = 0.55
    s.place(beep_glass(hz("d5"), 1.2, decay=0.8, sheen=0.10), at=hit1, gain=0.70)
    env1 = env_swell(int(1.1 * SR), attack=0.12, hold=0.25, release=0.7)
    s.place(sine_bloom([hz("d2"), hz("d3"), hz("f#3"), hz("a3"), hz("d4")],
                       1.1, env1), at=hit1 - 0.04, gain=0.48)
    s.place(sub_thump(85, 45, dur=0.55, knock=0.08), at=hit1, gain=0.52)
    s.place(beep_glass(hz("a5"), 0.6, decay=0.4, h2=0.0, sheen=0.0),
            at=hit1 + 0.02, gain=0.12)
    # hit two: the crowning ta-DA, a fourth higher and wider
    hit2 = 1.18
    s.place(noise_riser(hit2 - 0.45, f_hi=7500, seed=33), at=hit2 - 0.45, gain=0.05)
    for i, note in enumerate(["f#5", "a5"]):
        s.place(sine_pluck(hz(note), 0.2, decay=0.08),
                at=hit2 - 0.13 + i * 0.065, gain=0.28, pan=0.42 + 0.12 * i)
    s.place(beep_glass(hz("d6"), 1.5, decay=0.9, h2=0.0, sheen=0.04),
            at=hit2, gain=0.42)
    env2 = env_swell(int(1.9 * SR), attack=0.10, hold=0.45, release=1.35)
    s.place(sine_bloom([hz("d3"), hz("a3"), hz("d4"), hz("f#4"), hz("a4")],
                       1.9, env2), at=hit2 - 0.04, gain=0.50)
    s.place(sub_thump(95, 48, dur=0.6, knock=0.10), at=hit2, gain=0.62)
    return s.master(reverb_wet=0.30, ir_kwargs={"decay": 0.46})


FAMILY["settlehex-family-win-v2a-crowned"] = win_crowned
FAMILY["settlehex-family-win-v2b-tada"] = win_tada


# ------------------------------------------------- GAME LOSE v3: MIRROR OF TA-DA
# Win v2b states the signature D-A-B *rising*; the exact intervallic inversion
# is D-G-F *falling* -- and it lands on F, the family's misfortune note.
# Structure mirrors the double hit as settle-then-sink: land on D4 with the
# minor bloom and a soft deep thump, then a quieter, LOWER after-tone where
# win crowns higher. Defeat gets the same ceremony, one floor down.

def lose_tada_mirror():
    s = Session(3.2)
    stmt = [("d5", 0.00, 0.48), ("g4", 0.16, 0.44), ("f4", 0.32, 0.50)]
    for note, at, gain in stmt:
        s.place(sine_pluck(hz(note), 0.24, decay=0.10), at=at, gain=gain * 0.7)
        s.place(beep_glass(hz(note), 0.6, decay=0.4, attack=0.010, sheen=0.02),
                at=at, gain=gain * 0.5)
    settle = 0.62
    s.place(beep_glass(hz("d4"), 1.6, decay=0.95, attack=0.012, sheen=0.02),
            at=settle, gain=0.60)
    env1 = env_swell(int(1.2 * SR), attack=0.14, hold=0.25, release=0.75)
    s.place(sine_bloom([hz("d2"), hz("d3"), hz("f3"), hz("a3"), hz("d4")],
                       1.2, env1), at=settle - 0.04, gain=0.46)
    s.place(sub_thump(65, 38, dur=0.55, knock=0.05), at=settle, gain=0.35)
    sink = 1.30
    s.place(beep_glass(hz("a3"), 1.3, decay=0.85, attack=0.015, sheen=0.0),
            at=sink, gain=0.30)
    env2 = env_swell(int(1.6 * SR), attack=0.18, hold=0.3, release=1.05)
    s.place(sine_bloom([hz("d2"), hz("f2"), hz("a2")], 1.6, env2),
            at=sink - 0.04, gain=0.34)
    return s.master(reverb_wet=0.28, ir_kwargs={"decay": 0.42})


FAMILY["settlehex-family-lose-d-tada-mirror"] = lose_tada_mirror


# ============================================================== AWARDS v2
# Per David: awards should be "fanfare-esque" -- the emotion, not the brass.
# The fanfare gesture, decomposed: rapid repeated-note pickup (ta-ta-ta...),
# a rise through the major triad, short-short-LONG ending on a held note.
# The repeated-note herald becomes the awards signature -- no other cue in
# the family repeats a note. Still no bloom: win keeps the big cadence.

def awards_herald():
    s = Session(1.6)
    for i in range(3):                          # ta-ta-ta on the dominant
        s.place(sine_pluck(hz("a4"), 0.16, decay=0.06),
                at=i * 0.08, gain=0.34 + 0.05 * i)
    land = 0.30                                 # ...DAA on the octave
    s.place(sine_pluck(hz("d5"), 0.30, decay=0.12), at=land, gain=0.50)
    s.place(beep_glass(hz("d5"), 1.1, decay=0.65, sheen=0.09), at=land, gain=0.50)
    s.place(beep_glass(hz("f#5"), 0.6, decay=0.40, h2=0.0, sheen=0.0),
            at=land + 0.10, gain=0.12)
    s.place(sub_thump(90, 50, dur=0.4, knock=0.06), at=land, gain=0.28)
    return s.master(reverb_wet=0.18, ir_kwargs={"decay": 0.30})


def awards_bugle():
    s = Session(1.7)
    seq = [("a4", 0.00, 0.34), ("a4", 0.09, 0.38), ("d5", 0.20, 0.46)]
    for note, at, gain in seq:                  # da-da-DA rising pickup
        s.place(sine_pluck(hz(note), 0.18, decay=0.07), at=at, gain=gain)
    top = 0.34                                  # ...DAA held on the bright third
    s.place(sine_pluck(hz("f#5"), 0.26, decay=0.10), at=top, gain=0.44)
    s.place(beep_glass(hz("f#5"), 1.1, decay=0.65, sheen=0.09), at=top, gain=0.52)
    s.place(beep_glass(hz("a5"), 0.55, decay=0.35, h2=0.0, sheen=0.0),
            at=top + 0.12, gain=0.10)
    s.place(sub_thump(90, 50, dur=0.4, knock=0.06), at=top, gain=0.28)
    return s.master(reverb_wet=0.18, ir_kwargs={"decay": 0.30})


FAMILY["settlehex-family-awards-v2a-herald"] = awards_herald
FAMILY["settlehex-family-awards-v2b-bugle"] = awards_bugle


# ====================================================== AWARDS v3: ROAD / ARMY
# Same fanfare skeleton, semantically flavored:
#   ROAD -- distance: a stepwise walk 5-6-7-8 sweeping L->R across the field
#           (the road stretching), held on the octave.
#   ARMY -- force: the tight martial ta-ta-ta leaping to the held bugle third,
#           with a punchier hit.

def award_road():
    s = Session(1.7)
    walk = [("a4", 0.00, 0.36, 0.36), ("b4", 0.09, 0.40, 0.46),
            ("c#5", 0.18, 0.44, 0.56)]
    for note, at, gain, pan in walk:
        s.place(sine_pluck(hz(note), 0.18, decay=0.07), at=at, gain=gain, pan=pan)
    land = 0.30
    s.place(sine_pluck(hz("d5"), 0.28, decay=0.11), at=land, gain=0.48, pan=0.64)
    s.place(beep_glass(hz("d5"), 1.1, decay=0.65, sheen=0.09), at=land, gain=0.50)
    s.place(beep_glass(hz("f#5"), 0.55, decay=0.38, h2=0.0, sheen=0.0),
            at=land + 0.12, gain=0.11)
    s.place(sub_thump(90, 50, dur=0.4, knock=0.06), at=land, gain=0.26)
    return s.master(reverb_wet=0.18, ir_kwargs={"decay": 0.30})


def award_army():
    s = Session(1.7)
    for i in range(3):
        s.place(sine_pluck(hz("a4"), 0.15, decay=0.055),
                at=i * 0.075, gain=0.36 + 0.05 * i)
    land = 0.28
    s.place(sine_pluck(hz("f#5"), 0.26, decay=0.10), at=land, gain=0.46)
    s.place(beep_glass(hz("f#5"), 1.1, decay=0.65, sheen=0.09), at=land, gain=0.52)
    s.place(beep_glass(hz("a5"), 0.5, decay=0.34, h2=0.0, sheen=0.0),
            at=land + 0.12, gain=0.09)
    s.place(sub_thump(92, 50, dur=0.42, knock=0.09), at=land, gain=0.32)
    return s.master(reverb_wet=0.18, ir_kwargs={"decay": 0.30})


FAMILY["settlehex-family-award-road"] = award_road
FAMILY["settlehex-family-award-army"] = award_army


# ============================================================ TURN END v2
# Per David: the two-note version was "too grand even though it's small".
# Correct diagnosis by the family's own rule -- melody = the game speaking,
# and a self-initiated confirmation shouldn't speak. Two melody-free takes:
#   FULL STOP -- one muted dot on low D (home/ground), no click, bone dry.
#   SET DOWN  -- pure material: felt thud + a whisper of card-contact noise.

def turnend_fullstop():
    s = Session(0.5)
    n = int(0.30 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * hz("d3") * t) + 0.4 * np.sin(2 * np.pi * hz("d2") * t)
    s.place(body * env_perc(n, attack=0.005, decay=0.11), at=0.0, gain=0.55)
    from synth import fft_bandpass
    rng = np.random.default_rng(71)
    knock = fft_bandpass(rng.standard_normal(int(0.03 * SR)), 250, 900)
    s.place(knock * env_perc(int(0.03 * SR), attack=0.001, decay=0.012),
            at=0.0, gain=0.05)
    return s.master(reverb_wet=0.04, ir_kwargs={"decay": 0.14})


def turnend_setdown():
    from synth import fft_bandpass
    s = Session(0.55)
    s.place(sub_thump(52, 36, dur=0.35, glide=0.06, knock=0.03), at=0.01, gain=0.6)
    rng = np.random.default_rng(73)
    paper = fft_bandpass(rng.standard_normal(int(0.05 * SR)), 400, 2600)
    s.place(paper * env_perc(int(0.05 * SR), attack=0.001, decay=0.02),
            at=0.0, gain=0.075)
    settle = fft_bandpass(rng.standard_normal(int(0.18 * SR)), 150, 600)
    s.place(settle * env_perc(int(0.18 * SR), attack=0.006, decay=0.12),
            at=0.01, gain=0.05)
    return s.master(reverb_wet=0.04, ir_kwargs={"decay": 0.14})


FAMILY["settlehex-family-turnend-v2a-fullstop"] = turnend_fullstop
FAMILY["settlehex-family-turnend-v2b-setdown"] = turnend_setdown


# ======================================================== RESOURCE BLOCKED
# The roll hit a paying number, but the robber sits on the tile: a payout
# that deflates. A tiny pop-like onset sagging immediately to F (the
# misfortune note) with a small damp knock -- the discard droop grammar at
# pop scale. Pairs with the existing blocked-tile flash; glyph-class quiet.

def resource_blocked():
    from synth import beep_droop, fft_bandpass
    s = Session(0.6)
    s.place(beep_droop(hz("a4"), hz("f4"), 0.42, hold=0.03, glide_tau=0.055,
                       decay=0.22, attack=0.003, h2=0.08, vib_cents=0.0),
            at=0.0, gain=0.52)
    rng = np.random.default_rng(83)
    knock = fft_bandpass(rng.standard_normal(int(0.03 * SR)), 200, 700)
    s.place(knock * env_perc(int(0.03 * SR), attack=0.001, decay=0.014),
            at=0.10, gain=0.05)
    return s.master(reverb_wet=0.06, ir_kwargs={"decay": 0.16})


FAMILY["settlehex-family-resource-blocked"] = resource_blocked
