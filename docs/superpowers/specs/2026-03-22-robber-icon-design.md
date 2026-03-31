# Robber Icon Design

Date: 2026-03-22
Scope: `public/svgs/icon_robber.svg`
Status: Approved for implementation

## Goal

Replace the current detailed robber icon with a simplified Catana-native robber piece that reads clearly on the board and matches the current `road` / `settlement` / `city` asset family.

## Context

- The current `icon_robber.svg` reads like character art and is too detailed for the current Catana direction.
- Runtime usage is in `app/catana/Tile.js`, where the robber sits over the tile at approximately `size / 1.5`.
- The new robber should feel like a board piece or obstruction marker, not a person illustration.
- User guidance for this redesign:
  - keep it faceless,
  - avoid ninja cues,
  - use `icon_robber copy.svg` only as loose inspiration, not as geometry to preserve.

## Approved Direction

- Use a `pawn stack` silhouette:
  - small rounded head,
  - larger rounded middle body,
  - stable lower base.
- Treat the robber as a neutral gray tabletop piece.
- Keep the silhouette chunky and immediately readable.
- Match the same family as:
  - `public/svgs/road_red.svg`
  - `public/svgs/settlement_red.svg`
  - `public/svgs/city_red.svg`

## Visual Contract

- No face, no hands, no sack, no hood details, no character accessories.
- No pedestal/plinth beyond what is needed for the lower piece silhouette.
- Use only `2-3` broad planes.
- Use a darker gray edge and internal plane contrast, but avoid pure black outlines.
- Keep corners rounded and the overall silhouette soft but stable.
- Preserve a piece-first read: it should look like a placed blocker piece on the board, not a UI badge.
- Avoid detailed bevel language or glossy Colonist-style rendering.
- Follow the existing Catana piece-lighting language rather than the flat emoji tile-icon language.

## Color and Rendering

- Primary family should stay in neutral grays that sit comfortably on the Catana board.
- Suggested tonal structure:
  - light gray main fill,
  - medium gray shadow plane,
  - dark warm-gray outline.
- Use restrained directional gradients to imply the same broad lighting model used by the current `road` / `settlement` / `city` pieces.
- Keep gradients broad and structural:
  - one light-to-mid gradient across the major body forms is acceptable,
  - one darker shadow plane or edge separation is acceptable.
- Do not add sharp white specular streaks, chrome-like highlights, or deep glossy bevel effects.
- Rendering should stay simple enough that the robber remains readable both at normal board size and when shown as the ghost hover preview.

## Acceptance Criteria

- Reads instantly as a blocking piece at board scale.
- Feels consistent with the current simplified Catana build-piece family.
- Is clearly less detailed and less character-like than the current robber art.
- Works as a neutral gray piece without requiring extra facial or costume detail.
