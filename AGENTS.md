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

## Guardrails
- Use pnpm; do not modify `package-lock.json`.
- New engine code should be TypeScript; UI can remain JavaScript for now.
- Engine logic must be deterministic; no `Math.random` or time-based logic.
- Game rules are server-authoritative; UI should be a thin client.
- Ask before adding dependencies or changing build tooling.
