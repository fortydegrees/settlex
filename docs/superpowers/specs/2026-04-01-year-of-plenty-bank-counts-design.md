# Year of Plenty Bank Counts Design

> Historical record: references below to private internal documents identify archived originals. They are not instructions to recreate or edit removed files. Use the maintained contributor guides and public verification/provenance record for current guidance.

## Goal

Hide explicit bank resource counts in the Year of Plenty picker by default while keeping the existing availability enforcement intact.

## Scope

- Remove the visible numeric bank badges from the Year of Plenty resource picker by default.
- Keep all current selection limits based on finite-bank availability.
- Add a match-scoped flag that can later be surfaced as a lobby game setting.

## Decision

Store the control as a top-level game setting on `G`:

- `G.gameSettings.showYearOfPlentyBankCounts`

This defaults to `false`.

## Why this shape

- It keeps presentation policy out of `game-core` ruleset data.
- It is already match-scoped, which matches the likely future lobby setting.
- It avoids schema churn inside saved `core.ruleset` snapshots.

## Behavior

- Default behavior: counts are hidden.
- When `showYearOfPlentyBankCounts === true`: current count badges render again.
- Zero-availability resources remain disabled and greyed out.
- Finite-bank limits still prevent selecting more copies than remain in the bank.

## Files

- `lib/game-runtime/Game.js`
- `app/catana/components/TradeDiscardModal.js`
- `app/catana/__tests__/Game.boardConfig.test.js`
- `app/catana/__tests__/TradeDiscardModal.test.js`
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`
