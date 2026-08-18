"""Compose contact sheets that show each mark at true 16/32px next to a zoom."""

import os
import subprocess

import build

PAPER = "#f5f5f4"


def ladder(name, zoom=8):
    """[256px] [32px zoomed] [16px zoomed] for one mark, on a paper strip.

    The 16 and 32 entries are Lanczos downsamples of a 512px master, which is
    exactly how a .ico entry is authored — not a vector rasterised at 16px.
    """
    build.render(name, 256)
    p16 = build.render_downsampled(name, 16)
    p32 = build.render_downsampled(name, 32)
    z16 = os.path.join(build.PNG_DIR, f"{name}@16zoom.png")
    z32 = os.path.join(build.PNG_DIR, f"{name}@32zoom.png")
    subprocess.run(["magick", p16, "-scale", f"{16*zoom}x{16*zoom}", z16], check=True)
    subprocess.run(["magick", p32, "-scale", f"{32*zoom//2}x{32*zoom//2}", z32], check=True)
    return [os.path.join(build.PNG_DIR, f"{name}@256.png"), z32, z16]


def strip(paths, out, pad=14, bg=PAPER, gravity="center"):
    cmd = ["magick"]
    for p in paths:
        cmd += [p, "-background", "none", "-gravity", gravity, "-extent", "0x0"]
    cmd += ["+append", "+repage", "-background", bg, "-alpha", "remove", "-alpha", "off",
            "-bordercolor", bg, "-border", str(pad), out]
    subprocess.run(cmd, check=True)
    return out


def stack(paths, out, bg=PAPER):
    subprocess.run(["magick"] + paths + ["-background", bg, "-gravity", "west",
                                         "-append", "+repage", out], check=True)
    return out


def pad_to(paths, out, bg=PAPER):
    """Append rows of equal width by left-aligning on the widest."""
    return stack(paths, out, bg)
