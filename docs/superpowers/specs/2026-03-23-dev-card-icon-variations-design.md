# Development Card Icon Variations Design

Date: 2026-03-23
Scope: candidate replacements for `public/svgs/icon_devcard.svg`
Status: Approved for implementation

## Goal

Produce four Catana-native SVG variations for the development-card action icon, using the user's recreated split-medallion symbol as the starting point while moving away from a direct Colonist / official-Catan copy.

## Context

- The current `public/svgs/icon_devcard.svg` is effectively a borrowed full card-back medallion and does not feel native to Catana.
- The user recreated the official split medallion symbol as clean SVG geometry and wants to branch from that rather than from the current Colonist-derived asset.
- Runtime usage is in `app/catana/components/PlayerActionContainer.js`, inside the dock action buttons.
- The icon art itself renders at roughly `38px`, so small-size readability is the main acceptance bar.
- The user is open to adding a hammer cue if it stays clean and feels integrated into the existing Catana asset language.

## Approved Direction

- Keep the split-medallion concept as the shared base:
  - gray outer token,
  - warm top half,
  - cool bottom half,
  - inner top highlight circle or equivalent focal form.
- Move the symbol toward a Catana-specific `forge / maker / progress` emblem by introducing a simplified hammer glyph.
- Do not drop in a Fluent emoji hammer directly; redraw it as chunky SVG geometry.
- Generate four side-by-side variants rather than immediately replacing the live icon.

## Variant Set

1. `Forge Stamp`
- Closest to the recreated medallion.
- Centered hammer cue.
- Cleanest, safest small-size silhouette.

2. `Maker's Mark`
- Larger center hub with the hammer reading like a stamped insignia.
- More emblem-like and slightly less literal than the official symbol.

3. `Struck Seal`
- Diagonal hammer treatment for a more active, crafted feel.
- Slightly more expressive, but still icon-scale safe.

4. `Guild Token`
- Most remixed outer geometry while preserving the top/bottom medallion read.
- Intended to feel least like a direct clone even before the hammer is noticed.

## Visual Contract

- Optimize for dock-scale readability first; do not rely on fine detail that only works above `64px`.
- Use dark slate outlines and structure tones; avoid pure black.
- Keep geometry chunky and rounded.
- Keep fills broad and simple; no glossy sticker effects, heavy bevels, or photoreal rendering.
- Stay in the Catana family:
  - playful,
  - bright,
  - modern-flat,
  - slightly glassy/clean rather than gritty or heavily textured.
- Shift the palette enough that the icon is inspired by the official medallion, not a one-to-one trace:
  - coral/orange rather than exact Catan red-orange,
  - bright golden highlight,
  - Catana-friendly blue,
  - cool/warm gray ring tones.

## Acceptance Criteria

- Each candidate reads clearly as a special development-card / progress emblem at roughly `38px`.
- The four variants are meaningfully different in hammer treatment and ring geometry, not just palette swaps.
- The set feels closer to Catana than the current borrowed `icon_devcard.svg`.
- None of the variants read like a direct untouched copy of the official medallion.
- The live `public/svgs/icon_devcard.svg` remains unchanged during this exploration pass.
