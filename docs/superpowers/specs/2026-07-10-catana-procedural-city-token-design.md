# Catana Procedural City Token Design

## Goal

Create a clean procedural 3D city token by composing the already approved settlement form at two scales. The city should read immediately as the larger Settlers of Catan upgrade to the settlement, not as a separately designed building.

## Construction

The city consists of two settlement-derived masses:

1. A primary gabled mass using the settlement body and rounded roof geometry. Its initial authored scale is `1.30x` height, `1.18x` width, and `1.12x` depth, giving it close to twice the settlement's visual mass without doubling every linear dimension.
2. A secondary mass using the normal settlement scale of `1.00x`. It is rotated 90 degrees around the vertical axis and attached slightly rearward on the primary mass's right side to form an L-shaped footprint.

The secondary mass overlaps the primary mass slightly so the two read as one city and never expose a gap. Both masses sit on the same ground plane. The existing settlement taper, rounded base corners, roof profile, bevel treatment, depth, and material language remain the source of truth.

The primary front keeps the city SVG's lower door and small upper opening. The secondary mass has no door or additional ornament.

## Geometry Structure

During the spike, the primary body, primary roof, secondary body, secondary roof, door, and upper opening remain simple named meshes. The city should not use the previous unified L-shaped facade or a bespoke annex roof profile. Boolean unions and mesh merging are deferred until the visual design is approved.

The city source-guide view should show the two clean settlement-derived profiles and their transforms. Existing settlement generation and appearance must remain unchanged.

## Scope

This pass only replaces the city implementation in `.superpowers/asset-spikes/settlement-procedural-three/`.

It does not integrate the piece into the game, export a GLB, add dependencies, establish final triangle budgets, or optimize repeated runtime instances. Those steps should happen after the settlement and city are approved as a matched set.

## Acceptance Criteria

- At board scale, the token reads as a Catan city made from one enlarged settlement form plus one normal settlement-sized side form.
- The secondary form creates an unmistakable L-shaped footprint and retains the settlement's rounded gable-roof language.
- Front, board, and side views show no visible gaps, floating parts, accidental roof intersections, or mismatched ground levels.
- The city is visibly larger and taller than the settlement while still fitting the same board-piece visual family.
- The settlement toggle renders exactly as it did before the city rewrite.
- The implementation uses a small set of explicit scale, rotation, overlap, and placement parameters rather than accumulated corrective offsets.
