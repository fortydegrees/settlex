# Resource Icon Canonical Template Spec (2026-02-23)

## Goal
Normalize resource-icon source files so layout and scale are predictable across tile overlays, ports, log rows, resource HUD chips, and future animations.

## Canonical file contract
- Artboard: `256 x 256`
- Root: `viewBox="0 0 256 256"`
- Main visible content inside a `192 x 192` safe area (`x=32`, `y=32`)
- Optical center target around `(128, 128)`
- Recommended stroke width at source scale: `6-10`
- Keep export background transparent

Template file:
- `public/svgs/concepts/resource_icon_template_256.svg`

## Why this size
- `256` is large enough for crisp downscaling and easy integer math.
- It gives enough room for tall/wide silhouettes without ad-hoc per-icon viewBoxes.
- It can be scaled cleanly for tile, port, and HUD usage from a single source.

## Implementation strategy
1. New/updated resource icons should be authored from the canonical template.
2. Keep existing runtime per-resource nudges while legacy icons are still mixed.
3. After all icons are normalized, simplify tile overlay constants to one shared scale/offset.

## Non-goals
- No immediate visual retune of existing palette colors.
- No runtime animation changes in this step.
