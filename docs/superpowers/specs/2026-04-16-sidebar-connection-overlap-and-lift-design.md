# Sidebar Connection Overlap And Lift Design

Date: 2026-04-16
Scope: `/catana/dev/sidebar-connection` side-tab ribbon spacing and vertical lift refinement
Status: Approved for implementation planning

## Goal

Finish the current side-tab ribbon study with one narrow geometry pass so that:

- both-open state no longer shows the lower panel creeping into the upper panel,
- the open panel/title bar reads slightly higher than the fixed dock button,
- the dock button remains pinned in the closed-stack position through the transition.

This is a dev-route refinement only. It does not change production `LeftMetaRail` behavior yet.

## Issue Summary

The current `New Variant` in `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` has two related but distinct concerns:

1. Visual lift
   The open shell is already raised relative to the button, but not quite enough for the title bar to clearly read above the selected side-tab button.

2. Structural overlap
   When both `Game Log` and `Chat` are open, the lower row begins too early and slightly overlaps the upper panel. The likely cause is that the row-height reservation is coupled to a negative `SIDE_TAB_PANEL_TOP`, so the layout under-reserves the open row footprint.

These should be treated separately. Raising the shell visually should not reduce the amount of vertical space reserved for the row.

## Non-goals

- No production sidebar integration in this slice.
- No redesign of the side-tab silhouette, panel width, button size, or icon treatment.
- No change to the fixed-button behavior that removed the earlier bounce.
- No new motion system; keep GSAP.
- No changes to log/chat content styling beyond what is needed to verify spacing.

## Approved Direction

Keep the current side-tab ribbon model and make one small geometry correction pass:

- keep the button fixed at the dock-stack position,
- lift the open shell slightly more so the header reads clearly above the button,
- decouple row-spacing math from the visual lift,
- preserve extra top breathing room for the first open panel.

The intended mental model is:

- visual position: controlled by shell/panel lift constants,
- layout reservation: controlled by explicit occupied-height math.

That keeps the visual connection flexible without reintroducing panel overlap when two rows are open.

## Geometry Model

### Shell lift

`SIDE_TAB_PANEL_TOP` should become slightly more negative than the current value so the open title/header area sits a bit higher relative to the selected button.

This should be a modest increase, not a full extra header-height jump. The target is perceptual clarity, not dramatic separation.

### Row reservation

`getSideTabRowHeight()` should reserve the full visible vertical footprint of an open row before the next row begins.

It should not subtract space just because the panel is lifted upward with a negative top offset. In practice, the open-row height should be derived from the panel's occupied footprint plus the inter-panel gap, rather than from `SIDE_TAB_PANEL_TOP + panel.height`.

### Top-stage breathing room

If the shell is raised further, the stage wrapper padding for the side-tab study should be rechecked so the first row does not clip against the top of the study frame.

## File-Level Direction

Primary file:

- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js`

Expected implementation shape:

- adjust the side-tab lift constant or split it into clearer header/lift terms,
- update `getSideTabRowHeight()` so both-open spacing is based on full occupied height,
- keep the fixed button `top` unchanged,
- retune side-tab study top padding only if the higher shell would otherwise clip.

## Verification

Manual verification at `http://127.0.0.1:3000/catana/dev/sidebar-connection` should cover:

- `Game Log` open only:
  - header reads clearly above the selected button,
  - top of the shell is not clipped.
- `Chat` open only:
  - same button position as closed state,
  - header lift still reads intentional rather than detached.
- both open:
  - no visible overlap between upper and lower panels,
  - dock buttons remain in the fixed stack positions,
  - vertical gap between panels looks deliberate rather than stretched.

Code-level verification should include the existing source/structure guard for the study plus targeted checks if needed for revised spacing constants.

## Risks

- Increasing lift without increasing top-stage breathing room can reintroduce top clipping.
- Fixing overlap by inflating row height too aggressively can make the both-open state feel loose and disconnected.
- Tying row spacing to animated values instead of stable geometry constants would risk bringing back transition jitter.

## Recommendation

Implement this as a small constant-and-layout pass only. Do not broaden the change into a new visual exploration unless the overlap fix reveals a deeper ownership problem.
