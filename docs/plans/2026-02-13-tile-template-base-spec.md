# 2026-02-13 Tile Template Base Spec

## Scope
- Establish the canonical base SVG structure for the first Catana tileset.
- Include only structure: hard-edged border + reusable inner clip area.
- Exclude resource-specific art fills for now.

## Border Thickness Decision
- Outer hex geometry is fixed to the canonical frame:
  - `M173 0 L346 100 L346 300 L173 400 L0 300 L0 100 Z`
- Inner hex geometry is fixed to:
  - `M173 15 L333.2 107.5 L333.2 292.5 L173 385 L12.8 292.5 L12.8 107.5 Z`
- This yields a visibly strong border that reads at roughly 13-15 px around the perimeter while preserving a large interior art area.
- The inset keeps a confident silhouette at game scale without making the border feel heavy.

## Border Color Rationale
- Chosen border color: `#fbbf24` (Catana-aligned amber accent; Tailwind `amber-400`).
- Why this color:
  - Vibrant and celebratory (fits Catana's joyful/confident direction).
  - Flat solid color with high readability against future fills.
  - Intentionally avoids direct reuse of legacy/competitor-like gold values (e.g., `#e0b568` from prior placeholder art).
- Alternative candidates considered:
  - `#facc15` (`yellow-400`): energetic but too lemon-bright for the border role.
  - `#f59e0b` (`amber-500`): richer but slightly too heavy/warm for Catana's light feel.

## Inner Clip Geometry Contract
- Canonical IDs in `public/svgs/concepts/tile_template_base.svg`:
  - `tileInnerHex`: reusable inner hex path in `<defs>`.
  - `tileInnerClip`: clip path referencing `tileInnerHex`.
  - `tileArt`: empty clipped group for future per-resource abstract fills.
- Contract for this tileset:
  - Future resource art must be added inside `#tileArt` (and therefore clipped by `#tileInnerClip`).
  - Keep `width="346" height="400" viewBox="0 0 346 400"` unchanged.
  - Keep the clip IDs stable unless a planned migration updates all dependent assets.

## Why This Fits Catana Style
- Hard-edged geometry keeps the look modern and confident.
- The flat, saturated amber border delivers vibrant energy without gradients or texture.
- Minimal structural template keeps authoring simple, reusable, and consistent across all tile variants.
