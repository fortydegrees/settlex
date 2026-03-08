# Catana Resource Icon Style Guide

Status: Authoritative draft for production handoff  
Last updated: 2026-02-23  
Applies to: `Wood`, `Brick`, `Sheep`, `Wheat`, `Ore`

## 1) Purpose
Define the visual and technical contract for Catana resource icons so external designers can deliver assets that:

- feel native to Catana's "joyful, vibrant, modern-flat" brand,
- remain legible at game sizes,
- work consistently across tile overlays, ports, HUD/resource bars, logs, and theme variants.

This guide is intentionally prescriptive. Treat all "must" statements as non-negotiable.

## 2) Brand Direction (Icon-Specific)

### Desired feel
- Friendly confidence.
- Playful, energetic, clear.
- Flat-modern, not realistic.
- In-world game asset, not sticker pack UI clipart.

### Avoid
- Heavy glow, outer aura, sticker-like halo.
- Photoreal detail or texture noise.
- Glossy global lighting sweeps.
- Pure black outlines.

## 3) Canonical Geometry Contract

Use the canonical template:
- `public/svgs/concepts/resource_icon_template_256.svg`

Hard constraints:
- Root artboard: `256 x 256`.
- Root viewBox: `0 0 256 256`.
- Keep all visible marks inside safe area: `x=32..224`, `y=32..224`.
- Optical center target: near `(128,128)`.
- Recommended stroke width at source scale: `6-10` (target around `7-7.5`).
- Export with transparent background.

Composition constraints:
- Icons should read **optically square** (avoid tall/thin silhouettes).
- Preferred occupancy target: ~60-72% of canvas width, ~58-70% of canvas height.
- Stable mass for tile top-center placement (not bottom-heavy, no long dangling tails).

## 4) Visual Language System

### 4.1 Shape grammar
- Primary read comes from silhouette first.
- Low-to-medium complexity only.
- Use chunky rounded geometry; avoid needle tips and micro-notches.
- No negative gaps that collapse below ~5 px at 256-scale.

### 4.2 Outline system
- Use a shared structural outline language across all 5 resources.
- Keep stroke tone dark and warm/cool relative to resource, but never pure black.
- Outline weight should feel consistent across the set.

### 4.3 Fill/shading system
- Prefer flat fill + local accent shapes ("per-lobe accents"), not full-icon global gradients.
- Keep shading subtle and geometric.
- Accent coverage should generally stay within ~15-30% of each major form.
- Avoid white specular "chrome" effects unless extremely subtle and shape-supporting.

### 4.4 Color-token model (master icon files)
Master resource icons should be authored with semantic paint tokens where possible:
- `var(--icon-fill-main)`
- `var(--icon-fill-accent)`
- `var(--icon-stroke)`

Rationale:
- One icon source can be recolored per theme/context (tile, port, HUD, log).
- Reduces redraw churn when palette tuning changes.

## 5) Resource-by-Resource Brief

## 5.1 Wheat
Must:
- Broad 3-head cluster (center + two side heads) as the core silhouette.
- Short merged stem/base.
- 5-9 grain lobes total.

Avoid:
- Single tall stalk.
- Long dangling stem.
- Overly botanical detail.

Intent:
- "Bright pasture harvest" energy; clear at a glance.

## 5.2 Wood
Must:
- Simple, chunky evergreen/tree silhouette.
- Distinct from Sheep at peripheral glance.

Avoid:
- Thin branch detail.
- Texture-like bark marks.

Intent:
- Forest/structure resource, not decorative tree illustration.

## 5.3 Sheep
Must:
- Friendly, simplified sheep silhouette with clear head/body separation.
- Keep wool mass bold and readable.

Avoid:
- Tiny facial detail that disappears at small sizes.
- Excessive fluff contour noise.

Intent:
- Characterful but not mascot-heavy.

## 5.4 Brick
Must:
- Clear brick/block stack read.
- Geometric, simplified block seams.

Avoid:
- High 3D depth and glossy bevels.
- Too many seam lines.

Intent:
- Solid manufactured material read, quick recognition.

## 5.5 Ore
Must:
- Cluster of stone chunks (typically 4-6 forms).
- Palette should read slate/steel, not ocean-blue.

Avoid:
- Water-adjacent blue cues.
- Facet micro-detail overload.

Intent:
- Cool mineral mass that remains distinct on blue board background.

## 6) Consistency Rules Across the Set

All 5 icons must align on:
- stroke rhythm/weight,
- corner rounding style,
- detail density,
- silhouette footprint (similar perceived visual mass),
- lighting model (flat + local accents, not mixed rendering styles).

If one icon is simplified, simplify the others to match.  
If one icon uses rich pseudo-3D facets, the entire set must be intentionally harmonized around that choice (current direction favors flatter treatment).

## 7) In-Game Context Constraints

Primary contexts:
- Tile top-center icon overlay.
- Port icon usage.
- Resource chips/HUD.
- Game log + compact UI rows.

Key behavior:
- Icon should support neutral/monochrome recolor without breaking legibility.
- Number token remains visual focal point on tiles; icon should support, not dominate.

Current runtime notes (engineering constraints):
- Tile overlay icons are rendered from themed paths (palette B overrides supported):
  - `public/svgs/palette-themes/option-b/icon_wood.svg`
  - `public/svgs/palette-themes/option-b/icon_brick.svg`
  - `public/svgs/palette-themes/option-b/icon_sheep.svg`
  - `public/svgs/palette-themes/option-b/icon_wheat.svg`
  - `public/svgs/palette-themes/option-b/icon_ore.svg`
- Tile placement/sizing is tuned in:
  - `app/catana/Tile.js`

## 8) Designer Deliverables

For each resource (`wood/brick/sheep/wheat/ore`) deliver:

1. Master SVG (token-ready paint, transparent bg)
- Based on 256 template contract.
- Final production group clean and normalized.

2. Preview PNGs
- `256px`, `72px`, `56px`, `42px`.
- One on neutral light gray.
- One over representative tile color.

3. Monochrome legibility preview
- Single-color fill + stroke treatment check.

4. Optional annotated source
- Brief notes for silhouette rationale and compromises made for small-size clarity.

Naming convention:
- `icon_wood.svg`
- `icon_brick.svg`
- `icon_sheep.svg`
- `icon_wheat.svg`
- `icon_ore.svg`

## 9) Acceptance Checklist (Pass/Fail)

- [ ] Reads correctly at `42px` without squinting.
- [ ] No texture/filter/blur/drop-shadow dependency.
- [ ] No pure black stroke/fill.
- [ ] Silhouette remains clear in one-color mode.
- [ ] Visual mass is balanced across all 5 resources.
- [ ] Wheat is broad cluster, not single-stalk.
- [ ] Ore reads slate/mineral, not water.
- [ ] Sheep and Wood remain distinct at peripheral glance.
- [ ] No sticker/glow aura look.
- [ ] Fits safe area and template contract exactly.

## 10) Quick "Do / Don't" Summary

Do:
- Keep forms chunky, geometric, and playful.
- Use flat fills plus restrained local accents.
- Design for tiny-size readability first.

Don't:
- Mix rendering styles (flat + glossy + textured) within one set.
- Let internal detail outrun silhouette clarity.
- Overfit to one context and break others.

## 11) Default Creative Recommendation

If the designer must choose a direction without additional review:

- pick the flatter Catana direction,
- use shared structural outline language,
- use local two-tone accents (not global gradients),
- prioritize square footprint and small-size legibility over decorative detail.
