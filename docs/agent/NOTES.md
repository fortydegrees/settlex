# NOTES

- Use `pnpm dev:log` to capture dev-server output at `.logs/dev.log` for debugging without manual copy/paste.
- boardgame.io RNG is passed as `random` in setup/moves; use `random.Number()` for deterministic floats.
- ESLint is now configured via `.eslintrc.json` with `react/jsx-key`; `pnpm lint` may emit existing warnings (hooks/img).
