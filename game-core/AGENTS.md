# AGENTS.md — game-core

## Purpose
Deterministic, testable game engine shared by server and UI.

## Rules
- TypeScript only.
- No React/Next/DOM imports.
- No network or filesystem access.
- No global mutable state; prefer pure functions.
- No non-determinism: use injected RNG and explicit inputs.
- Tests required for rule changes.
  - Run targeted tests after changes.

## Commands (once the package exists)
- Build: `pnpm -C game-core build`
- Test: `pnpm -C game-core test`
- Typecheck: `pnpm -C game-core typecheck`
