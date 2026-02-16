# Tile Design Notes

Casual doc capturing our design decisions and learnings as we build the tile set.

## Style

The tiles feel like **emblems/badges** — not photorealistic materials, not flat icons. They have a low-poly, stylized quality with soft lighting and subtle depth. Think "app icon" or "shield crest" more than "texture swatch" or "illustration."

Key qualities that make a tile work:
- **Presence** — feels like a 3D-ish object/mass, not a flat pattern
- **Tight tonal range** — mostly 2 tones of the same hue, not many competing colors
- **Bold shapes** — few large confident shapes, not many small detailed ones
- **Cream/white border** — consistent across all tiles, gives breathing room and a tactile "sticker" quality
- **Slight soft lighting** — brighter areas catch light, subtle not dramatic

What does NOT work:
- Flat wallpaper/texture swatches (first brick attempts)
- Too many color tones fighting for attention
- Too photorealistic or detailed (pencil-drawing feel)
- Too literally depicting the resource (a brick wall vs "essence of brick")

## Geometric Shape Language

Each resource has a core geometric motif:

| Resource | Shape | Notes |
|----------|-------|-------|
| Ore | Shards/facets (triangular) | Low-poly faceted rock mass, dark slate-blue |
| Wheat | Chevrons (V-shapes) | Repeating pattern like rows in a field, golden |
| Wood | Triangles | Geometric trees on dark green ground |
| Brick | Rectangles | Offset block pattern, warm terracotta |
| Sheep | Circles | TBD — could be wool puffs, rolling hills, clouds |
| Desert | TBD | TBD |

The motif isn't decoration ON the tile — it IS the tile's surface/texture.

## Color Palette

| Resource | Primary tones | Vibe |
|----------|--------------|------|
| Ore | Dark slate blue-gray (#475569 → #94a3b8) | Cool, mineral, rocky |
| Wheat | Golden amber (#d97706 → #fcd34d) | Warm, sunny, golden |
| Wood | Dark emerald green (#15803d → #34d399) | Lush, forest |
| Brick | Terracotta orange (#c2410c → #f97316) | Earthy, warm |
| Sheep | Lime green (TBD) | Pastoral, bright |
| Desert | Sandy amber (TBD) | Arid, warm, sparse |

## Layout

- Tiles are 346x400px (pointy-top hex)
- Number token sits slightly below center (rendered by code, not baked into tile)
- Upper ~35% is the best spot for any focal element
- Center should have enough visual uniformity for the token to sit cleanly on top
- Border is ~15px cream/white edge

## AI Prompting Learnings

What works:
- Attaching an existing tile as style reference ("this exact style but...")
- "Low-poly" as a style keyword
- Describing geometry swaps ("triangular facets → rectangular facets")
- "Board game tile" and "cream border" as anchors
- "Emblem" or "badge-like quality"

What doesn't work:
- Asking for "abstract pattern of [shape]" — too vague, gets flat texture results
- "Brick wall" in any form — generators default to literal brick walls
- Too many style adjectives — keep prompts focused
- Asking for "flat vector" when you actually want the slight 3D depth these tiles have

## Status

- [x] Ore — done (ore_mockup.png)
- [x] Wheat — done (wheat_mockup.png)
- [x] Wood — done (wood_lumber_mockup.png), bottom-left variant preferred
- [x] Brick — done-ish (most literal tile but works), needs final save
- [ ] Sheep — next up, hardest one (circles → ?)
- [ ] Desert — TBD
- [ ] Convert finalized PNGs → usable SVGs or clipped raster tiles

## Future (beyond resource tiles)

These all need the same cohesive style:
- Port tiles (3:1 generic + per-resource)
- Robber icon
- Settlement / City / Road pieces
- Development cards
- Number tokens (currently rendered in code)
