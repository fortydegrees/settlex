# Player Color Conflicts Design

Date: 2026-04-03
Scope: Catana in-game player colour conflict groups and olive retirement
Status: Approved for implementation

## Goal

Prevent players from appearing on the same board with colours that are too visually close, even when the raw colour ids are different.

This slice extends the existing effective in-game colour system with:
- explicit match-level conflict groups,
- retirement of `olive` from the selectable/assignable palette,
- deterministic fallback reassignment when a player picks a conflicting colour.

## Product Rules

### 1. Exact duplicates still conflict

If two players resolve to the same preferred colour id, that is still a clash and the later conflicting seat must be reassigned.

### 2. Explicit colour conflict groups

The following colours must not appear together in the same game:

- `lavender`, `violet`, `purple`
- `lavender`, `magenta`, `purple`
- `red`, `coral`

For implementation clarity, this should be treated as an explicit conflict graph:

- `lavender` conflicts with `violet`, `purple`, `magenta`
- `purple` conflicts with `lavender`, `violet`, `magenta`
- `violet` conflicts with `lavender`, `purple`
- `magenta` conflicts with `lavender`, `purple`
- `red` conflicts with `coral`
- `coral` conflicts with `red`

Important non-rule:
- `violet` and `magenta` are still allowed together unless a future design change says otherwise.

### 3. Retire `olive`

`olive` should no longer be a live selectable or assignable player colour.

Behavior after this change:
- the username picker does not show `olive`,
- fallback assignment never chooses `olive`,
- old stored or incoming `olive` values are normalized to `lime`.

This treats `olive` as a legacy alias rather than an active colour.

## Context

- Catana already has an effective in-game colour resolver for piece/avatar consistency.
- The current palette is larger than the original two-seat palette, so some colours are distinct as ids but still too close visually on the board.
- The human-approved rule for this slice is intentionally narrow:
  - do not invent generalized colour-distance logic,
  - do not auto-ban broad families beyond the explicitly approved groups,
  - only encode the known clash cases above.

## Recommended Architecture

Keep the implementation explicit and data-driven.

Recommended responsibilities:

- `app/catana/theme/playerColors.js`
  - own palette membership and legacy aliases,
  - remove `olive` from live option lists,
  - normalize `olive -> lime`.

- `app/catana/utils/playerColorsInGame.js`
  - own effective colour conflict logic,
  - expose a pure helper for checking whether two colours conflict,
  - resolve colours by seat order against:
    - exact duplicate conflicts,
    - explicit conflict-graph conflicts,
    - fallback palette order.

This keeps palette definition and in-game conflict behavior separate.

## Data Flow

1. Lobby storage / match metadata still carries the player's chosen colour id.
2. Color normalization resolves legacy aliases first.
3. `olive` normalizes to `lime` before match conflict resolution.
4. The effective-colour resolver iterates players in `core.players` order.
5. For each player:
   - keep the preferred colour if it does not conflict with any already-assigned effective colour,
   - otherwise assign the first fallback colour that does not conflict with any already-assigned effective colour.

## Fallback Behavior

Fallback assignment should remain deterministic and seat-order based.

Conflict check during fallback must reject a candidate when:
- the candidate exactly matches an already-used effective colour, or
- the candidate is in an explicit conflict relationship with an already-used effective colour.

This means examples like:
- `lavender` vs `purple` are treated the same way as an exact duplicate,
- `red` vs `coral` are treated the same way as an exact duplicate.

## Palette Behavior

After this change there are three relevant palette concepts:

- canonical runtime colour ids:
  - the supported player colours after normalization,
  - includes `lime`,
  - excludes active use of `olive`.

- picker colour ids:
  - same as canonical runtime ids,
  - but ordered for the username UI.

- fallback colour ids:
  - the deterministic ordered list used for reassignment,
  - must also exclude `olive`.

## Testing

Add focused coverage for:

- color normalization:
  - `olive` normalizes to `lime`

- resolver conflict logic:
  - exact duplicates still conflict
  - `lavender` conflicts with `violet`
  - `lavender` conflicts with `magenta`
  - `purple` conflicts with `violet`
  - `purple` conflicts with `magenta`
  - `red` conflicts with `coral`
  - `violet` does not conflict with `magenta`

- resolver integration:
  - when two players pick conflicting colours, the later seat is reassigned to the first non-conflicting fallback colour
  - fallback assignment never returns `olive`

- picker integration:
  - `olive` no longer appears in the username picker swatches

## Acceptance Criteria

- Two players cannot share an exact colour id in-game.
- Two players cannot appear in the same game with:
  - `lavender` and `violet`
  - `lavender` and `purple`
  - `lavender` and `magenta`
  - `purple` and `violet`
  - `purple` and `magenta`
  - `red` and `coral`
- `violet` and `magenta` remain allowed together.
- `olive` is no longer selectable in the username picker.
- Any old or incoming `olive` value resolves to `lime`.
- Fallback reassignment remains deterministic by seat order.
