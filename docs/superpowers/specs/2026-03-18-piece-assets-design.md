# Piece Assets Design

Date: 2026-03-18
Scope: `settlement`, `road`, `city` concept-generation brief for Catana MVP asset replacement
Status: Approved for concept generation

## Goal

Replace the current Colonist-derived feeling of the core build pieces with a Catana-native family for:

- `settlement`
- `road`
- `city`

This phase is for design direction and concept-generation prompts only. It does not include final SVG production.

## Why This Exists

The current board/tile/resource system already has a clearer Catana identity than the build pieces. The three core build assets still read as imported beveled game pieces rather than something designed for the current board.

The goal is not to perfectly preserve the existing SVGs. The goal is to find a better visual family that:

- reads clearly on the board first,
- stays low-detail and traceable into production SVG,
- supports recolorable multi-plane shading,
- feels cohesive with Catana's flat-modern, bright, joyful board language.

## Approved Direction

### Visual contract

- Keep the existing angled tabletop perspective. These are not front-on flat glyphs.
- Prioritize silhouette clarity over interior detail.
- Keep detail low enough that the pieces survive board rendering and scaling.
- Avoid Colonist-style glossy bevel treatment and heavy black outlining.
- Keep the assets production-friendly for later SVG tracing and recoloring.

### Piece family

- `settlement` should be a single house-like piece with a clear peaked roof and strong silhouette.
- `city` should read as a direct upgrade of `settlement`, not a separate icon family.
- `road` should read as a chunky placed piece in the same perspective language as the buildings.
- All three pieces should share the same camera angle, plane logic, and visual weight.

### Edge and shading direction

- Baseline family: `hybrid soft-edge pieces`
- Edge treatment remains intentionally open for exploration:
  - soft tinted edge
  - hybrid edge
  - minimal edge
- Shading remains intentionally open for exploration:
  - flat planes
  - restrained gradients
  - hybrid planes-plus-gradient

## Hard Constraints For Concepts

- Same angled tabletop perspective across all three pieces.
- `city` must clearly read as an upgraded `settlement`.
- Low detail only; no tiny windows, brick seams, or ornamental trim.
- No photoreal texture, no material noise, no sticker-pack rendering.
- No harsh black cartoon outline.
- No glossy Colonist bevel/highlight language.
- Concepts are tracing references for SVG, not final paintovers.

## SVG Handoff Intent

Final SVG production should support:

- recolorable player-color family,
- multiple shading planes,
- clean separation of major forms for manual tracing/refinement,
- consistent geometry across `settlement`, `city`, and `road`.

The concept pass is allowed to use gradients if useful, but the resulting forms must still be translatable into controlled SVG planes.

## Concept Generation Plan

### Output shape

Generate concept sheets, each containing all three pieces together:

- `settlement`
- `road`
- `city`

This keeps family resemblance visible during review.

### Background

- Simple light neutral background
- No board context in pass 1
- No UI chrome
- No text labels required in the generated image

### Evaluation criteria

Judge each concept on:

1. silhouette clarity at a glance,
2. whether `city` clearly upgrades `settlement`,
3. whether `road` feels like a placed game piece,
4. whether the edge treatment feels consistent with Catana,
5. whether the shading style looks traceable into production SVG.

## Base Prompt Contract

```text
Use case: stylized-concept
Asset type: game UI icon concept sheet
Primary request: concept sheet showing three cohesive board-game building pieces: settlement, road, and city
Subject: settlement, road, and city from one visual family; city is a direct upgrade of settlement
Style/medium: clean stylized game asset concept art for later SVG tracing
Composition/framing: centered concept sheet with the three pieces shown separately on a simple neutral background, enough spacing around each piece, no board, no UI chrome
Lighting/mood: bright, clean, playful, modern-flat, cheerful, controlled shading
Color palette: single player-color family for the pieces, with readable light/mid/dark shade separation
Constraints: keep a slightly angled tabletop perspective; prioritize silhouette clarity; keep detail low; use broad simple shape language; settlement must read as a house-like piece; city must read as an upgraded settlement; road must feel like a chunky placed game piece; pieces must feel cohesive as one family; designed as tracing reference for SVG; no text; no watermark
Avoid: colonist.io bevel style; heavy gloss; photoreal textures; tiny windows; brick seams; ornamental detail; sticker-pack look; mascot style; black outlines; clutter; dramatic shadows
Quality: high
```

## Variant Matrix

Run a controlled `3 x 3` matrix by varying only:

- edge treatment
- shading mode

### Edge treatments

1. `soft tinted edge`
   - perimeter separation exists, but uses a darker related hue rather than a hard outline
2. `hybrid edge`
   - restrained perimeter edge plus clear plane separation
3. `minimal edge`
   - almost no perimeter outline; readability comes mostly from silhouette and plane contrast

### Shading modes

1. `flat planes`
   - broad shape-block shading only
2. `restrained gradients`
   - soft tile-like gradients inside major planes, no glossy bevel effect
3. `hybrid`
   - mostly flat planes with one restrained gradient treatment to soften the forms

### Recommended concept set

1. soft tinted edge + flat planes
2. soft tinted edge + restrained gradients
3. soft tinted edge + hybrid
4. hybrid edge + flat planes
5. hybrid edge + restrained gradients
6. hybrid edge + hybrid
7. minimal edge + flat planes
8. minimal edge + restrained gradients
9. minimal edge + hybrid

## Prompt Suffixes For The 9 Variants

Append one of the following to the base prompt:

1. `Edge treatment: soft tinted edge. Shading mode: flat planes only. Use broad simple shade blocks with no gradient rendering.`
2. `Edge treatment: soft tinted edge. Shading mode: restrained gradients. Use subtle tile-like gradient transitions within major planes, but avoid glossy bevel effects.`
3. `Edge treatment: soft tinted edge. Shading mode: hybrid. Use mostly flat planes with one restrained gradient treatment to soften the forms.`
4. `Edge treatment: hybrid edge. Shading mode: flat planes only. Use restrained perimeter separation plus broad simple shade blocks.`
5. `Edge treatment: hybrid edge. Shading mode: restrained gradients. Use restrained perimeter separation plus soft tile-like gradient transitions within major planes.`
6. `Edge treatment: hybrid edge. Shading mode: hybrid. Use restrained perimeter separation with mostly flat planes and one restrained gradient treatment.`
7. `Edge treatment: minimal edge. Shading mode: flat planes only. Readability should come from silhouette and plane contrast rather than perimeter outline.`
8. `Edge treatment: minimal edge. Shading mode: restrained gradients. Readability should come from silhouette and soft gradient plane changes rather than outline.`
9. `Edge treatment: minimal edge. Shading mode: hybrid. Readability should come from silhouette, plane contrast, and one restrained gradient treatment.`

## Practical Run Notes

- Use a single player-color family for the first pass; final SVGs remain recolorable.
- The first pass should optimize for board readability, not action-bar polish.
- Prefer the bundled image generation workflow for repeatable runs:
  - `~/.codex/skills/imagegen/scripts/image_gen.py`
- Live runs require a local `OPENAI_API_KEY`.

## Out Of Scope

This spec does not yet cover:

- longest road
- largest army
- robber
- trade icon
- end-turn icon
- development card art
- opponent card/resource holder assets

Those should inherit this piece-family language later where relevant, but they are not part of this design approval.

## Next Step

Use this spec to generate the first 9 concept sheets, review for the strongest silhouette family, then choose one or two finalists for SVG tracing and refinement.
