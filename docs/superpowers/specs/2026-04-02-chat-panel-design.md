# In-Match Chat Panel Design

Date: 2026-04-02
Scope: Catana in-match chat panel layout and first-pass UI shell
Status: Approved for implementation

## Goal

Add a left-side in-match chat panel that matches the existing game log styling and player highlighting, without yet wiring chat sending or transport behavior.

## Context

- The current in-match meta feed is `app/catana/components/GameLogPanel.js`.
- It is mounted directly from `app/catana/GameScreen.js` as a fixed bottom-left panel.
- The in-game dev tools box in `app/catana/components/DebugPanel.js` uses the same glass-meta styling, but it is a separate one-off component and not a shared panel primitive.
- There is no existing Catana chat state or chat UI in the app today.

## Approved Direction

- Keep the game log on the left side.
- Add chat as a second panel stacked below the game log.
- Keep both panels the same width as the current log panel.
- Use equal heights for the first pass.
- Match the game log's glass styling, header treatment, hover-scroll behavior, fade mask, and entry animation.
- Render sender names in chat using the same player-name color/highlight treatment as the game log.
- Include a presentational composer area so the panel reads as chat immediately, but do not wire sending yet.

## Architecture

- Extract a shared feed-style panel shell instead of duplicating `GameLogPanel` markup.
- The shared shell should own:
  - panel chrome,
  - header row,
  - scroll container,
  - hover-aware auto-scroll behavior,
  - feed-entry animation hooks.
- `GameLogPanel` should keep using Catana game-log formatting and render through the shared shell.
- Add a new `ChatPanel` component that renders through the same shell with chat-specific row formatting.
- `GameScreen` should mount a single fixed left-column stack that contains:
  - game log on top,
  - chat below.

## Layout

- Keep the left column anchored at the current bottom-left position used by the game log.
- Preserve the current width class family: `w-72 md:w-80`.
- Replace the single log panel mount with a vertically stacked container using a modest gap.
- Use equal-height panels for the first pass so the stack feels intentional and balanced.
- Keep `data-allow-interaction="true"` on the interactive meta-panel region so right-click and input behavior still opt out of board suppression.

## Chat Presentation

- Chat rows should visually read like the game log:
  - sender name first,
  - sender name colored using existing player color logic,
  - message body in slate text,
  - compact feed spacing.
- Reuse the same feed-entry animation and scroll affordances as the log.
- First pass can use either an empty state or placeholder/mock messages when no chat data exists.
- Include a text input and send affordance styled like Catana meta UI, but leave them non-functional until transport/state work is scoped.

## Deferred Work

- Do not wire boardgame.io chat or any transport layer in this slice.
- Do not build minimize/collapse behavior in this slice.
- Do not add per-panel resizing in this slice.
- Do preserve clean seams for future panel state such as:
  - collapsed/expanded,
  - custom heights,
  - chat transport hookup.

## Acceptance Criteria

- The match UI renders a two-panel left column with game log above chat.
- Both panels share the same meta-panel visual language and width.
- Chat uses the same player-name highlight treatment as the game log.
- The first pass remains presentational only for chat input and message transport.
- The panel structure leaves a straightforward path for future minimize and resize controls without reworking the whole layout.
