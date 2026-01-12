# Dev Card Play - Testing Notes

## Why this exists
We skipped UI tests for the dev-card play UX in this pass. This captures the test plan for a later session.

## Suggested tooling (ask before adding deps)
- React Testing Library + user-event
- jest-dom matchers

## Candidate test coverage
- Dev card is clickable only for current player in preRoll/postRoll.
- Dev card is disabled during robber/discard stages and when a dev play is already in progress.
- Cannot play a dev card bought this turn.
- Only one dev card can be played per turn.

## Modal flows
- Year of Plenty modal:
  - Selects exactly two resources.
  - Enforces bank availability when bank is finite.
  - Confirm calls move with two resources.
  - Cancel clears devCardPlay.
- Monopoly modal:
  - Selects exactly one resource.
  - Confirm calls move with resource.
  - Cancel clears devCardPlay.

## Road building flow
- Clicking Road Building dev card enters road-building placement mode.
- Places one road if only one available in bank; otherwise two.
- Consumes the dev card after placement(s).

## Visual/interaction states
- Playable cards show hover/active styling.
- Active (in-progress) dev card displays active state.

