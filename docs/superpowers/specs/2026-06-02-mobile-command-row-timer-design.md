# Mobile Command Row Timer Design

Scope: Catana mobile portrait command row timer visibility.

## Goal

Make the turn/stage timer visible on mobile during normal actionable play, including `Roll Dice` and `End Turn`, without reviving the always-on top turn-context strip.

The mobile command row should remain the single persistent turn surface:

```text
[ Log / Chat ] [ action or status ] [ timer ]
```

## Context

The mobile shell already receives valid timer data. `GameScreen` computes `visibleTimerMs` from the server timer snapshot and passes it into `MobilePlayerCockpit`. `MobilePlayerCockpit` also calls `useLocalPlayerDockModel`, which already derives:

- `timerText`
- `showStatusTimer`
- `isLowTimerAlertActive`

The missing piece is presentation. The mobile cockpit currently renders timer-aware status only indirectly through the removed `MobileTurnContextStrip`; the active command row has no timer display when it shows `Roll Dice` or `End Turn`.

Recent mobile direction says:

- the bottom command/status box is the persistent turn surface,
- `MobileTurnContextStrip` is reserved for a future transient event toast,
- forced-action text can wrap to two lines,
- low-time urgency should stay local to the timer segment.

## Design

### Command Row Layout

Use three columns in the mobile command row:

```text
log/chat trigger | action/status surface | timer box
```

Recommended starting widths:

- log/chat trigger: about `5.5rem` to `6rem`
- timer box: about `4rem`
- action/status surface: `minmax(0, 1fr)`

The timer column should stay reserved during live mobile play so the primary button does not resize when a timer temporarily disappears.

### Action And Status Surface

The middle surface keeps its current role:

- `Roll Dice` when the local player must roll.
- `End Turn` when the local player can end the turn.
- passive or forced-action status text when there is no primary CTA.

The `Roll Dice` and `End Turn` buttons should not embed the timer. Keeping the timer as a separate right-hand box makes the button's job clearer and gives the countdown a stable scan location.

Long passive/forced status copy may wrap to two lines, as it does now.

### Timer Box

The timer box should:

- render `timerText` from `useLocalPlayerDockModel`,
- respect `showStatusTimer`,
- apply low-time styling from `isLowTimerAlertActive`,
- use tabular digits,
- match the command-row height,
- use Catana glass styling when normal,
- use rose/danger styling only inside the timer box when low.

When there is no valid timer during live play, keep the column width and render a quiet muted `--:--` placeholder rather than resizing the row. This covers rare states such as initial snapshot absence or stale timer/status mismatch.

In replay and game-over modes, the full turn-control row remains hidden through the existing `showTurnControls={!isReplay && !isGameOver}` gate.

### Short Phone Tuning

On short phone viewports such as iPhone SE, shrink only the command row, not the resource cockpit.

Recommended starting point:

- current command row height: about `3.85rem`
- short-phone command row height: about `3.25rem` / `52px`
- keep the touch target comfortably above native minimum touch guidance
- reduce `End Turn` / `Roll Dice` text slightly only in the compact-height variant

On taller phones such as iPhone XR, keep the current command-row height.

## Data Flow

No timer protocol changes are needed.

```text
server timer snapshot
  -> GameScreen timerSnapshot / visibleTimerMs
  -> MobilePlayerCockpit timerMs
  -> useLocalPlayerDockModel timerText / showStatusTimer / isLowTimerAlertActive
  -> mobile command row timer box
```

Timer visibility should continue to use the existing semantic alignment gate from `gameStatus.showTimer` / `shouldShowGameStatusTimer`.

## Rejected Options

### Put timer inside `Roll Dice` / `End Turn`

This keeps the row width simpler, but it makes the primary action do two jobs and can make the countdown harder to scan under pressure.

### Restore the persistent top strip

This contradicts the recent mobile shell direction. The top area should remain opponent/player HUD plus optional future transient event toast, not always-on turn chrome.

### Show timer only in passive status states

This misses the important case: the timer must be visible during normal `End Turn` and `Roll Dice` states.

## Acceptance Criteria

- Mobile command row has stable left feed, middle action/status, and right timer regions.
- Timer is visible during `Roll Dice`, `End Turn`, waiting, and forced-action states when the existing status/timer gate allows it.
- If no valid timer is available during live play, the timer column stays reserved with a quiet `--:--` placeholder.
- Low-time styling affects only the timer box.
- iPhone SE command row is slightly shorter than the current row while remaining comfortably tappable.
- iPhone XR keeps the current command-row height.
- `MobileTurnContextStrip` is not reintroduced as persistent top chrome.

## Verification

Use focused source/render checks for the row contract, then visually verify in `/catana/dev/sandbox` at:

- iPhone SE: `375x667`
- iPhone XR: `414x896`

States to check:

- pre-roll / `Roll Dice`
- post-roll / `End Turn`
- opponent waiting
- robber move or another forced action
- brief no-timer fallback if easy to simulate
- low timer styling if easy to simulate

Because this is UI presentation and layout work, broad engine tests are not required unless the implementation changes shared logic or timer semantics.
