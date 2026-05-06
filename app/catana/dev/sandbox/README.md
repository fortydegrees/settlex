# Catana Dev Sandbox

`/catana/dev/sandbox` is the default live-board surface for Catana UI, HUD, animation, and audio iteration.

Use it when the change needs the real board screen, player perspective, HUD anchors, or board-state-driven layout.

## Best For

- Local player HUD, opponent boxes, resource/dev-card rails, turn controls, dice, and left meta rail checks.
- Presentation effects that depend on board/HUD anchors, such as dev-card play, card transfer, robber motion, Longest Road, Largest Army, and city upgrades.
- Viewer-perspective checks. Use the viewer-seat control to compare local, opponent, and spectator-like presentation.
- Fast value/timing/CSS tuning where a focused manual pass is more useful than adding tests.

## Before Editing

- Read `docs/agent/UI_CONTEXT.md`.
- Read `docs/agent/skills/catana-brand/SKILL.md` before changing visual styling.
- Search `docs/agent/NOTES.md` for the surface or effect name. Many current HUD/effect details live there.
- Identify the exact preset, viewer seat, and viewport that proves the change.

## Verification Defaults

- Desktop: `1440x900`.
- Mobile portrait: `390x844` when the change touches responsive HUD/layout.
- For presentation-only tuning, a sandbox check plus `git diff --check` is usually enough unless shared logic or wiring changed.
- For effect/event wiring, add or run the focused source/Vitest tests for the payload, registry, helper, or component seam.

## Guardrails

- Do not use sandbox-only controls as proof of server-authoritative behavior.
- Do not mutate game state for replay buttons unless the feature explicitly needs that.
- Keep dev-only CustomEvent bridges scoped to sandbox usage.
- Respect privacy: opponent/spectator presentation should not reveal hidden resource or dev-card faces.
