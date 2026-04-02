# Player Piece Contrast Palette Design

Date: 2026-04-02
Scope: Catana player piece palette direction for higher board contrast and a larger candidate colour set
Status: Drafted from approved design discussion

## Goal

Define a board-first player piece palette that:

- expands beyond the original lobby picker colours,
- keeps candidate count high so weak colours can be pruned later,
- improves contrast between pieces at gameplay scale,
- supports special candidate colours like `black`, `white`, `silver`, and `gold`,
- does not stay constrained by the original lobby colour IDs.

This spec is about palette direction only. It does not yet commit the repo to a final subset or final SVG asset generation pass.

## Context

- The existing Catana player piece migration now supports local colourized SVG families under `public/svgs/pieces/`.
- Earlier colour work followed the original lobby picker IDs too closely.
- That is no longer the priority.
- Board readability matters more than matching earlier arbitrary UI swatches.
- The user is open to changing the lobby colour IDs entirely.
- The user prefers generating a larger candidate set first and pruning visually afterwards rather than prematurely limiting the palette.

## Source Palette Strategy

Use the previously supplied 16 RGB values as the seed palette from another game, then adapt them into softer Catana-friendly values rather than using the raw RGBs directly.

Add four additional candidates into the same pool:

- `black`
- `white`
- `silver`
- `gold`

This yields a 20-colour candidate palette.

## Design Direction

### Core rule

Optimize for board separation first, not picker-brand fidelity.

### Consequences

- A future lobby picker can be updated to match the piece palette rather than the other way around.
- Similar neighbouring hues are acceptable in the candidate pool, but they should be marked as collision-prone up front.
- The first implementation pass should support generating all candidates, even if some are later removed.

### Palette styling

- Base hues should be softened from the raw RGB seed colours.
- Saturation should stay strong enough for ownership recognition, but not so loud that pieces feel neon.
- Lightness should be normalized toward the existing Catana piece family so gradients and shading stay legible.
- `black` should render as charcoal, not pure flat black.
- `white` should render as warm stone/ivory, not pure white.
- `silver` and `gold` should receive slightly more metallic shading than the normal colours, but without introducing a separate texture system.

## Candidate Palette

### Safest 6

These are the strongest first-pass colours for immediate in-game separation:

- `red` `#d52a2a`
- `sky` `#4b92db`
- `green` `#1d911d`
- `teal` `#1d9191`
- `orange` `#d68c2f`
- `magenta` `#db47d3`

### Strong 12

These should still read cleanly on the board in most cases:

- `red` `#d52a2a`
- `sky` `#4b92db`
- `green` `#1d911d`
- `teal` `#1d9191`
- `orange` `#d68c2f`
- `magenta` `#db47d3`
- `royal` `#2f46d6`
- `olive` `#b2ab3e`
- `black` `#1d1d25`
- `white` `#edebe3`
- `silver` `#aaaeb6`
- `gold` `#ba973b`

### Extended 20

These remain valid candidates, but should be treated as more collision-prone until reviewed in-game:

- `red` `#d52a2a`
- `sky` `#4b92db`
- `green` `#1d911d`
- `teal` `#1d9191`
- `orange` `#d68c2f`
- `magenta` `#db47d3`
- `purple` `#911d91`
- `maroon` `#911d1d`
- `olive` `#b2ab3e`
- `brown` `#9a632f`
- `royal` `#2f46d6`
- `violet` `#5d529f`
- `lime` `#87a728`
- `coral` `#df5d5f`
- `lavender` `#ac7cc1`
- `tan` `#b99e77`
- `black` `#1d1d25`
- `white` `#edebe3`
- `silver` `#aaaeb6`
- `gold` `#ba973b`

## Known Collision Groups

These are the likely trouble spots and should be reviewed closely once SVGs exist:

- `red`, `maroon`, `coral`
- `sky`, `royal`, `violet`, `lavender`
- `green`, `lime`, `olive`, `gold`
- `orange`, `brown`, `tan`
- `magenta`, `purple`
- `white`, `silver`

These collisions are acceptable in the candidate pool, but they should not be ignored during the visual review pass.

## Metallic Handling

### Silver

- keep the same Catana geometry and shading structure,
- bias highlights cooler and brighter than the normal palette,
- deepen shell/stroke tones slightly to prevent it collapsing into `white`.

### Gold

- keep the same Catana geometry and shading structure,
- use warmer highlights and slightly richer dark planes than `olive` or `orange`,
- aim for “painted metallic” rather than chrome realism.

## Implementation Guidance

When this moves to implementation:

- do not bind the generated piece colours to the current lobby IDs,
- introduce a new player-piece palette source of truth,
- generate all candidate SVGs first,
- review them on the live board,
- then prune weak colours from both assets and picker metadata.

The first pass should optimize for speed of exploration:

- wide candidate pool,
- consistent Catana shading,
- easy later removal of near-duplicates.

## Acceptance Criteria For The Palette Pass

- There is a documented 20-colour candidate palette with softened board-friendly values.
- The palette is explicitly grouped into stronger and weaker candidate tiers.
- `black`, `white`, `silver`, and `gold` are handled intentionally rather than treated like generic flat colours.
- Collision-prone groups are documented up front.
- Future implementation is free to prune candidates after real in-game comparison.

## Next Step

If the user approves this written spec, write an implementation plan for:

- replacing the current eight-colour piece family with the new candidate palette system,
- generating the expanded SVG families,
- wiring the lobby/picker metadata to the new palette IDs,
- and adding visual verification guidance for pruning near-duplicates.
