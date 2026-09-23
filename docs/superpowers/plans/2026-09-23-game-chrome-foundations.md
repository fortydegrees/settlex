# Game chrome foundations

Continue the approved Clarity migration in the existing isolated worktree.
Keep board geometry, action-dock controls, gameplay state, callback wiring,
feed transition timing, stored preferences, and drawer dismissal unchanged.

## Acceptance and state matrix

- Desktop utility controls use the utility-pill family with the lighter HUD material.
- Feed frames/headers and mobile drawer use shared corners, ink, complete type roles,
  spacing and material recipes, with visible keyboard focus and opaque fallback.
- Phone feed tabs retain tab semantics and have 44px targets.
- Pre-roll, post-roll, waiting, discard, robber, placement, game-over and
  spectator/replay: existing turn controls and disabled/visible conditions stay owned
  by GameScreen. This pass only styles secondary chrome; it creates no game-state model.
- No/playable/unplayable development cards, clocks and disconnect state are unchanged.
- Log/Chat keep their production props, transcript/composer behavior and selection.
- Sound/rules/settings remain available; Resign retains the existing canResign guard.
- Storybook covers menu callbacks/closing, no-resign state, tabs and read-only chat.
- Sandbox samples desktop and 375x667, 390x844, 430x932 phone viewports. Document
  which states were actually observed rather than implying exhaustive gameplay QA.

## Steps

1. Capture a pre-turn source baseline; reuse existing material/control owners.
2. Migrate feed/header/menu visual classes and the three desktop utility overrides.
3. Add named production-owner Storybook states and interaction assertions.
4. Prune only removed legacy-style findings; run focused tests, lint and policy checks.
5. Check Storybook and integrated sandbox; review the focused diff and update
   PROGRESS, NOTES, UI_CATALOG and review evidence. No commit, push or deployment.

## Completed

All five steps completed. Fresh lint/policy/diff checks and 28 targeted tests pass.
Five stories rendered; four interaction play functions passed. Desktop and the
three phone sizes were checked in the real classic sandbox. See
docs/agent/CLARITY_UI_REVIEW.md for observed states and explicit verification limits.
The read-only review's unsupported-blur fallback finding was corrected.
The main QA tab was closed and media/viewport overrides reset; existing homepage
and Storybook previews were preserved. A failed hidden startup tab could not be
reattached for explicit closure because the browser tool rejects its generated
data-URL error page; it remains unmarked for normal end-of-turn tool cleanup.
Local preview servers remain running on 3011 and 6011 for continued review.
