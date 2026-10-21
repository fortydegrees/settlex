# Interaction Guards Design

## Goal
Prevent accidental text selection and right-click interactions in the main game UI while still allowing future log/chat/status components to opt in to selection and context menus.

## Approach
Apply a default interaction guard at the `GameScreen` root. The root container gains `select-none` so text and icons cannot be highlighted across the main board, action dock, and avatar/resource boxes. This can be overridden per-component later using `select-text` on the log/chat/status containers.

For context menus, add a single `onContextMenu` handler at the `GameScreen` root. The handler calls `preventDefault()` unless the right-click originated inside an element explicitly marked with `data-allow-interaction="true"`. This creates a clear, minimal opt-in mechanism for future interactive text areas without wiring per-component logic today.

## Opt-in Pattern (Future)
When the chat/log/status UI is added, wrap its container with:

- `data-allow-interaction="true"` to allow right-click
- `select-text` to re-enable text selection

This keeps the default UI locked down while giving future components a documented escape hatch.

## Notes
- The guard should live at the root UI container (`app/catana/GameScreen.js`) so it covers the whole game interface.
- A short inline comment near the handler will document the opt-in attribute for future agents.
- This is a UI-only change; no game logic or server behavior is affected.
