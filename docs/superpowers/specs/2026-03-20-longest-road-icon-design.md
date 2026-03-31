# Longest Road Icon Design

Date: 2026-03-20
Scope: `public/svgs/icon_longest_road.svg`
Status: Approved for implementation

## Goal

Replace the copied placeholder longest-road icon with a Catana-native status glyph that reads clearly beside the player avatar stats rail.

## Context

- This icon is not a trophy badge or reward medallion.
- It appears in `app/catana/components/PlayerAvatarStats.js` at roughly `28px`.
- The adjacent numeric stat carries the actual road length, so the icon only needs to communicate `connected road network`.
- When the player owns Longest Road, the number becomes the highlighted element; the icon should remain visually supportive rather than stealing attention.

## Approved Direction

- Base the icon on Catana's actual road-piece language, not on imported Colonist-style art.
- Use `two connected road pieces` as the core metaphor.
- Keep the forms chunky and low-detail so the silhouette survives tiny rendering.
- Favor a shallow connected arrangement over a literal arch, badge, or road sign.

## Visual Contract

- Root artboard should stay compact and UI-friendly; `32 x 32` is acceptable for consistency with neighboring stat icons.
- Use broad road-piece silhouettes with rounded corners and clear overlap/connection.
- Avoid thin rails, tiny seams, or small decorative details.
- Avoid pure black outlines.
- Use a neutral muted palette so the icon works on the blue glass stat background and does not compete with the yellow highlighted number state.
- Keep any shading restrained and plane-based; no glossy imported-game bevel language.

## Acceptance Criteria

- Reads as `road network` at a glance around `28px`.
- Feels derived from Catana's own road piece shape family.
- Holds up on the current player stat background without requiring extra glow effects.
- Is simpler and more legible than the copied placeholder it replaces.
