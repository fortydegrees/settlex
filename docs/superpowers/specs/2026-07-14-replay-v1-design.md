# Archived Replay V1 Design

Date: 2026-07-14
Status: Approved design revision; pending implementation plan

## Objective

Make replay part of the normal finished-game experience rather than a separate
analytics page layered over the board. A player who finishes a live match
should move between Results, Replay, and future postgame tools without leaving
or remounting the game screen. Someone opening an archived match should be able
to play through it from the initial pre-placement state without seeing the
outcome first.

The Catana board and existing HUD remain the dominant surface. Replay adds a
compact, read-only navigation panel and player-perspective switching. Rematch
and full postgame statistics remain separate follow-up projects.

## Product Model

A match has one canonical route:

```text
/g/:matchID
```

That route presents one of three states:

1. **Live game** — the existing interactive game experience.
2. **Live postgame** — the same mounted board after game over, initially with
   Results open and the archive hydrating in the background.
3. **Archived replay** — the same board in read-only replay mode, initially at
   the unspoiled pre-placement state with replay controls open.

`?view=replay` is no longer part of the product model. Existing URLs containing
it remain harmless and backward-compatible, but newly generated links omit it.
The legacy `/replays/:replayId` route may redirect to or render the same
canonical archived experience; it must not retain a separate interaction
model.

## Finished-game Surfaces

Results, Replay, and future Stats are views within one postgame host. They are
not separate pages.

### Live transition

When a live game reaches game over:

- the current board stays mounted;
- the normal game-over Results modal opens immediately;
- no URL change, page navigation, or full-screen loading state occurs;
- replay data begins hydrating from the authoritative archive in the
  background;
- the viewer's current seat is retained as the default replay perspective.

If Replay is selected before the archive is ready, Results stays visible and
the Replay action shows a small `Preparing replay...` state. The board never
disappears. Archive polling is bounded and exposes Retry if preparation fails.

### Archived entry

Opening an already archived `/g/:matchID` starts at replay event `0`, the
initial pre-placement state. Replay controls are open, Results is closed, and
no winner, final score, or future event label is revealed automatically.

Results is always available as an intentional reveal action. Reaching the
terminal replay event opens Results automatically once. Closing Results
returns to the replay event and perspective the viewer was using rather than
seeking or resetting the replay.

### Current postgame actions

The game-over surface contains:

- **Replay**;
- **Match summary**;
- **Return to lobby**;
- **Close**.

Disabled Rematch, Replay, or Stats placeholders are not shown. Stats should be
added later as another real postgame view when its content exists.

## Replay Panel

### Visual role

Replay is compact postgame meta chrome, not a full-height analysis console.
Its container must reuse the visual language and behaviour of the existing
game log/chat panels:

- the same light Catana glass hierarchy;
- comparable corner radius, border, shadow, blur, header density, spacing,
  button sizing, and typography;
- a bounded panel that leaves the board visually dominant;
- no generic SaaS card stack or second application shell.

On desktop, the panel uses the available right side of the board. It may
collapse or close like the log/chat surfaces, but it does not become a narrow
permanent playback rail. On mobile, it becomes a compact dock/details sheet
that coexists with the normal mobile cockpit.

### Contents

The panel contains:

1. Replay heading plus Results and close/collapse actions;
2. player-perspective switcher;
3. current turn and human-readable event label;
4. previous/next event controls;
5. previous/next turn controls;
6. meaningful-event scrubber with turn markers and position count;
7. compact victory-point history.

Replay v1 has no play/pause control, autoplay timer, speed selector, or Space
keyboard shortcut. Navigation is deliberate and step-based.

## Player Perspective

The perspective switcher contains **Board** plus every participant in seat
order.

- For a participant continuing directly from a live game, their seat is the
  default.
- For an archived visitor who can be matched to a participant account or seat
  credential, that seat is the default.
- Otherwise, **Board** is the default.

Board perspective shows the normal spectator composition without a local hand.
A player perspective renders that player's standard bottom HUD at the current
replay event:

- avatar and public player stats;
- exact resource counts;
- development cards held at that moment;
- the normal action dock presentation;
- dice and turn/status box on desktop;
- the End Turn/next-turn control in its normal position.

All gameplay controls are inert. Action-dock items, dice, resource shortcuts,
development cards, and End Turn retain their familiar silhouettes but use the
existing disabled/inactive treatment and never call live moves. The desktop
status box identifies replay context and the current turn instead of
presenting a live prompt or timer.

Archived replay state is authoritative postgame information, so switching
perspectives intentionally allows inspection of each player's historical hand.
Only the selected player's private inventory is rendered in the local HUD;
other players continue to use opponent-box presentation.

## Timeline And Navigation

The existing meaningful-event projection remains authoritative for board
state, visible log entries, active log row, scrubber, turn jumps, graph cursor,
and Results-at-end behaviour. There is one replay cursor.

- Previous/next event moves one meaningful event.
- Next turn moves to the first event in the next turn.
- Previous turn moves to the current turn boundary, then the previous turn
  boundary.
- The scrubber seeks meaningful events rather than raw reducer frames.
- Left/Right Arrow steps events when focus is outside an editable control.
- Shift+Left/Right Arrow steps turns.
- Clicking a visible game-log row or graph position seeks the same cursor.

Replay state changes are immediate. Live GSAP effects, audio, haptics,
automatic actions, timers, and gameplay input remain suppressed.

## Log And Score History

The existing game log remains the event list; Replay does not duplicate it.

- future log entries stay hidden;
- the active entry scrolls into view without a blocking animation;
- visible log rows are clickable seek targets;
- archived chat remains complete and read-only because chat messages do not
  currently contain replay-event timestamps.

The stepped victory-point chart remains in the compact panel and continues to
use Recharts. To preserve the unspoiled archive entry, it renders score history
only through the current replay event. It must not draw future score lines,
show final-score legends, or reveal future event labels. The graph can grow as
the viewer steps forward. Its current-score legend reflects the selected event.

The scrubber necessarily communicates total replay length, but it does not
label unseen future events or reveal the winner.

## Data Flow

### Archived route

The server loads the archived match, rebuilds validated frames, and passes the
initial event, event projection, participants, and final summary into the
shared postgame replay client. The client starts at event `0`.

### Live postgame

The live game-over state is displayed immediately from the connected
boardgame.io client. A Settlex-owned postgame replay endpoint loads the newly
archived match by `matchID` and returns the same validated replay payload used
by the archived route. The postgame host installs that payload without
navigating or remounting the visible board.

Client-recorded snapshots are not the replay source of truth. They are
incomplete after reconnects and contain player-view masking during live play,
so they cannot reliably support historical perspective switching.

### Reconstruction safety

`buildReplayFrames` remains responsible for deterministic reconstruction and
must continue to:

- validate initial and final Catana state shape;
- reject impossible state-ID gaps and reducer errors;
- skip boardgame.io transition entries already applied by an earlier reducer
  action;
- verify that the terminal reconstructed state matches the archived final
  state ID.

## Resilience

- An archive with no actions renders its initial state with navigation
  disabled.
- Missing structured game-log entries use the existing human-readable raw
  action fallback.
- Invalid reconstruction never renders a partial replay.
- A live postgame archive delay leaves Results and the final live board usable.
- A failed background replay request offers Retry and Return to lobby without
  replacing the whole screen.
- Missing score history omits the graph while keeping step navigation and the
  board available.

## Testing And Verification

Shared logic, state flow, routing, and perspective wiring receive focused
automated coverage for:

- canonical `/g/:matchID` live-versus-archive routing without replay intent;
- archived entry at event `0`;
- live game-over transition retaining the mounted board while replay hydrates;
- bounded preparation, retry, and failure behaviour;
- Results manual reveal and automatic reveal at the terminal event;
- closing Results preserving cursor and perspective;
- Board and participant perspective selection;
- selected historical resources and development cards reaching the local HUD;
- replay gameplay controls remaining disabled;
- previous/next event and turn navigation;
- keyboard, log, scrubber, and graph seeking sharing one cursor;
- future log rows and future graph data remaining hidden;
- legacy `?view=replay` and `/replays/:replayId` compatibility;
- human-readable event labels and replay-frame validation.

Manual verification uses a real archived match and a completed local match:

- desktop `1440x900`: unspoiled entry, native panel fit, every perspective,
  resources/dev cards, dice/status/disabled End Turn, step controls, log sync,
  graph growth, Results reveal, and in-place live transition;
- mobile `390x844`: compact replay controls, player cockpit coexistence,
  perspective switching, Results access, and unobstructed board interaction;
- browser console and reduced-motion checks.

## Acceptance Criteria

Replay v1 revision is complete when:

- a live player sees Results immediately at game over and can enter Replay
  without navigation or board remounting;
- an archived `/g/:matchID` opens unspoiled at the initial pre-placement state;
- newly generated replay links do not require `?view=replay`;
- Results is deliberately accessible throughout and opens automatically only
  upon reaching the terminal event;
- Replay uses a compact panel that visibly belongs to the game log/chat family;
- play/pause and speed controls are absent;
- event, turn, scrubber, keyboard, log, and graph seeking remain synchronized;
- future log and score information stays hidden;
- Board and player perspectives work, with the selected historical hand and
  read-only standard HUD shown correctly;
- desktop dice, replay status, and disabled End Turn remain visible;
- replay interactions cannot submit gameplay moves;
- invalid or delayed archives leave the finished-game board and Results usable;
- focused automated tests and desktop/mobile browser checks pass.
