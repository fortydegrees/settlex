# Resource Card Emblem Design

Date: 2026-03-24
Scope: standalone emblem concepts for the center mark on `public/svgs/card_rescardback.svg`
Status: Approved for concept generation

## Goal

Create a Catana-native standalone emblem that can sit at the center of the resource card back and communicate `resource network / board resources` more clearly than the current question-mark direction.

## Context

- The current hidden resource-card concept work lives in:
  - `tmp/card-back-concepts/round3/resource-question-bands-boardfit.svg`
- The user wants to explore a new center mark based on:
  - an outer hex badge,
  - five smaller connected hexes inside,
  - the existing Catana tile-hex language rather than a generic symbol.
- The emblem will eventually be dropped into the resource card back, but this pass should stay focused on a standalone emblem first.
- Runtime usage remains the opponent hidden-card stack in:
  - `app/catana/components/CardStack.js`
  - `app/catana/components/OpponentPlayerBox.js`
- Final readability target is still roughly `52 x 72`, so the emblem must survive small card-back rendering.

## Approved Direction

- Build the emblem as a `hybrid seal`, not a literal copy of the reference photo.
- Reuse the same broad outer-hex shape language as the Catana tile assets.
- Keep the mark centered and badge-like rather than turning the full card back into a dense hex pattern.
- Express the inner idea as `five connected board hexes`, using chunky small hexes and minimal connector logic.
- Stay within the Catana board palette and lighting model:
  - warm cream / amber badge structure,
  - soft orange accenting,
  - restrained radial lift similar to the tile faces,
  - no black line art,
  - no metallic rendering,
  - no ornate Celtic knot or engraved-card detail.

## Shape Language

- Outer silhouette:
  - a single primary hex badge derived from the current tile shape family,
  - with a warm rim and a lighter inner field.
- Inner network:
  - five small hexes arranged around a tiny center joint,
  - reading as a connected resource cluster rather than a flower or soccer-ball patch.
- Connector treatment:
  - prefer shared edges or very short joins over long technical lines,
  - enough structure to read as connected,
  - not enough to feel like a diagram.

## Visual Contract

- The emblem should feel bright, toy-like, and board-native.
- Use broad, simple masses only; no tiny filigree curls from the reference.
- Gradients are allowed, but only in the same restrained way as Catana tiles:
  - lighter center,
  - slightly darker edge,
  - low contrast overall.
- The emblem should remain readable when scaled down into a small medallion on the resource card back.

## Concept Pass

Generate a small standalone SVG set, not live asset replacements yet.

Recommended concept family:

1. `Hybrid Seal`
- Outer tile-style hex.
- Soft inner field.
- Five-hex cluster with shared-edge connection feel.

2. `Network Hex`
- More direct board/network read.
- No circular medallion inside; keep the inner cluster directly inside the badge.

3. `Medallion Cluster`
- Slightly more ceremonial badge feel.
- Closest to the reference composition, but still flattened and simplified into Catana language.

## Acceptance Criteria

- At least one emblem reads immediately as `board/resource network` without needing a question mark.
- The emblem feels like it belongs with the Catana board and tile system.
- The result is clearly inspired by the reference motif, but not a direct copy.
- The concept set remains simple enough to integrate into the existing resource card-back family without creating visual clutter.
- Live `public/svgs/card_rescardback.svg` remains unchanged during this emblem concept pass.
