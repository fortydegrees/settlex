"""Build the recommendation sheets: mark, lockup, favicon, tab sim, card."""

import os
import subprocess

import build
import marks
import wordmark as wm

INK = "#143f60"       # deep ocean blue, already used for the homepage wordmark
GREEN = "#16a34a"
PAPER = "#f5f5f4"
SKY_TOP = "#7dd3fc"
SKY_BOT = "#2f7fd4"

S_FACE = "outfit700"
S_H = 860.0           # S spans 86% of the silhouette so it touches top and bottom


def favicon_svg(colour=GREEN, s_height=S_H, face=S_FACE, pad=0.0):
    return marks.solid_s(face=face, s_height=s_height, colour=colour, pad=pad)


# ----------------------------------------------------------------- tab strip

def tab_strip(entries, out, width=760, height=40):
    """A 1:1 browser tab strip. Favicons are composited as true 16px rasters."""
    bar, tabw = "#dee1e6", 240
    parts = [f'<rect width="{width}" height="{height}" fill="{bar}"/>']
    for i, (_, title, active) in enumerate(entries):
        x = 8 + i * (tabw + 2)
        fillc = "#ffffff" if active else "#c9ced4"
        parts.append(
            f'<path d="M{x},{height} L{x},{10} Q{x},{4} {x+6},{4} '
            f'L{x+tabw-6},{4} Q{x+tabw},{4} {x+tabw},{10} L{x+tabw},{height} Z" fill="{fillc}"/>'
        )
        t, _ = wm.word(title, "outfit600", 12, x=x + 32, y=height / 2 + 4.5, fill="#3c4043")
        parts.append(t)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">'
           f'{"".join(parts)}</svg>')
    tmp = os.path.join(build.SVG_DIR, "tabstrip.svg")
    open(tmp, "w").write(svg)
    base = os.path.join(build.PNG_DIR, "tabstrip.png")
    subprocess.run(["rsvg-convert", "-w", str(width), "-h", str(height), "-o", base, tmp], check=True)

    cmd = ["magick", base]
    for i, (icon16, _, _) in enumerate(entries):
        x = 8 + i * (tabw + 2) + 10
        y = (height - 16) // 2
        cmd += [icon16, "-geometry", f"+{x}+{y}", "-composite"]
    cmd += [out]
    subprocess.run(cmd, check=True)
    return out


# -------------------------------------------------------------------- lockup

def lockup(out, mark_svg, symbol_px=64, word_px=54, face="outfit700",
           bg="sky", width=700, height=170, tagline=True):
    gap = symbol_px * 0.34
    x0 = 40
    cy = height / 2 - (10 if tagline else 0)

    m = wm.metrics("SettleHex", face, word_px)
    baseline = cy + m["cap"] / 2

    parts = []
    if bg == "sky":
        parts.append(
            f'<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{SKY_TOP}"/>'
            f'<stop offset="1" stop-color="{SKY_BOT}"/></linearGradient></defs>'
            f'<rect width="{width}" height="{height}" fill="url(#sky)"/>')
        ink, sub = "#ffffff", "#e0f2fe"
    else:
        parts.append(f'<rect width="{width}" height="{height}" fill="{PAPER}"/>')
        ink, sub = INK, "#64748b"

    word, adv = wm.word("SettleHex", face, word_px,
                        x=x0 + symbol_px + gap, y=baseline, fill=ink)
    parts.append(word)
    if tagline:
        tag, _ = wm.word("Free online Catan for quick 1v1 games.", "outfit600", 17,
                         x=x0 + symbol_px + gap + 2, y=baseline + 30, fill=sub)
        parts.append(tag)

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">'
           f'{"".join(parts)}</svg>')
    tmp = os.path.join(build.SVG_DIR, "lockup_bg.svg")
    open(tmp, "w").write(svg)
    base = os.path.join(build.PNG_DIR, "lockup_bg.png")
    subprocess.run(["rsvg-convert", "-w", str(width), "-h", str(height), "-o", base, tmp], check=True)

    msvg = os.path.join(build.SVG_DIR, "lockup_mark.svg")
    open(msvg, "w").write(mark_svg)
    mpng = os.path.join(build.PNG_DIR, "lockup_mark.png")
    subprocess.run(["rsvg-convert", "-w", str(symbol_px), "-h", str(symbol_px),
                    "-o", mpng, msvg], check=True)
    subprocess.run(["magick", base, mpng, "-geometry",
                    f"+{x0}+{int(cy - symbol_px / 2)}", "-composite", out], check=True)
    return out
