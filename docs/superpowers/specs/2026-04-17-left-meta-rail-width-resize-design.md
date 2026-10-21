# Left Meta Rail Width Resize Design

## Goal

Make the desktop left meta rail resizable by the user so `Game Log` and `Chat` share one adjustable width, with the current max-width look preserved and a narrower default. Persist both the chosen width and the desktop open/closed panel state across reloads.

This pass is width-only. Per-panel height resizing is explicitly deferred, but the persisted preferences shape should leave room for it later.

## Current Baseline

The current production desktop rail uses:

- one shared fixed panel width (`448px`)
- a shared side-tab shell with a curved left connector
- centered desktop dock positioning
- desktop defaults of both panels open
- persisted behavior only in memory for the current render session

The new work must preserve:

- the existing tab/connector silhouette
- the current vertical row behavior
- the existing desktop/mobile split
- the current shared-width relationship between `Game Log` and `Chat`

## Scope

Desktop only:

- keep `LeftMetaRail` as the production entry point
- keep `GameLogPanel` and `ChatPanel` as the content payloads
- keep mobile unchanged
- keep one shared width across all desktop panels

In scope:

- persisted desktop left-rail preferences
- shared-width drag-resize from the panel's far right edge
- invisible resize hit area with `ew-resize` cursor
- width clamping
- persisted open/closed state for the desktop panels

Out of scope:

- per-panel height resize
- mobile resizing
- server-side persistence
- new visible resize glyphs or controls

## Recommended Approach

Treat width as a shared desktop dock preference owned by `DesktopMetaDock`.

The existing side-tab geometry already separates vertical layout from horizontal width. The cleanest change is to replace the fixed panel width constant with a live `panelWidth` preference, then thread that width through:

- the panel body width
- the SVG shell width/viewBox
- the shell path's right edge

The resize affordance should be an invisible edge hit area on each open panel. Users can drag the far right edge as they would a native window, but no new persistent handle should be visible when idle.

## Persistence Model

Persist one desktop preferences object in `localStorage` under a Catana-specific key, for example:

```json
{
  "openPanels": ["log", "chat"],
  "panelWidth": 350,
  "panelHeights": {}
}
```

Notes:

- `panelHeights` is reserved for a later height-resize pass and is not used yet.
- Invalid or corrupt storage should fail quietly and fall back to defaults.
- The storage model should normalize `openPanels` and clamp `panelWidth` before use.

## Width Semantics

Use a shared desktop width with sane bounds:

- default: `350px`
- min: `250px`
- max: current visual max (`448px`)

Implementation may still use pixels internally. That is fine here because:

- the current geometry is already pixel-based
- the component is desktop-only
- the visible experience is "resizable within safe bounds," not "user edits raw px values"

The maximum should still be clamped against the current viewport so the rail does not grow beyond what the desktop layout can comfortably support.

## Resize Interaction

Each open desktop panel should render an invisible right-edge resize zone:

- no visible bar or glyph
- hover cursor changes to `ew-resize`
- pointer down starts resize
- pointer move updates the shared width live
- pointer up / pointer cancel ends resize

Both panels should resize together because they share the same persisted `panelWidth`.

Closed rows do not need a resize zone, because there is no visible right edge to grab.

## Geometry Impact

This should remain a narrow horizontal change.

The existing side-tab shell should keep:

- the current button size
- the current left connector curve
- the current row spacing logic
- the current attachment behavior

Only the horizontal extent should become dynamic. The shell path should compute its right edge from the live width instead of a hardcoded `448px`.

## State Ownership

`DesktopMetaDock` should own:

- persisted `openPanels`
- persisted `panelWidth`
- transient resize interaction state

`GameLogPanel` and `ChatPanel` should remain unaware of the persistence model. They should continue rendering as content inside the rail shell.

## Testing

Add regression coverage for:

- width defaults and clamp behavior
- persisted desktop prefs read/write behavior
- desktop rail using a live width instead of a fixed width constant
- shared resize behavior shape in `LeftMetaRail`

Manual browser verification on `/catana/dev/sandbox` should confirm:

- default width is narrower than today's max-width look
- dragging narrower stops at the minimum
- dragging wider stops at the maximum
- reloading preserves width and open/closed state
- the connector curve still looks correct at narrow/default/wide widths

## Risks

Main risks:

- coupling resize state to the existing open/close animation state
- storing invalid widths or stale panel IDs in local storage
- letting the shell path and panel body read different widths

Avoid those by:

- keeping width as a separate shared dock preference
- normalizing storage reads before use
- deriving all desktop shell/body widths from the same `panelWidth` value

## Recommendation

Implement desktop shared-width resize now with persisted width and open/closed state. Reserve `panelHeights` in the stored preferences shape for a future per-panel height pass, but do not implement height dragging in this change.
