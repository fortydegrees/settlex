<EXTREMELY_IMPORTANT>
This repo uses Superpowers.

At the start of the session, ensure native skill discovery is configured:
`~/.agents/skills/superpowers -> ~/.codex/superpowers/skills`

If you see “missing skills” (e.g. "using-superpowers" not found), verify the symlink and restart Codex.
</EXTREMELY_IMPORTANT>

# AGENTS.md — Settlex

## Goal
Ship small, correct changes with a stable, testable game engine.

## Workflow
- Clarify scope + acceptance criteria before coding.
- Prefer test-first for game rules and state transitions.
- Keep diffs small and focused; avoid unrelated refactors.
- Update `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` after meaningful changes.
- If instructions are ambiguous, ask up to 3 targeted questions or state assumptions.
- Avoid scope creep; implement only what was requested.
- If you notice repeated mistakes, propose a short edit to `AGENTS.md`.

## Updates
- Provide brief updates only when starting a new phase or when the plan changes.
- Each update should include a concrete outcome (e.g., “Added X”, “Found Y”).

## Commands (pnpm)
- Install: `pnpm i`
- Dev UI: `pnpm dev`
- Dev UI (log to file): `pnpm dev:log`
- Game server: `pnpm serve`
- Lint: `pnpm lint`
- Verify: `pnpm verify`
- Engine build: `pnpm -C game-core build`
- Engine tests: `pnpm -C game-core test`

## Project map
- UI: `app/`
- Game server: `server/`
- Engine (shared): `game-core/`
- Legacy/experimental: `spec/`, `strategy/`, `utils/`
- Agent docs: `docs/agent/`
- Catana dev sandbox: `app/catana/dev/sandbox/` — dev-only local board sandbox for real board UI, animation, and audio iteration without the live server
- Catana effects lab: `app/catana/dev/effects/` — dev-only isolated effect/audio replay and tuning surface
- **Design system**: `docs/agent/skills/catana-brand/SKILL.md` — Read this before building any UI. If adding shared product-surface primitives, also read `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md`

## Effects + audio (GSAP + cue bus)
- Entry point: `app/catana/effects/GameEffects.js` (EffectBus + AudioManager + cue emit)
- Effect registry: `app/catana/effects/registry.js` (bus event routing)
- Resource distribution runner: `app/catana/effects/resourceDistribution.js` (GSAP timeline + cue labels)
- Sound mapping: `app/catana/effects/soundThemes.js` (cue -> `/sounds/*.mp3`)
- Audio playback: `app/catana/effects/AudioManager.js` (Howler + hidden-tab policy)
- Assets: `public/sounds/` (served under `/sounds/*`)
- Dev board sandbox: `/catana/dev/sandbox` (real game screen locally for board UI, animation, and audio testing)
- Dev lab: `/catana/dev/effects` (deterministic isolated effect replays)

## Guardrails
- Use pnpm; do not modify `package-lock.json`.
- New engine code should be TypeScript; UI can remain JavaScript for now.
- Engine logic must be deterministic; no `Math.random` or time-based logic.
- Game rules are server-authoritative; UI should be a thin client.
- Ask before adding dependencies or changing build tooling.
- Before building UI components, read `docs/agent/skills/catana-brand/SKILL.md` and follow its design patterns. If the work adds a reusable standard UI primitive, also follow `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md`.
