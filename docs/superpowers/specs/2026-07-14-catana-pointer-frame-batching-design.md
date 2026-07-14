# Catana Pointer Frame Batching Design

## Goal

Remove duplicate pointer-driven work that cannot be displayed between browser frames, without changing placement-preview motion, magnetic snapping, development-card magnification, or interaction timing.

## Scope

This slice contains two narrowly scoped batching changes:

1. Coalesce build and robber placement-preview pointer synchronization so magnetic-target geometry is measured at most once per animation frame.
2. Coalesce development-card dock pointer updates so the dock rectangle is measured and React pointer state is updated at most once per animation frame.

The existing placement spring loops remain unchanged. This slice does not add idle sleep/wake behaviour or permanently cache board target rectangles.

## Design

### Placement previews

`BuildPlacementPreview` and `RobberPlacementPreview` will keep the latest pointer coordinates in their existing refs. Their global `pointermove` handlers will request a synchronization frame only when one is not already pending. That frame will call the existing desired-position synchronization once using the latest pointer coordinates.

If several pointer events arrive before the browser paints, the pending frame absorbs them. Magnetic-target selection still uses live `getBoundingClientRect()` values during every executed synchronization, so board pan, zoom, and responsive movement cannot leave a stale geometry cache behind.

Prop-driven synchronization remains immediate because it is not raw high-frequency pointer input. Reduced-motion build placement will apply its existing direct visual update from the scheduled synchronization callback, preserving the current coarse-pointer and reduced-motion behaviour.

Each preview will cancel its pending pointer-synchronization frame on effect cleanup. Its existing spring animation frame is separate and remains untouched.

### Development-card dock

`DevCardDisplay` will store the latest mouse `clientX` in a ref. `mousemove` will schedule at most one frame. The frame will read the current dock rectangle and update `pointerX` from the latest coordinate.

Mouse leave will cancel any pending frame, clear the stored coordinate, and preserve the existing pointer/focus reset. Component unmount will also cancel a pending frame. The card layout, motion calculation, keyboard focus, tooltip timing, and card-play behaviour remain unchanged.

## Testing

Add focused regression coverage that requires:

- both placement previews to hold a separate pending pointer-sync frame,
- raw pointer handlers to schedule synchronization rather than call geometry synchronization directly,
- cleanup to cancel the pending synchronization frame,
- the dev-card dock to schedule a single pointer update frame and cancel it on leave and unmount.

Run the existing build-preview, robber-preview, dev-card layout, and render-performance tests alongside the new guard. Manually verify build placement, robber placement, and development-card magnification in `/catana/dev/sandbox` when the required scenario is available.

## Acceptance Criteria

- Multiple pointer events before a paint produce one placement-target measurement pass per preview.
- Multiple development-card mouse events before a paint produce one dock measurement and at most one React pointer-state update.
- The latest pointer position always wins.
- Pending batching frames are cancelled on leave or cleanup.
- Placement motion, magnetic snapping, road rotation, robber lean, card magnification, focus handling, and animation timing are visually unchanged.
- No target-rectangle cache, spring-loop rewrite, shared scheduling abstraction, dependency, or broad component refactor is introduced.
