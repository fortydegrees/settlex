# Storybook UI Catalog

Storybook is SettleHex's executable reference for standard product UI. It
renders real production components, CSS, copy, valid states, and motion without
requiring a live match or provider graph.

## Commands

- `pnpm storybook` — build `game-core`, then run Storybook on port 6006.
- `CI=1 pnpm build-storybook` — build the static catalog.

## Scope

Use Storybook for `app/ui` primitives, account/identity UI, homepage/lobby
chrome, alerts/recovery, postgame, and replay controls. Use the Catana sandbox,
effects lab, or real route for board, gameplay HUD, game-event effects, audio,
haptics, and provider/network behavior.

## Adding Standard UI

1. Read `docs/agent/UI_CONTEXT.md` and the Catana design skill.
2. Find the owning component or pattern in `docs/agent/UI_CATALOG.md`.
3. Inspect its primitive and composed stories.
4. Reuse or extend the shared production component.
5. Add a named story for a meaningful production state or copy branch.
6. Derive copy/state from production helpers; do not paste a second copy model.
7. Verify interaction, desktop/mobile layout, and reduced motion.

Stories must be deterministic, network-free, and production-valid. Controls
may vary safe presentation values but must not create impossible product state.
