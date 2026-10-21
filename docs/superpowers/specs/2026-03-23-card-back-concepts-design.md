# Hidden Card Back Concepts Design

Date: 2026-03-23
Scope: concept replacements for `public/svgs/card_rescardback.svg` and `public/svgs/card_devcardback.svg`
Status: Approved for concept generation

## Goal

Create a small set of Catana-native SVG concepts for the hidden `resource` and `dev` card backs used in opponent stacks, keeping a shared card silhouette while replacing the current borrowed ornate backs with flatter, clearer printed-card designs.

## Context

- The current hidden-card assets in:
  - `public/svgs/card_rescardback.svg`
  - `public/svgs/card_devcardback.svg`
  are detailed and skeuomorphic.
- Runtime usage is in `app/catana/components/OpponentPlayerBox.js`.
- Cards render through `CardStack` at roughly `52 x 72`, so the backs must read at small stacked sizes.
- The user wants:
  - a shared family for resource and dev backs,
  - flatter printed-card treatment,
  - no heavy faux-material card-art rendering,
  - different palette/emblem treatment so the two hidden piles are distinguishable.

## Approved Direction

- Keep the card silhouette because the stack must still read as cards.
- Remove the heavy illustration style and treat the backs as flat printed designs.
- Use one shared border/frame system for both card types.
- Differentiate `resource` and `dev` mostly through palette and emblem.
- For `resource`, a centered question-mark cue is acceptable and likely desirable because the pile means "unknown hidden cards".
- For `dev`, use a more ceremonial center emblem derived from the dev-card seal / hammer direction explored earlier.

## Concept Set

Generate temporary SVG candidates only. Do not replace the live assets in this pass.

### Resource back concepts

1. `Question Hex`
- Blue-family card.
- Centered hex medallion.
- Chunky question mark.

2. `Question Window`
- Same family, but with a lighter framed center panel.
- Most conservative and readable.

3. `Question Bands`
- Same silhouette, stronger top/bottom banding.
- More graphic and abstract.

### Dev back concepts

1. `Seal`
- Amber/blue ceremonial seal.
- Clearest direct link to the dev-card action icon work.

2. `Forge`
- More hammer-forward emblem.
- Slightly more active/tool-centric.

3. `Banner`
- Same family, but with stronger card framing and a more heraldic center mark.

## Visual Contract

- Flat fills only for this concept pass.
- No glossy gradients, paper texture, bevels, or ornate pseudo-3D shadows.
- Use Catana-friendly colors:
  - blue / slate for resource,
  - amber / yellow / blue / slate for dev.
- Keep the emblem large and simple enough to read at `52 x 72`.
- Avoid full-card busy patterns such as dense hex lattices.

## Acceptance Criteria

- Resource and dev piles are distinguishable instantly in opponent stacks.
- The backs feel like a matched family.
- The designs are visibly flatter and cleaner than the current borrowed backs.
- At least one resource concept and one dev concept remain readable at actual `CardStack` size.
- Live `public/svgs/card_rescardback.svg` and `public/svgs/card_devcardback.svg` remain unchanged during this concept pass.
