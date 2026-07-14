# Archived Replay V1 Design

## Objective

Turn the existing archived replay infrastructure into a discoverable, useful
postgame analysis tool without rebuilding the live game screen. A finished
match should be easy to find, easy to enter from the results flow, and easy to
navigate by meaningful game events and turns.

The replay remains the normal Catana board and HUD in read-only mode. Replay
controls are an additional navigation layer over that screen. Rematches and a
full postgame statistics product are separate follow-up projects.

## V1 Scope

The replay slice includes:

- a direct **Watch replay** action from the game-over and postgame summary
  surfaces;
- a **My games** account-menu item that opens the signed-in player's existing
  profile/history page;
- a right-side desktop replay console and responsive mobile bottom dock/sheet;
- event and turn navigation, play/pause, scrubbing, and `1x`, `2x`, and `4x`
  playback;
- human-readable current-event copy;
- synchronization between replay position and the existing left game log;
- a compact interactive victory-point chart powered by Recharts;
- removal of the disabled Rematch button and disabled Stats/Replay tabs.

V1 does not include rematch behavior, a new match-history page, resource or
dice analytics, replay-specific sound/effect playback, or implementation of the
full postgame Stats surface.

## Entry Points And Postgame Cleanup

### Game-over modal

The game-over result remains the first postgame surface. Its actions become:

1. **Watch replay** — the primary postgame action;
2. **Match summary** — opens the existing final-score summary;
3. **Return to lobby**;
4. **Close**.

The disabled Rematch control is removed until rematch behavior has its own
design and implementation.

### Postgame summary

`PostgameOverlay` becomes a single-purpose match summary. The disabled tab bar
is removed instead of presenting unavailable Stats and Replay destinations.
The summary includes a **Watch replay** action so players can move from either
postgame surface into the archive.

### My games

The signed-in account/profile menu gains **My games**. For v1 it links to the
current user's public profile route, which already contains recent archived
matches and replay links. A separate private history surface is not required
for this slice.

## Replay Routing And Archive Readiness

The postgame action opens the canonical game route with an explicit replay
intent:

```text
/g/:matchID?view=replay
```

Replay intent changes the route lookup order. It checks the archive before the
live boardgame.io match, allowing replay entry during the existing grace period
when both copies are present.

- If the archive exists, the explicit replay route starts at the initial replay
  position.
- If the live match has ended but the archive write is still completing, the
  route shows a lightweight **Preparing replay...** state and refreshes once a
  second for up to ten seconds. It then offers manual Retry and Return to
  game/lobby actions rather than polling indefinitely.
- If a replay is requested for an active match, the page explains that the
  replay is available after the match finishes and links back to the live game.
- If neither a live nor archived match exists, the existing unavailable-match
  treatment remains the terminal state.

The existing route behaviors remain distinct:

- `/replays/:replayId` opens a known archive at its first replay position;
- `/g/:matchID?view=replay` explicitly requests the archive and starts at the
  beginning;
- an ordinary `/g/:matchID` continues to prefer a live match and, once only an
  archive remains, may open its final state as the current graceful fallback.

This makes the results link reliable without requiring the browser to know the
archive's generated replay ID.

## Replay Timeline Model

The archived action reducer remains the source of authoritative raw frames.
A new pure replay projection converts those frames into the navigation model
used by the console, chart, and game log.

The projection exposes:

- ordered meaningful replay events;
- a mapping from event index to raw frame index;
- a mapping from stable game-log entry ID to event index;
- the first event for each turn;
- victory-point values for every player at every event.

### Meaningful events

Structured `G.gameLog` entries define meaningful events. When a reduced raw
frame introduces a new log entry, that entry becomes a replay event pointing
to that authoritative frame. Multiple entries introduced by one raw action may
point to the same board state; they remain separately addressable so every
visible game-log row can be selected.

The initial board state is always event index `0`, labelled `Initial setup`.
If an older archive has no structured game log, the projection falls back to
raw action frames and maps known action types to cleaned-up labels. Unknown
action types receive a neutral `Game updated` label rather than exposing
internal payload names.

The projection is deterministic and contains no timers or presentation state.
It is independently testable and does not depend on Recharts or React.

### Navigation semantics

- Previous/next event moves exactly one meaningful event.
- Next turn moves to the first event whose turn is later than the current turn.
- Previous turn moves to the first event of the current turn when the user is
  partway through it; from that boundary it moves to the first event of the
  preceding turn.
- The scrubber operates on meaningful event indexes, not raw reducer frames.
- Manual navigation through buttons, keyboard, game log, scrubber, or chart
  pauses autoplay.
- Play at the final event restarts from the initial position and continues.
- Autoplay stops when it reaches the final event.

The default autoplay cadence is one event per second at `1x`, one event per
half-second at `2x`, and one event per quarter-second at `4x`. State changes are
instantaneous at each step.

## Replay Console

### Desktop

A full-height Catana glass console floats against the right edge of the board,
using space vacated by live-only action controls. It is visually secondary to
the board and does not create a separate replay page around the game.

The console contains, in order:

1. an Archived replay heading and collapse control;
2. current turn and human-readable event label;
3. previous event, play/pause, and next event controls;
4. previous-turn and next-turn controls;
5. the event scrubber with turn markers and current/total event count;
6. `1x`, `2x`, and `4x` speed controls;
7. the compact victory-point chart and current score legend.

The collapsed state becomes a slim replay rail that retains play/pause and
previous/next event controls plus an expand affordance.

### Mobile

At the existing portrait breakpoint, the permanent right console becomes a
compact bottom replay dock. The dock keeps previous event, play/pause, next
event, and the current turn visible. Expanding it opens a bottom sheet with the
turn controls, scrubber, speed choices, event label, and score chart.

The mobile treatment must not wrap the board in a second desktop layout or
permanently reduce the board to a narrow column.

### Keyboard

When focus is not inside an editable control:

- Left/Right Arrow moves by event;
- Shift+Left/Right Arrow moves by turn;
- Space toggles play/pause.

Replay keyboard handling supersedes the live-game Space shortcut while
`isReplay` is true. Every icon-only control has an accessible name and visible
focus treatment.

## Human-readable Event Labels

The current-event label and left game log use the same formatting source.
Existing `formatLogEntry` behavior is extended or adapted to expose both its
rich display tokens and a plain accessible sentence. Replay UI must not keep a
second independent dictionary of build, roll, robber, award, development-card,
and game-over names.

Examples of intended labels include:

- `DandyDrew rolled 8`;
- `Ignasis built a settlement`;
- `Sw00d moved the robber`;
- `lizzzcakes gained Longest Road`.

## Left Game-log Synchronization

Live-game log behavior remains unchanged. Replay mode adds a controlled log
path with these rules:

- only log entries present at the current replay event are rendered;
- seeking backwards removes future entries immediately;
- the entry associated with the current replay position is highlighted;
- the active row scrolls into view without animated or blocking transitions;
- selecting a replay log row jumps to its mapped event and pauses playback;
- entries that share a raw board frame remain individually selectable.

Archived chat remains read-only and complete in v1. It is not synchronized to
replay time because archived chat messages do not currently carry a replay
frame or game-log event reference.

## Victory-point Chart

The project adds `recharts` as an approved chart-rendering dependency. Shadcn
chart wrappers and any additional visual system are not introduced.

The replay chart is a focused `ReplayScoreChart` component. A small
Catana-owned chart frame supplies shared typography, player-color treatment,
grid, and legend styling that future postgame charts can reuse. It is not a
general analytics framework.

Chart behavior:

- one stepped line per player using existing Catana player colors;
- x positions use meaningful event index, with turn numbers shown at turn
  boundaries;
- y positions use integer total victory points;
- totals come from the authoritative archived state and therefore include
  hidden victory-point development cards;
- a vertical reference line marks the current replay event;
- clicking or tapping the plot jumps to the nearest event and pauses playback;
- a compact legend shows every player and their VP at the current replay
  position;
- the chart resizes with the console and remains readable for two to four
  players.

V1 does not include zoom/pan, event icons on the plot, resource overlays,
advanced hover tooltips, export, or comparisons between matches.

Replay projection prepares plain chart data before rendering. Recharts does
not own replay indexing, score calculation, labels, player colors, or seek
behavior. Because the chart component is reached only through the replay
client tree, the library should remain outside the ordinary live-game route
chunk.

## Playback Presentation

Replay playback is state-first:

- each event swaps to its reconstructed authoritative state immediately;
- live GSAP effect sequences do not rerun;
- live gameplay audio does not play;
- no generic changed-piece glow or highlight is added;
- log scrolling and cursor movement are non-blocking.

This avoids misleading animation reconstruction and keeps high-speed playback
legible. Normal UI hover, press, panel, and reduced-motion behavior continues
to follow the Catana design system.

## Resilience And Empty States

- An archive with no actions still renders its initial state with navigation
  disabled.
- Missing structured game-log data uses the raw-frame fallback.
- Missing participant color metadata uses the existing player-color fallback.
- If archived action reconstruction throws or produces no valid state, the
  replay unavailable treatment is shown rather than presenting a partial,
  potentially misleading replay.
- The score chart is omitted when score data cannot be derived, while replay
  navigation and the board remain usable.
- Bounded archive preparation provides a manual Retry instead of an infinite
  loading state.

## Testing And Verification

Shared logic, event wiring, and state flow are test-first. Focused automated
coverage includes:

- meaningful-event extraction and raw-frame fallback;
- stable log-ID/event mappings, including multiple log entries on one frame;
- previous/next event and turn-boundary behavior;
- autoplay cadence, restart-at-end, stop-at-end, and manual-seek pausing;
- human-readable labels sharing the game-log formatter;
- VP series generation from archived states, including hidden VP cards;
- graph/log seek callbacks selecting the correct event;
- replay-controlled logs hiding future entries when seeking backwards;
- replay-intent archive-first routing and its active, preparing, ready, and
  unavailable states;
- postgame actions and account-menu history link.

Manual browser verification uses:

- desktop at `1440x900` for console/board coexistence, collapsed mode, log
  scrolling, chart seeking, and keyboard controls;
- mobile portrait at `390x844` for the compact dock, expanded sheet, touch
  targets, chart readability, and unobstructed board access;
- a completed local match or archived fixture for the results-to-preparing-to-
  replay transition;
- reduced-motion mode and keyboard-only navigation.

## Acceptance Criteria

The replay v1 slice is complete when:

- a player can reach replay directly from either postgame results surface;
- archive timing never drops that player into an unintended live/spectator
  screen or an endless loader;
- signed-in players can find recent replays through **My games**;
- disabled Rematch, Stats, and Replay affordances are no longer visible;
- event, turn, scrubber, log, keyboard, and chart navigation stay synchronized;
- moving backwards removes future game-log entries;
- autoplay works at `1x`, `2x`, and `4x` and stops at the end;
- current event labels are human-readable;
- the VP graph accurately follows authoritative archived scores and can seek;
- the full existing game board remains the dominant replay surface;
- desktop and mobile replay controls are usable without interfering with the
  live game experience;
- focused automated tests and the specified manual browser checks pass.
