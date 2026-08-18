"""Deterministic SVG construction for the SettleHex identity studies.

Everything is real geometry: pointy-top hexagons on the same lattice the game
board uses, cropped by an outer silhouette, with a real Fredoka/Outfit 'S'
outline subtracted as negative space. No painting, no image generation.
"""

import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GLYPHS = json.load(open(os.path.join(HERE, "out", "glyph_S.json")))

VB = 1000.0  # every mark is authored on a 1000x1000 canvas

# Flat, board-derived colour roles. No gradients, no gloss.
GREEN = "#16a34a"
GREEN_LIGHT = "#4ade80"
LIME = "#84cc16"
AMBER = "#f59e0b"
ORANGE = "#f97316"
SEAT_BLUE = "#2563eb"
SEAT_ORANGE = "#ea580c"
SKY = "#0ea5e9"


# ---------------------------------------------------------------- primitives

def rounded_polygon(points, radius):
    """Path for a polygon with every corner rounded by `radius` (arc joins)."""
    n = len(points)
    cmds = []
    for i in range(n):
        prev = points[(i - 1) % n]
        cur = points[i]
        nxt = points[(i + 1) % n]

        def cut(a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            r = min(radius, length / 2.0)
            return (a[0] + dx / length * r, a[1] + dy / length * r)

        start = cut(cur, prev)
        end = cut(cur, nxt)
        if i == 0:
            cmds.append(f"M{start[0]:.2f},{start[1]:.2f}")
        else:
            cmds.append(f"L{start[0]:.2f},{start[1]:.2f}")
        cmds.append(f"Q{cur[0]:.2f},{cur[1]:.2f} {end[0]:.2f},{end[1]:.2f}")
    cmds.append("Z")
    return "".join(cmds)


def hexagon(cx, cy, r, rounding=0.0):
    """Pointy-top hexagon, matching the board's tile orientation."""
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 90)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    if rounding <= 0:
        return "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + "Z"
    return rounded_polygon(pts, rounding * r)


def squircle(cx, cy, half, n=4.6, steps=180):
    """Superellipse |x|^n + |y|^n = 1 — a true squircle, not a rounded rect.

    A rounded rect keeps four straight runs that read as 'app icon'; the
    superellipse stays continuously curved, which sits better beside hexagons.
    """
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = math.copysign(abs(ct) ** (2.0 / n), ct)
        y = math.copysign(abs(st) ** (2.0 / n), st)
        pts.append((cx + half * x, cy + half * y))
    return "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + "Z"


def hex_lattice(cell_r, extent=1.5):
    """Pointy-top hex lattice centres covering the canvas.

    Pitch matches app/catana/utils/coordinates.js: width = sqrt(3)*r,
    height = 2*r, rows step by 1.5*r with alternate rows offset by half a width.
    """
    w = math.sqrt(3) * cell_r
    row_step = 1.5 * cell_r
    centres = []
    rows = int(VB * extent / row_step) + 2
    cols = int(VB * extent / w) + 2
    for row in range(-rows, rows + 1):
        cy = VB / 2 + row * row_step
        offset = (w / 2) if (row % 2) else 0.0
        for col in range(-cols, cols + 1):
            cx = VB / 2 + col * w + offset
            centres.append((cx, cy))
    return centres


def s_path(face, height, cx=VB / 2, cy=VB / 2, extra_x_scale=1.0, dilate=0.0):
    """Place a real 'S' outline, scaled to `height`, centred on (cx, cy).

    `dilate` (canvas units) grows the shape by stroking it with its own colour.
    In the mask that makes the S clear every surrounding tile by a constant
    margin, so the void reads as a widened seam in the grout system rather than
    as a letter stamped on top of the tiles.
    """
    g = GLYPHS[face]
    k = height / 1000.0
    stroke = ""
    if dilate > 0:
        # Stroke width is specified pre-transform, so undo the scale.
        stroke = (f' stroke="currentColor" stroke-width="{2 * dilate / k:.2f}"'
                  f' stroke-linejoin="round" paint-order="stroke"')
    return (
        f'<path d="{g["path"]}"{stroke} '
        f'transform="translate({cx:.2f} {cy:.2f}) scale({k * extra_x_scale:.5f} {k:.5f})"/>'
    )


def s_width(face, height, extra_x_scale=1.0):
    return GLYPHS[face]["width"] * height / 1000.0 * extra_x_scale


# ------------------------------------------------------------------- marks

def honeycomb_s(
    face="fredoka600",
    crop="squircle",
    cell_r=190.0,
    grout=26.0,
    s_height=760.0,
    s_x_scale=1.0,
    s_dilate=0.0,
    rounding=0.20,
    colours=None,
    bg=None,
    lattice_dx=0.0,
    lattice_dy=0.0,
    pad=0.0,
):
    """Direction A: hex field, cropped to a silhouette, S subtracted as a void."""
    half = (VB - 2 * pad) / 2.0
    if crop == "squircle":
        outer = squircle(VB / 2, VB / 2, half)
    elif crop == "roundedhex":
        outer = hexagon(VB / 2, VB / 2, half * 1.06, rounding=0.16)
    else:
        raise ValueError(crop)

    fill = colours or [GREEN]
    cells = []
    for i, (cx, cy) in enumerate(hex_lattice(cell_r)):
        cx += lattice_dx
        cy += lattice_dy
        if abs(cx - VB / 2) > VB or abs(cy - VB / 2) > VB:
            continue
        colour = fill[i % len(fill)]
        cells.append(
            f'<path d="{hexagon(cx, cy, cell_r - grout / 2, rounding)}" fill="{colour}"/>'
        )

    bg_rect = f'<path d="{outer}" fill="{bg}"/>' if bg else ""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs>
<clipPath id="crop"><path d="{outer}"/></clipPath>
<mask id="scut" maskUnits="userSpaceOnUse" x="0" y="0" width="{VB:.0f}" height="{VB:.0f}">
<rect x="0" y="0" width="{VB:.0f}" height="{VB:.0f}" fill="#fff"/>
<g fill="#000" color="#000">{s_path(face, s_height, extra_x_scale=s_x_scale, dilate=s_dilate)}</g>
</mask>
</defs>
{bg_rect}
<g clip-path="url(#crop)" mask="url(#scut)">
{chr(10).join(cells)}
</g>
</svg>"""


def solid_s(face="fredoka600", crop="squircle", s_height=760.0, s_x_scale=1.0,
            s_dilate=0.0, colour=GREEN, pad=0.0):
    """Direction A, small-size variant: same silhouette and S, zero interior detail."""
    half = (VB - 2 * pad) / 2.0
    outer = (squircle(VB / 2, VB / 2, half) if crop == "squircle"
             else hexagon(VB / 2, VB / 2, half * 1.06, rounding=0.16))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs><mask id="scut" maskUnits="userSpaceOnUse" x="0" y="0" width="{VB:.0f}" height="{VB:.0f}">
<rect x="0" y="0" width="{VB:.0f}" height="{VB:.0f}" fill="#fff"/>
<g fill="#000" color="#000">{s_path(face, s_height, extra_x_scale=s_x_scale, dilate=s_dilate)}</g>
</mask></defs>
<path d="{outer}" fill="{colour}" mask="url(#scut)"/>
</svg>"""


def hex_aperture(colour=GREEN, aperture=0.46, pad=0.0):
    """Direction B: soft square with a simple hexagonal aperture."""
    half = (VB - 2 * pad) / 2.0
    outer = squircle(VB / 2, VB / 2, half)
    inner = hexagon(VB / 2, VB / 2, half * aperture * 2, rounding=0.2)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs><mask id="ap" maskUnits="userSpaceOnUse" x="0" y="0" width="{VB:.0f}" height="{VB:.0f}">
<rect x="0" y="0" width="{VB:.0f}" height="{VB:.0f}" fill="#fff"/>
<path d="{inner}" fill="#000"/>
</mask></defs>
<path d="{outer}" fill="{colour}" mask="url(#ap)"/>
</svg>"""


def duel_seam(colour_a=SEAT_BLUE, colour_b=SEAT_ORANGE, seam=54.0, pad=0.0):
    """Direction C: one squircle, split by a single seam that follows hex edges.

    The seam traces the zig-zag of a real tile boundary, so the mark reads as
    two territories meeting on the board rather than as an abstract split.
    """
    half = (VB - 2 * pad) / 2.0
    outer = squircle(VB / 2, VB / 2, half)
    r = 300.0
    w = math.sqrt(3) * r
    # A vertical run of pointy-top tile edges: the boundary between two columns.
    pts = [
        (VB / 2 - w / 2, -200),
        (VB / 2 - w / 2, 500 - r / 2),
        (VB / 2 + w / 2, 500 + r / 2),
        (VB / 2 + w / 2, 1200),
    ]
    d = "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in pts)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs><clipPath id="crop"><path d="{outer}"/></clipPath></defs>
<g clip-path="url(#crop)">
<path d="{outer}" fill="{colour_a}"/>
<path d="M{VB},-200 L{VB},1200 L{pts[3][0]:.2f},1200 {' '.join(f'L{x:.2f},{y:.2f}' for x, y in reversed(pts[:3]))} Z" fill="{colour_b}"/>
<path d="{d}" fill="none" stroke="#fff" stroke-width="{seam}" stroke-linejoin="round"/>
</g>
</svg>"""


def lattice_s(points, stroke=150.0, colour=GREEN, pad=0.0, join="round",
              cap="butt", crop="squircle", n=4.6):
    """Direction D: the S is drawn on the board's own 60-degree lattice.

    The field stays solid, so the silhouette and ink coverage survive 16px,
    while every angle in the counterform comes from hexagon edge directions.
    The hexagon reference lives in the letter, not in a texture that dissolves.
    """
    half = (VB - 2 * pad) / 2.0
    outer = (squircle(VB / 2, VB / 2, half, n=n) if crop == "squircle"
             else hexagon(VB / 2, VB / 2, half * 1.06, rounding=0.16))
    d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in points)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="{VB:.0f}" height="{VB:.0f}">
<rect x="0" y="0" width="{VB:.0f}" height="{VB:.0f}" fill="#fff"/>
<path d="{d}" fill="none" stroke="#000" stroke-width="{stroke}"
 stroke-linejoin="{join}" stroke-linecap="{cap}"/>
</mask></defs>
<path d="{outer}" fill="{colour}" mask="url(#cut)"/>
</svg>"""


def iso_s_points(style="classic", top=185.0, bot=815.0, run=185.0,
                 left=215.0, right=785.0, mid_short=180.0):
    """Waypoints for an S whose diagonals sit at 60 degrees to the horizontal.

    60 degrees is the angle between adjacent hexagon edges, so the letter is
    constructed from the same directions as the tile seams on the board.
    """
    mid = (top + bot) / 2.0
    if style == "classic":
        # Short middle bar; both connectors flare outward. Reads most like an S.
        return [(right, top), (left + run, top), (left, mid),
                (right - mid_short, mid), (right, bot - 0.0), (left, bot)]
    if style == "symmetric":
        # Point-symmetric about the centre; middle bar spans the full width.
        return [(right, top), (left + run, top), (left, mid),
                (right, mid), (right - run, bot), (left, bot)]
    if style == "compact":
        return [(right, top), (left + run, top), (left, mid),
                (right - run, mid), (right, bot), (left + 40, bot)]
    raise ValueError(style)


def settlement_points(w=470.0, h=520.0, roof=0.46, cx=VB / 2, cy=VB / 2 + 12):
    """Flat silhouette of a settlement: the piece players actually place."""
    x0, x1 = cx - w / 2, cx + w / 2
    y0, y1 = cy - h / 2, cy + h / 2
    eaves = y0 + h * roof
    return [(x0, y1), (x0, eaves), (cx, y0), (x1, eaves), (x1, y1)]


def void_mark(void_path, colour=GREEN, pad=0.0, crop="squircle", n=4.6):
    """Solid silhouette with an arbitrary shape knocked out as negative space."""
    half = (VB - 2 * pad) / 2.0
    outer = (squircle(VB / 2, VB / 2, half, n=n) if crop == "squircle"
             else hexagon(VB / 2, VB / 2, half * 1.06, rounding=0.16))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="{VB:.0f}" height="{VB:.0f}">
<rect x="0" y="0" width="{VB:.0f}" height="{VB:.0f}" fill="#fff"/>
{void_path}
</mask></defs>
<path d="{outer}" fill="{colour}" mask="url(#cut)"/>
</svg>"""


def duel_seam_v2(colour_a=SEAT_BLUE, colour_b=SEAT_ORANGE, seam=70.0, r=250.0, pad=0.0):
    """Direction C v2: two territories meeting along a real run of tile edges."""
    half = (VB - 2 * pad) / 2.0
    outer = squircle(VB / 2, VB / 2, half)
    w = math.sqrt(3) * r
    # Alternating vertical / 30-degree segments: the boundary between two
    # columns of pointy-top tiles, continued past the crop on both ends.
    pts, x, y = [], VB / 2 - w / 2, -260.0
    step = 0
    while y < 1300:
        pts.append((x, y))
        if step % 2 == 0:
            y += r
        else:
            x += w if (step // 2) % 2 == 0 else -w
            y += r / 2
        step += 1
    pts.append((x, y))
    d = "M" + "L".join(f"{px:.1f},{py:.1f}" for px, py in pts)
    right = (d + f"L{VB + 400},{pts[-1][1]:.1f} L{VB + 400},-400 L{pts[0][0]:.1f},-400 Z")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs><clipPath id="crop"><path d="{outer}"/></clipPath></defs>
<g clip-path="url(#crop)">
<path d="{outer}" fill="{colour_a}"/>
<path d="{right}" fill="{colour_b}"/>
<path d="{d}" fill="none" stroke="#fff" stroke-width="{seam}" stroke-linejoin="round"/>
</g>
</svg>"""


def hexish(cx, cy, half, t=0.5, rounding=0.30, steps=6):
    """Silhouette interpolated between a regular hexagon (t=0) and a square (t=1).

    A regular hexagon can only ever fill 75% of its bounding square, which is
    why a hex favicon reads small however it is coloured. Pushing the six
    vertices toward the square's corners buys back fill while keeping six sides.
    """
    pts = []
    for i in range(steps):
        angle = math.radians(60 * i - 90)
        hx, hy = math.cos(angle), math.sin(angle)
        # Square-ised version of the same direction: scale out to the box edge.
        m = max(abs(hx), abs(hy))
        sx, sy = hx / m, hy / m
        pts.append((cx + half * (hx * (1 - t) + sx * t),
                    cy + half * (hy * (1 - t) + sy * t)))
    return rounded_polygon(pts, rounding * half)


def hexish_s(face="fredoka600", t=0.5, rounding=0.30, s_height=700.0,
             colour=GREEN, pad=0.0):
    half = (VB - 2 * pad) / 2.0
    outer = hexish(VB / 2, VB / 2, half, t=t, rounding=rounding)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="{VB:.0f}" height="{VB:.0f}">
<rect x="0" y="0" width="{VB:.0f}" height="{VB:.0f}" fill="#fff"/>
<g fill="#000" color="#000">{s_path(face, s_height)}</g>
</mask></defs>
<path d="{outer}" fill="{colour}" mask="url(#cut)"/>
</svg>"""


def solid_s_opaque(face="fredoka600", s_height=780.0, colour=GREEN,
                   letter="#ffffff", pad=0.0, n=4.6):
    """Production form: two plain paths, no mask. The S is painted, not cut.

    A knockout S takes whatever colour sits behind it, which is fine on a light
    tab strip and poor on a dark one. Painting it keeps the mark identical
    everywhere, which matters more for a favicon than the conceptual purity of
    a true void.
    """
    half = (VB - 2 * pad) / 2.0
    outer = squircle(VB / 2, VB / 2, half, n=n)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB:.0f} {VB:.0f}">
<path d="{outer}" fill="{colour}"/>
<g fill="{letter}">{s_path(face, s_height)}</g>
</svg>"""
