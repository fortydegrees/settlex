"""Extract real 'S' outlines from Fredoka and Outfit as normalised SVG paths.

Coordinates are emitted y-down (SVG convention) and normalised so the glyph
bounding box is centred on (0,0) with a height of exactly 1000 units. Callers
then place the S by scaling that box, so every study uses identical optical
sizing regardless of which face supplied the outline.


Run with a Python environment that already provides fontTools. Set
SETTLEX_FREDOKA_FONT to the exact original Fredoka variable TTF. Static Outfit
Bold/Black inputs come from this checkout's public/fonts; no substitute face is
selected. Missing external inputs fail explicitly when extraction is requested.
"""

import json
import os
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

REPO_FONTS = Path(__file__).resolve().parents[6] / "public" / "fonts"

FACES = {
    # name: (path, variable-axis location or None, weight label)
    "fredoka600": (os.environ.get("SETTLEX_FREDOKA_FONT"), {"wght": 600, "wdth": 100}, "Fredoka SemiBold"),
    "fredoka500": (os.environ.get("SETTLEX_FREDOKA_FONT"), {"wght": 500, "wdth": 100}, "Fredoka Medium"),
    "outfit700": (str(REPO_FONTS / "Outfit-Bold.ttf"), None, "Outfit Bold"),
    "outfit900": (str(REPO_FONTS / "Outfit-Black.ttf"), None, "Outfit Black"),
}


def outline(font_path, location, char):
    font = TTFont(font_path)
    if location:
        font = instancer.instantiateVariableFont(font, location, inplace=False)
    glyph_set = font.getGlyphSet()
    glyph_name = font.getBestCmap()[ord(char)]
    glyph = glyph_set[glyph_name]

    bounds = BoundsPen(glyph_set)
    glyph.draw(bounds)
    x0, y0, x1, y1 = bounds.bounds

    # Normalise: centre the glyph bbox on the origin, scale to 1000 tall, and
    # flip Y so the emitted path is already in SVG's y-down space.
    scale = 1000.0 / (y1 - y0)
    cx = (x0 + x1) / 2.0
    cy = (y0 + y1) / 2.0

    svg_pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:.2f}")
    tp = TransformPen(svg_pen, (scale, 0, 0, -scale, -cx * scale, cy * scale))
    glyph.draw(tp)

    return {
        "path": svg_pen.getCommands(),
        "width": (x1 - x0) * scale,
        "height": 1000.0,
        "unitsPerEm": font["head"].unitsPerEm,
    }


if __name__ == "__main__":
    char = sys.argv[1] if len(sys.argv) > 1 else "S"
    out = {}
    for key, (path, loc, label) in FACES.items():
        if not path:
            raise ValueError("set SETTLEX_FREDOKA_FONT to the exact original Fredoka variable TTF")
        data = outline(path, loc, char)
        data["label"] = label
        out[key] = data
        print(f"{key:12s} {label:18s} aspect w/h = {data['width']/1000:.3f}", file=sys.stderr)
    print(json.dumps(out, indent=1))
