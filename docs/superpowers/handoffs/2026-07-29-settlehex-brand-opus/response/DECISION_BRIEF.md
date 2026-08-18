# SettleHex identity — diagnosis, evidence, recommendation

Exploration only. No production code, assets, or config were changed. Every
image in this folder is deterministic vector geometry rendered with
`rsvg-convert`, using real Fredoka and Outfit glyph outlines extracted with
fontTools — not image generation, and not a prose description of a picture.

Coverage figures below are mean alpha over the 16×16 icon square: the share of
the browser's tab slot the mark actually occupies. It is the closest single
number to "how big does this look in a tab".

---

## 1. Blunt diagnosis

**The favicon's problem is the silhouette, not the glyph.** A regular hexagon
can only ever fill **72–75%** of its bounding square; the corners are dead
space you are still paying for. Measured:

| Asset | Coverage at 16px | Baked-in transparent padding |
|---|---|---|
| Current SettleHex `Sx` hex | **57.6%** | 209×236 ink in a 256 canvas → ~9% each side |
| Colonist `C` hex | 64.9% | 56×64 in 64 → **zero** vertical padding |
| A squircle | **94.2%** | zero |

So the mark is small for two compounding reasons: it chose a shape that
forfeits a quarter of the square, then added ~9% padding *inside* the source
file on top of the padding the browser already applies. Colonist uses the same
weak silhouette but at least lets it bleed to the canvas edge — that alone is
the entire 7-point gap between you.

**`Sx` is not small, it is illegible.** See `01-current-favicon-diagnosis.png`
(16px, 32px, Colonist at 16px, all zoomed 20×). At 16px the `Sx` is not two
letters rendered small — it is a pale rectangular smear with a notch. Two
glyphs need roughly 2× the width of one, and there is no width to give. The
gradient makes it worse: the top half of the badge is pale, so contrast against
a light tab strip collapses exactly where the letters sit.

**The wordmark and the badge are solving different briefs.** Fredoka's rounded
`Settlehex` plus a glossy, bevelled, vignetted, drop-shadowed green hex reads as
a 2014 mobile game icon. The gloss is the single most dated element and it is
doing no work at any size.

**The social card is your strongest existing asset and it is the odd one out.**
Large flat Outfit `SettleHex` on a light panel, no symbol, no gloss. It looks
current. It is also the only surface that already obeys the rules the rest of
the system should adopt. The tell is that your best surface is the one with the
*fewest* brand devices on it.

**Casing.** `Settlehex` on the homepage vs `SettleHex` everywhere else. Fix to
`SettleHex` — already correct in `app/metadata.js`.

---

## 2. The three strongest directions, tested

`05-negative-space-matrix.png` — the requested matrix. Two crops
(soft-square vs rounded-hex) × two mask faces (Fredoka 600 vs Outfit 700) ×
two honeycomb densities, each shown at 200px, 64px and **true 16px**.

`06-rejected-directions.png` — the two directions I killed, with the evidence.

`03-browser-tab-16px.png` — current vs proposed vs Colonist in a 1:1 Chrome tab
strip, then the same strip at 300%.

---

## 3. Does the negative-space typographic S work?

**Yes as a large mark. No as a favicon — and not for taste reasons, for
geometric ones.** The construction is self-defeating below about 48px, and I
can state the conflict precisely:

- The S reads only if the field around it is **solid** — figure/ground needs an
  uninterrupted ground.
- The honeycomb reads only if the field is **cut by seams**.
- A seam must be ≥1.3px at 16px to survive antialiasing. On a 1000-unit canvas
  that is ≥85 units.
- At 85 units the seams **sever the outer silhouette**. The squircle stops being
  a shape and becomes floating blobs; coverage falls to 39–48%, i.e. *worse than
  the mark you are replacing*.
- Below 85 units the seams are invisible at 16px and contribute only mottled
  noise.

There is no setting where both conditions hold. This is visible in
`06-rejected-directions.png` (bottom band, `cell_r=330` at three grout widths).

There is a second, subtler failure the matrix makes obvious: **the S-void and
the tile seams are the same colour and, at 16px, the same width.** They stop
being distinguishable, so the seams eat into the letter's edges. The S doesn't
just sit in noise — it is actively degraded by it.

Within the matrix, the sub-answers:

- **Soft-square beats rounded-hex decisively** (94.2% vs 72.2% silhouette fill).
  A hex crop filled with hex cells is also tautological — hexagons inside a
  hexagon add no information.
- **Outfit's S masks slightly better than Fredoka's.** Outfit Bold's S is
  *wider* (aspect 0.735 vs 0.694) with a more open aperture, so its counters
  close up later as size drops. This is the opposite of the intuition that the
  rounded face is the friendlier, softer one.
- **Density is irrelevant at 16px.** Coarse and fine converge on the same mush.

**I also tested two things you did not ask for, and both failed** — recorded so
they are not re-litigated:

- *An S built on the board's own 60° lattice* (angular, hexagon-derived
  letterform). It reads as a numeral **5**, not an S, at every size, and its
  sharpness lands in the esports register the brief rules out.
- *A duel/two-territory seam* (1v1 as the concept). The seam reads as a
  lightning bolt. A zigzag carries no hexagon-specific meaning; more iteration
  would not have saved the idea.

---

## 4. Recommendation

**One mark at every size: a soft-square in SettleHex green with a painted white
Outfit Bold `S`. Retire the honeycomb, the gloss, the `Sx`, and Fredoka.**

`02-standalone-and-favicon.png` — 256px, 64px, 32px, 16px (zoomed, then at
actual size).
`04-homepage-lockup.png` — Fredoka wordmark (top) vs Outfit 700 (bottom).

Coverage at 16px goes **57.6% → 94.6%**: a 64% increase in optical presence
without touching the browser's own padding.

### On the Colonist objection

The brief's fear is that "solid shape + white initial" is Colonist's
construction. Look at `03-browser-tab-16px.png` and judge it on the pixels: a
green **square** with a large `S` beside a blue **hexagon** with a small `C`.
Different silhouette family, different hue, different letter, and a very
different letter-to-field ratio — measured, the Colonist `C` occupies **47%** of
its icon box height against the proposed `S`'s **78%**. Nobody confuses these.

The stronger point is that **the constraint was aimed at the wrong surface.** At
16px you have ~200 usable pixels and can carry exactly one silhouette and one
counterform. Every good favicon converges on that, which is why so many look
alike. Trying to be distinctive at 16px is precisely what produced `Sx`.
Distinctiveness belongs where people actually form impressions — the homepage,
the board, the share card — and your board is already the most distinctive asset
you own. **Let the favicon be legible and let the product be distinctive.**

That is what "responsive identity" should mean here, and it is a different
answer from the one the brief expected.

### Typography — direct answers

| Question | Answer |
|---|---|
| Keep Fredoka for the homepage wordmark? | **No.** |
| Can Outfit be softened without losing warmth? | **It does not need softening** — see below. |
| Should the S-mask match the wordmark face? | **Yes**, and that face is Outfit. |
| Is a separate display face justified? | **No.** It is unearned complexity. |

The evidence is `07-wordmark-faces.png`. Set at identical cap height, the two
candidates are nearly the same object: `SettleHex` measures **401.8px** in
Fredoka 600 and **401.5px** in Outfit 600 — a **0.07%** difference. The team is
carrying a second webfont, a second `next/font` request, and a
homepage-vs-product typographic split to buy a distinction that is essentially
invisible at wordmark size.

"Outfit felt too sharp" is real but misattributed. It was Outfit at UI weight in
near-black slate at display size. Outfit **700** at the deep ocean blue already
in `NOTES.md` (`#143f60`), or white on sky, is warm and confident — bottom half
of `04-homepage-lockup.png`. The double-`t` join in "Settle" is a genuinely nice
ownable detail that Fredoka rounds away.

---

## 5. Implementation specification

### Symbol

- **Silhouette:** superellipse `|x|^4.6 + |y|^4.6 = 1`, inscribed in the **full**
  icon box. A true squircle, not a rounded rect — a rounded rect keeps four
  straight runs that read as "app icon".
- **Padding inside the asset: zero.** The browser adds its own. This is the
  single highest-yield change.
- **Letter:** Outfit Bold (700) `S`, glyph **bounding box** scaled to **78%** of
  the icon box height, its bbox centre on the icon centre. Size by bbox, not by
  font-size — font-size leaves inconsistent optical margins.
- **Paint the S; do not knock it out.** A transparent counter takes the tab
  strip's colour and nearly vanishes in dark mode. Verified — this was a real
  finding, not a precaution.
- Flat fills only. No gradient, inner stroke, vignette, or drop shadow.

`settlehex-mark.svg` in this folder is the production file: two plain paths, no
mask, no font dependency, glyph already outlined.

### Wordmark

- **Outfit Bold (700)**, cased `SettleHex`, default tracking (0).
- Colour: `#143f60` on light; `#ffffff` on sky/blue.
- Lockup: symbol height = wordmark **cap height × 1.16**; gap between symbol and
  wordmark = **0.34 × symbol height**; baselines optically aligned by cap centre.

### Colour roles

| Role | Value | Use |
|---|---|---|
| Brand green | `#16a34a` | symbol field, only place the brand green appears at brand scale |
| Symbol letter | `#ffffff` | the `S`, always painted |
| Ink | `#143f60` | wordmark on light |
| Ink inverse | `#ffffff` | wordmark on sky/blue |

Green stays the differentiator: Colonist owns blue, and the homepage background
is blue, so a blue mark would both collide and disappear.

### Clear space

- Lockup: **0.25 × symbol height** on all four sides.
- Favicon: **zero**, as above.

### Responsive variants

| Surface | Treatment |
|---|---|
| favicon 16/32px | symbol only, zero padding |
| standalone 48–64px | symbol only |
| homepage lockup | symbol + `SettleHex` + descriptor |
| share card | **wordmark-led, no symbol** — keep it as it is |

The share card keeping the wordmark alone is deliberate, not an inconsistency: a
responsive identity uses the wordmark where there is room and the symbol where
there is not. `08-share-card.png` shows both; the symbol version is more
cramped and adds nothing at feed size.

### Retire

- The glossy gradient, inner stroke, vignette and drop shadow on the badge.
- The `Sx` two-glyph construction, including the `s`, `cluster`, and split-`Sx`
  variants in `HomeTableClient.js`.
- The hexagon silhouette **for the icon** (the board keeps hexagons; the icon
  does not need to repeat them).
- The `Fredoka` import and `brandWordmarkFont` in
  `app/catana/home/HomeTableClient.js`.
- `Settlehex` casing on the homepage.

---

## 6. Smallest prototype that would actually validate this

Do **not** validate by looking at large renders — that is what produced the
current mark.

1. Build a real multi-size `.ico` from `settlehex-mark.svg` (256/64/48/32/16,
   each Lanczos-downsampled from a 512 master) and drop it in as `app/favicon.ico`.
2. Change nothing else.
3. Open SettleHex in a real browser alongside ~10 other pinned tabs, in **both**
   light and dark mode, and leave it for a day.

That single swap tests every claim that matters — silhouette fill, zero padding,
one-glyph legibility, painted-vs-knockout — and is fully reversible with
`git checkout app/favicon.ico`.

Only if that holds up is it worth touching the wordmark, and that is a separate,
larger change: dropping Fredoka affects the homepage lockup, `next/font` loading,
and the beta copy work already in flight.

### If you want to keep the honeycomb

It is a legitimate **homepage-only** device at 200px+, where it does look good
and does look like SettleHex — particularly in board colours. But it is not part
of the identity system; it is decoration on one surface. Treat it as such, and
do not let it dictate the mark. My recommendation is to skip it: the real board
is already on that page, and a logo that also depicts a board is redundant.
