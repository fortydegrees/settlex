# Catana Components

This folder contains Catana-specific UI components. Treat it as gameplay UI, not generic product UI.

For shared product-surface primitives, check `app/ui/*` and `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md` before adding a new common pattern.

## Before Editing

- Read `docs/agent/UI_CONTEXT.md`.
- Read `docs/agent/skills/catana-brand/SKILL.md` before changing styling.
- Search `docs/agent/NOTES.md` for the component name or visible surface.
- Prefer small, caller-specific overrides when the request is a narrow visual tweak.

## Common Surfaces

- `PlayerActionContainer`, `TurnControlCluster`, `Die`: local player HUD, resources, dice, turn actions.
- `OpponentPlayerBox`, `PlayerAvatarStats`, `CardStack`: opponent HUD, stats, resource/dev-card stacks, player identity.
- `LeftMetaRail`, `GameLogPanel`, `ChatPanel`, `FeedPanel`: desktop/mobile log and chat surfaces.
- `DevCardDisplay`: local dev-card shell, purchase reveal destination, first-card shell entrance.
- `AnimatedCount`: shared count animation. Use local overrides for resource-dock-specific timing.

## Verification Defaults

- If a component is only restyled, verify in the surface that owns it, usually `/catana/dev/sandbox`.
- If a component exposes shared behavior or helpers, run the focused component/helper tests.
- Check desktop `1440x900` first for HUD layout. Add `390x844` for mobile-sensitive surfaces.

## Guardrails

- Do not move authoritative game logic into components.
- Do not duplicate core state in UI-only state unless it is a deliberate presentation freeze or animation bridge.
- Keep player identity/color treatment consistent across local and opponent HUDs.
- Keep hidden opponent resources and dev cards hidden.
