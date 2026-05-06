# Catana UI Context

Use this file before Catana UI, HUD, animation, audio, copy, or visual-tuning work. It is a routing layer, not a second design system.

## Entry Points

- `docs/agent/skills/catana-brand/SKILL.md`: brand, component, color, typography, and motion rules. Read this before building or restyling Catana UI.
- `app/catana/dev/sandbox/README.md`: real board UI sandbox. Use for gameplay HUD, board, opponent box, turn controls, dev-card, award, robber, and card-transfer presentation.
- `app/catana/dev/effects/README.md`: isolated effects lab. Use for tuning deterministic animation/audio runners without needing a live game state.
- `app/catana/components/README.md`: component and HUD context. Use before editing shared Catana components.
- `app/catana/dev/sidebar-connection/`: scratch surface for left meta rail and dock/panel connector geometry.
- `app/catana/dev/ui/`: standard UI showcase for shared product-surface primitives.
- `docs/agent/TESTING_NOTES.md`: verification matrix and future test backlog.
- `docs/agent/NOTES.md`: detailed accumulated decisions. Search it for the specific surface before changing a repeated UI pattern.

## Agent Reminders

- Preserve existing visual language before introducing a new treatment. For Catana, prefer the current glass/HUD language, player-color identity, and existing motion families.
- Check the relevant dev surface for the exact UI state being changed. Do not generalize from one viewport, one player perspective, or one preset.
- For presentation-only UI, animation, audio, copy, timing, or CSS tuning, prefer focused manual/dev-surface verification. Add tests only when changing shared logic, reusable helpers, event wiring, state flow, or locking a regression.
- For game rules, state transitions, sync/race fixes, and server-authoritative behavior, use test-first or focused regression tests.
- For local/opponent/spectator presentation, identify the viewer perspective explicitly before changing anchors, frozen counts, privacy, or effect timing.
- When a user asks for a small visual tweak, keep the diff small. Prefer caller-specific overrides and local constants over broad component rewrites.

## UI Work Triage

Use `app/catana/dev/sandbox` when the change depends on real board layout, viewer seat, player HUD, opponent HUD, live effect anchors, or board state.

Use `app/catana/dev/effects` when the change is an isolated effect runner, cue timing, audio mapping, or deterministic replay.

Use `app/catana/dev/sidebar-connection` when the change is about the left meta rail shell, side-tab/ribbon geometry, row spacing, or panel connector shape.

Use `app/catana/dev/ui` when the change is a shared product primitive from `app/ui/*`, not bespoke board chrome.

Use focused source tests or Vitest when the change modifies helpers, selectors, event payloads, state gating, or a regression that should stay locked in.

## Canonical Viewports

- Desktop board tuning: start with `1440x900`.
- Mobile portrait sanity check: start with `390x844`.
- Only add wider/narrower viewports when the touched surface has a known breakpoint or collision risk.

## Updating This Context

When a UI session reveals a repeated correction, add it to the closest surface README or to `docs/agent/NOTES.md`. Keep this file as the index; do not turn it into the full history.
