# Left Meta Rail Anchor Modes Design

Date: 2026-04-16
Scope: Desktop `LeftMetaRail` side-tab ribbon anchor behavior
Status: Approved for implementation planning

## Goal

Keep the production desktop side-tab ribbon look, but let each desktop row choose how its panel is anchored against the button so the stack can sit bottom-left without panels running off-screen.

For this slice:

- desktop rows support `top`, `middle`, and `bottom` anchor modes,
- `Game Log` defaults to `middle`,
- `Chat` defaults to `bottom`,
- row spacing uses the real occupied footprint of adjacent open panels,
- mobile behavior stays unchanged.

## Problem

The desktop rail is now anchored from the bottom-left as a group, but each row still uses the original top-anchored shell geometry. That means the last row still claims vertical space below its button when open, which is why the `Chat` panel can extend off the bottom of the screen.

This also makes the button-to-panel join feel wrong for lower rows because the shell always behaves like the button is attached near the panel header.

## Alternatives Considered

### 1. Patch bottom overflow only

Clamp the desktop wrapper or special-case the last row so `Chat` cannot extend below the viewport.

This is the smallest code change, but it leaves the underlying geometry inconsistent and does not help with future rows.

### 2. Add explicit per-row anchor modes

Treat anchor position as part of row geometry. Each panel chooses `top`, `middle`, or `bottom`, and both shell layout and row spacing are derived from that choice.

This solves the current overflow, matches the user’s requested mental model, and gives the rail a clear rule for future rows. This is the recommended approach.

### 3. Add viewport-aware dynamic positioning

Measure available viewport space and auto-flip or auto-shift rows at runtime.

This is more complex than needed for the current two-panel desktop rail and would be harder to test cleanly.

## Approved Direction

Implement explicit anchor modes inside `LeftMetaRail` desktop rows.

The implementation should introduce a small anchor-aware layout model that answers, for each row:

- where the panel top sits relative to the fixed button,
- where the shell joins the button,
- how far the open panel extends below the button,
- how much vertical spacing the current row must reserve before the next row starts.

The desktop defaults should be:

- `Game Log`: `middle`
- `Chat`: `bottom`

`top` should still remain available as a supported mode so a future third row can attach near its header without redesigning the geometry again.

## Geometry Rules

The button stays fixed at the row origin.

Anchor modes describe how the panel sits relative to that button:

- `top`: panel is lifted slightly above the button and extends mostly downward from it.
- `middle`: panel is centered around the button so the button visually joins the middle portion of the shell.
- `bottom`: panel bottom aligns back to the button baseline, but the lower connector seam lifts independently above the composer band so the join still reads higher than the panel edge.

All anchor modes should preserve the same rounded-elbow connector language used by the original lifted `top` shell:

- the upper join must stay slightly inset from the button top so the top connector rounds back into the panel instead of collapsing into a hard corner,
- the lower join remains rounded as it returns to the button baseline,
- the `bottom` anchor should not lift the whole panel body away from its baseline target; instead, it should keep the panel low and lift only the lower connector seam above the message/composer band.

In practice, `middle` and `bottom` should feel like shifted versions of the same shell, not like separate geometric families.

The desktop row spacing rule becomes:

- when the current row and next row are both open, reserve space based on the current row’s downward footprint, the configured inter-panel gap, and the next row’s upward footprint.
- otherwise reserve the standard button-stack height unless the current row’s open footprint extends farther downward than the closed button stack.

This keeps spacing tied to real occupied geometry instead of a single hard-coded open height assumption.

## File-Level Direction

Primary files:

- `app/catana/components/LeftMetaRail.js`
- `app/catana/__tests__/LeftMetaRail.test.js`

Supporting docs:

- `docs/agent/NOTES.md`
- `docs/agent/PROGRESS.md`

Expected implementation shape:

- add pure layout helpers for anchor-aware desktop geometry,
- store the default anchor mode on each desktop panel definition,
- feed those layout metrics into the existing shell SVG, panel positioning, and row-height logic,
- include explicit upper-join and lower-join metrics so `middle` and `bottom` preserve the same rounded connector feel as `top` while allowing `bottom` to keep the panel body aligned to the old baseline,
- expose a small render-level data attribute so tests can assert the chosen anchor modes without parsing CSS transforms.

## Verification

Automated verification should cover:

- default desktop markup includes anchor mode metadata for `log` and `chat`,
- helper logic supports `top`, `middle`, and `bottom`,
- default desktop rows still render both panels open by default,
- mobile rail remains present.

Manual verification should cover the real board screen:

- `Chat` no longer runs off the bottom edge,
- `Chat` bottom aligns with the older desktop baseline near the nearby avatar/HUD box,
- `Game Log` sits above it with a visually centered button join,
- `middle` and `bottom` anchors keep a smooth upper connector rather than a hard corner,
- `bottom` keeps the connector seam lifted above the message/composer band without lifting the entire chat panel too high,
- both-open and single-open states still feel like one consistent ribbon system.
