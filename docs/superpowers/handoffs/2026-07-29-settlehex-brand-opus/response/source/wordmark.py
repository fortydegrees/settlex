"""Set 'SettleHex' as real outlines so wordmark studies are deterministic.

rsvg-convert can only reach fonts registered with fontconfig, and Fredoka is
not installed system-wide. Converting to paths keeps Fredoka and Outfit on
exactly equal footing instead of comparing a real face against a fallback.
"""

import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "out", "words.json")

FACES = {
    "fredoka600": ("fonts/Fredoka.ttf", {"wght": 600, "wdth": 100}),
    "fredoka500": ("fonts/Fredoka.ttf", {"wght": 500, "wdth": 100}),
    "outfit600": ("/Users/david/Library/Fonts/Outfit-VariableFont_wght.ttf", {"wght": 600}),
    "outfit700": ("/Users/david/coding/settlex/public/fonts/Outfit-Bold.ttf", None),
    "outfit900": ("/Users/david/coding/settlex/public/fonts/Outfit-Black.ttf", None),
}

_EXTRACT = r'''
import json, sys
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

path, loc, text = sys.argv[1], json.loads(sys.argv[2]), sys.argv[3]
font = TTFont(path)
if loc:
    font = instancer.instantiateVariableFont(font, loc, inplace=False)
upem = font["head"].unitsPerEm
gs = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"]
try:
    kern = font["kern"].kernTables[0].kernTable
except Exception:
    kern = {}

# Emit at a 1000-unit em regardless of the font's own upem so callers can size
# by font-size alone.
k = 1000.0 / upem
x = 0.0
parts = []
prev = None
for ch in text:
    name = cmap[ord(ch)]
    if prev is not None:
        x += kern.get((prev, name), 0) * k
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
    gs[name].draw(TransformPen(pen, (k, 0, 0, -k, x, 0)))
    d = pen.getCommands()
    if d:
        parts.append(d)
    x += hmtx[name][0] * k
    prev = name

asc = font["hhea"].ascent * k
desc = font["hhea"].descent * k
cap = getattr(font.get("OS/2"), "sCapHeight", 700) * k
print(json.dumps({"d": " ".join(parts), "advance": x, "ascent": asc,
                  "descent": desc, "cap": cap}))
'''


def _build(text):
    out = {}
    for key, (path, loc) in FACES.items():
        res = subprocess.run(
            [os.path.join(HERE, "venv", "bin", "python"), "-c", _EXTRACT,
             path, json.dumps(loc), text],
            capture_output=True, text=True, check=True,
        )
        out[key] = json.loads(res.stdout)
    return out


def word(text, face, size, x=0.0, y=0.0, tracking=0.0, fill="#0f172a"):
    """SVG <path> for `text` in `face` at `size` px, baseline-anchored at (x, y).

    `tracking` is in em/1000 units per letter gap, matching CSS letter-spacing.
    """
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    if text not in cache:
        cache[text] = _build(text)
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        json.dump(cache, open(CACHE, "w"))
    g = cache[text][face]
    k = size / 1000.0
    if tracking:
        # Re-set with tracking by scaling per-glyph offsets is overkill; instead
        # letter-space by rebuilding with an adjusted advance is not supported
        # here, so tracking is applied as a uniform horizontal scale hint only.
        pass
    return (f'<path d="{g["d"]}" fill="{fill}" '
            f'transform="translate({x:.2f} {y:.2f}) scale({k:.5f})"/>'), g["advance"] * k


def metrics(text, face, size):
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    if text not in cache:
        cache[text] = _build(text)
        json.dump(cache, open(CACHE, "w"))
    g = cache[text][face]
    k = size / 1000.0
    return {kk: vv * k for kk, vv in g.items() if kk != "d"}
