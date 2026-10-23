# Adding or extending shared UI primitives

Use for reusable product controls in `app/ui/*`, such as buttons, selectors,
fields, popovers and dialogs. Bespoke board actions and game-event effects keep
their gameplay owners.

## Start with the current system

1. Read `docs/agent/DESIGN_SYSTEM.md` and `docs/agent/UI_CONTEXT.md`.
2. Find the owner and states in `docs/agent/UI_CATALOG.md`; inspect the production
   component, shared CSS recipe and its component/composed Storybook stories.
3. Reuse or extend that owner. The catalog includes `SegmentedControl`, `Dialog`,
   `Button`, `IconButton`, `Popover`, `Tooltip` and other existing controls; check
   the actual inventory rather than assuming an absent example means absent code.
4. For a genuinely new interaction pattern, review two or three targeted external
   references. For overlays, also consult the relevant Base UI behavior docs.
   Adapt the behavior to SettleHex; do not import a second visual system.

The April 2026 standard-UI spec and old brand-guide recipes are historical.
The current foundation contract and later user decisions take precedence.

## Decide the interaction as well as the appearance

Choose semantic role and emphasis first. Identify the relevant hover, press,
focus, selection, disabled, pending/result and open/close behavior. Decide which
transitions help and which should be immediate. Preserve keyboard access, focus
return, repeat-input responsiveness and reduced-motion support.

Prefer semantic variants and complete foundation roles over local overrides.
Keep reusable feedback in the shared owner; keep product state and callbacks in
the caller. Inspect consumers before changing shared behavior. A game-specific
forced selection must not inherit cancellable-dialog behavior accidentally.

## Verify in the appropriate place

- Add a named production Storybook state for a meaningful new state/copy branch;
  do not create a parallel mockup implementation.
- Verify interaction and transitions on desktop/phone and with reduced motion.
  Use the real route or sandbox where game state, providers or board geometry
  matter. `/dev/ui` remains a secondary showcase, not a replacement for
  Storybook or an obligation to duplicate every story.
- Follow `docs/agent/TESTING.md`: behavioral tests for shared logic, event wiring,
  state flow and regressions; focused rendered checks for presentation-only work.
  Do not add source-grep/class-string tests for appearance.
- Record reference choices, observed states and remaining limits. Update the
  catalog and relevant guidance when an approved shared pattern changes.
