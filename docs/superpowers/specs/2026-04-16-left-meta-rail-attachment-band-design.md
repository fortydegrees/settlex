# Left Meta Rail Attachment Band Design

## Goal

Add per-panel attachment modes for the desktop left meta rail so the side tab can reconnect into the panel at the `top`, `middle`, or `bottom` of the panel edge, while preserving the current bottom-anchored production baseline that already matches the board layout.

This is explicitly **not** another panel-anchor system. The panel rectangle, the button/tab rectangle, and the desktop wrapper baseline should stay where they are now. Only the panel-side reattachment band should move.

## Current Baseline

The current restored desktop rail is the correct geometric baseline:

- the desktop wrapper is fixed at the bottom-left of the board
- the chat panel bottom aligns with the nearby player avatar baseline
- the left tab remains full-height rather than shrinking
- the overall ribbon shell reads like the approved side-tab design

That baseline came from rolling back the earlier anchor-mode experiment. The new change must preserve this baseline instead of reintroducing row-local panel placement branches.

## Scope

Desktop only:

- keep `LeftMetaRail` as the production entry point
- keep `GameLogPanel` and `ChatPanel` unchanged as the content payloads
- keep mobile behavior unchanged
- keep both desktop panels open by default
- keep current bottom-left wrapper positioning and current row-spacing behavior

In scope:

- add attachment metadata per desktop panel
- update the shell path math so the tab can reconnect to the panel at different vertical bands
- preserve the current panel footprint and button footprint

Out of scope:

- changing panel heights
- changing desktop wrapper placement
- changing row-flow behavior
- rewriting `GameLogPanel` or `ChatPanel`
- reintroducing panel-position anchor modes that move the whole panel

## Recommended Approach

Use a fixed shell geometry model with a separate attachment band.

Each panel row should continue to use the existing restored panel rectangle:

- fixed `panelTop`
- fixed `panelBottom`
- fixed `lowerJoinY` at the bottom of the full-height tab shell
- fixed `buttonTop` / `buttonBottom`

The only variable should be the vertical band on the panel edge where the tab reconnects into the panel body.

This avoids the earlier failure mode where the same values controlled:

- panel placement
- shell height
- tab height
- connector position

Those concerns need to stay decoupled.

## Attachment Semantics

### `top`

Reconnect at the current header/body seam.

This is the existing `Game Log` behavior and should remain the default look. It visually reads like the tab enters just below the title bar.

### `middle`

Reconnect around the vertical center of the visible panel body.

This should be clamped away from the rounded corners and away from the header/footer seams so it remains visually clean. The panel itself does not move. Only the panel-side attachment band shifts downward from the top seam toward the middle.

### `bottom`

Reconnect at the footer/composer seam rather than at the literal bottom edge.

For chat, this means the tab should visually meet the panel just above the message box, matching the user’s mockup. The bottom of the panel still stays on the current board baseline; only the attachment point changes.

## Geometry Model

The desktop shell helper should produce two categories of values:

### Fixed shell geometry

- `panelTop`
- `panelBottom`
- `shellHeight`
- `buttonTop`
- `buttonBottom`

These should remain the same for all attachment modes in the current production pass.

### Attachment geometry

- `panelAttachTopY`
- `panelAttachBottomY`

These define the short vertical band on the panel edge where the tab reconnects into the panel.

The existing top case effectively uses the header/body seam as that band. The new `middle` and `bottom` modes should map to different panel-side bands without altering the shell’s outer footprint.

## Rendering Changes

`buildMetaPanels()` should carry per-panel attachment metadata:

- `log -> attachment: "top"`
- `chat -> attachment: "bottom"`

`DesktopSideTabRow` should pass that metadata into the layout helper.

`buildSideTabUnifiedShellPath()` should use the attachment band to determine where the left tab transitions into the panel edge. The left tab itself remains full-height and continues to use the same `72px` button block and the same rounded shell styling.

The panel content wrapper should continue using the same clipping and dimensions as the restored baseline.

## Row Spacing

`getSideTabRowHeight()` should continue using the current restored panel footprint math.

Because panel placement is fixed, the attachment mode must not affect row reservation. This is important to avoid reopening:

- the both-open overlap problem
- the shortened-tab regression
- the floating chat baseline regression

## Testing

Update `app/catana/__tests__/LeftMetaRail.test.js` to cover:

- the current bottom-left desktop wrapper baseline remains unchanged
- `getSideTabLayoutMetrics()` accepts `top|middle|bottom`
- `top|middle|bottom` change attachment outputs without changing the restored fixed panel footprint
- desktop defaults remain:
  - `Game Log -> top`
  - `Chat -> bottom`

Manual browser verification on `/catana/dev/sandbox` should confirm:

- both-open desktop still matches the restored bottom-anchored baseline
- chat-only still bottoms out on the same board baseline
- the chat tab now visually attaches just above the composer band
- the left tab remains full-height in all modes

## Risks

The main risk is accidentally coupling attachment geometry back to shell height or panel placement. If that happens, the same regressions will reappear:

- tab height shrinks
- panel baseline drifts upward
- row spacing starts compensating for geometry that should be purely visual

The implementation should stay disciplined: move only the panel-side attachment band, not the overall shell footprint.

## Recommendation

Implement attachment modes as a narrow shell-path feature on top of the restored baseline. Do not reintroduce full panel-anchor placement logic.
