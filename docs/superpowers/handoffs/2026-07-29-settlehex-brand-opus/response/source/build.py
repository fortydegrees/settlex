import os
import subprocess
import sys

import marks

HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, "svg")
PNG_DIR = os.path.join(HERE, "png")
os.makedirs(SVG_DIR, exist_ok=True)
os.makedirs(PNG_DIR, exist_ok=True)


def write(name, svg):
    path = os.path.join(SVG_DIR, f"{name}.svg")
    with open(path, "w") as fh:
        fh.write(svg)
    return path


def render(name, size, suffix=None):
    """Rasterise the SVG natively at `size` (what an SVG favicon actually does)."""
    src = os.path.join(SVG_DIR, f"{name}.svg")
    dst = os.path.join(PNG_DIR, f"{name}@{suffix or size}.png")
    subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size), "-o", dst, src],
        check=True,
    )
    return dst


def render_downsampled(name, size, master=512):
    """Rasterise big then Lanczos down — how a real .ico entry gets authored."""
    src = os.path.join(SVG_DIR, f"{name}.svg")
    big = os.path.join(PNG_DIR, f"{name}@{master}.png")
    dst = os.path.join(PNG_DIR, f"{name}@{size}ds.png")
    subprocess.run(["rsvg-convert", "-w", str(master), "-h", str(master), "-o", big, src], check=True)
    subprocess.run(["magick", big, "-filter", "Lanczos", "-resize", f"{size}x{size}", dst], check=True)
    return dst


def coverage(png):
    out = subprocess.run(
        ["magick", png, "-alpha", "extract", "-format", "%[fx:mean*100]", "info:"],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout)
