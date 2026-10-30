# Game presentation

This feature owns gameplay presentation. `GameScreen.js` composes `board/`, `hud/`, `cards/`, `feed/`, `dialogs/`, `model/` and `effects/`; rules remain in `game-core/` and `lib/game-runtime/`.

For shared product-surface primitives, check `app/ui/*` and `docs/agent/skills/settlehex-design/ADDING_SHARED_PRIMITIVES.md` before adding a new common pattern.

## Before Editing

- Read `docs/agent/UI_CONTEXT.md`.
- Read `docs/agent/skills/settlehex-design/SKILL.md` before changing styling.
- Consult the UI catalog and relevant component stories for the visible surface; record new decisions in `docs/agent/PROJECT_RECORD.md`.
- Prefer small, caller-specific overrides when the request is a narrow visual tweak.

## Common Surfaces

Board drawing, geometry and placement previews live in [the board feature](board/README.md).
`GameScreen.js` remains the composition entry point.

- `PlayerActionContainer`, `TurnControlCluster`, `Die`: local player HUD, resources, dice, turn actions.
- `OpponentPlayerBox`, `PlayerAvatarStats`, `CardStack`: opponent HUD, stats, resource/dev-card stacks, player identity.
- `LeftMetaRail`, `GameLogPanel`, `ChatPanel`, `FeedPanel`: desktop/mobile log and chat surfaces.
- `DevCardDisplay`: local dev-card shell, purchase reveal destination, first-card shell entrance.
- `AnimatedCount`: shared count animation. Use local overrides for resource-dock-specific timing.

## Verification Defaults

- If a component is only restyled, verify in the surface that owns it, usually `/dev/sandbox`.
- If a component exposes shared behavior or helpers, run the focused component/helper tests.
- Check desktop `1440x900` first for HUD layout. Add `390x844` for mobile-sensitive surfaces.

## Guardrails

- Do not move authoritative game logic into components.
- Do not duplicate core state in UI-only state unless it is a deliberate presentation freeze or animation bridge.
- Keep player identity/color treatment consistent across local and opponent HUDs.
- Keep hidden opponent resources and dev cards hidden.

Game-log phase markers are neutral, non-selectable headings; player-turn markers
keep a dimmed player colour and appear only during normal play. Omit the marker
directly after a phase heading, since the first action names the player. Setup
uses only the placement-phase heading. Starting settlement entries derive adjacent
land hexes from the public board and logged node ID, including unnumbered deserts.
This is a display projection for live games and archives; persisted events and
replay seek keys stay unchanged. `Game Feeds/PlacementPhases` covers the phase
boundary and one-, two- and three-hex placements.
