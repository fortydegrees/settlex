# SettleHex Design Review Checklist

Use this for one-off visual audit passes, design reviews, or pre-redesign orientation. It is intentionally more specific than a generic "taste" checklist: judge the surface against the current SettleHex game/product direction first, then use external references only to sharpen the critique.

## Inputs To Gather

- Surface, route, and target state being reviewed.
- Desktop and mobile viewport screenshots when layout is part of the question.
- Current user goal for the surface: play now, join, sign in, inspect status, manage account, or absorb ambient game life.
- Current authority: `DESIGN_SYSTEM.md`, `UI_CATALOG.md`, production Storybook stories, relevant component README and `NOTES.md` decisions. Use the sandbox for integrated gameplay; the current screen is evidence, not approval of every existing control.

## Review Passes

1. Surface role: decide whether the screen is gameplay HUD, title surface, lobby/product chrome, dialog, settings, or quiet metadata. Call out any element whose visual weight does not match its role.
2. Canonical fit: compare against the current design contract, approved game feel and local primitives. Flag anything that reads as generic shadcn, stock SaaS, AI landing page, or unrelated decorative styling.
3. Composition: check whether the board/table, primary action, and account/status chrome are ordered correctly. The user should understand what to do without filler panels or explanatory marketing blocks.
4. Chrome hierarchy: distinguish tactile game controls from standard product controls and ambient metadata. Do not give release labels, diagnostics, top links, or secondary status the same treatment as play actions.
5. Motion and sound: rich motion belongs to meaningful game moments, input response, and transitions. Utility hover states should be quick and quiet. Homepage animation should feel like ambient tabletop life, not a tutorial replay.
6. Content honesty: remove fake stats, fake social proof, unsupported claims, placeholder destinations, and activity feeds that imply nonexistent live behavior.
7. Responsive behavior: check that text fits, controls do not collide, mobile top chrome does not compete with the title/board, and fixed-format surfaces keep stable dimensions.
8. Implementation path: identify the owning component, whether an existing primitive should be used, the smallest useful verification surface, and any follow-up that should be deferred.

## Homepage-Specific Checks

- Does the first viewport show the actual SettleHex table as the product signal?
- Do mode actions read as a bottom game-control dock rather than three unrelated cards?
- Is top-right chrome account-first, with online/build/status metadata quieter than identity?
- Are About, Blog, Discord, Feedback, release, and diagnostic affordances quiet until they have real destinations and clear value?
- Is logged-out account chrome a simple sign-in/profile action rather than a generated guest avatar?
- Does ambient animation add life without making the title screen feel like an active match?

## Game/HUD-Specific Checks

- Preserve the existing action dock, resource rails, log/chat affordances, and player-color identity unless the task is explicitly about that system.
- Keep local, opponent, and spectator perspectives separate before judging placement, anchors, frozen counts, privacy, or timing.
- Prefer `/dev/sandbox` for board/HUD verification and `/dev/effects` for deterministic effect/audio tuning.
- Do not turn bespoke gameplay chrome into generic product cards.

## Output Shape

Lead with the few highest-impact findings, each tied to a concrete surface or component. Then give the smallest next action: keep, tune, replace, remove, or prototype. Avoid broad redesign prescriptions unless the evidence shows the current surface direction is wrong.

## Systematic interaction review

For broad polish work, build a coverage matrix across both axes:

- Control families: buttons/icon buttons, switches/selectors, fields, menus,
  disclosures, overlays/drawers, sliders and loading/error/success feedback.
- Journeys: enter/play/join, account creation/sign-in, recover/resume/leave,
  resource selection/trade/discard, finish/results and replay navigation.

Record the owner, named story or route, viewport, states actually exercised,
evidence and next action for each row. Separate rendered observations, source-only
candidates, subjective design judgments and unreviewed states. A list of stories
is coverage infrastructure, not proof they were all reviewed.

Evaluate hover, press, focus, selection, disabled, pending/result and open/close
where applicable. Check keyboard order against visual order, target size, focus
return, repeated/reversed input, touch layout and reduced motion. Judge animation
through interaction; screenshots alone support composition claims only.

Keep standard control feedback in shared owners and game-event choreography in
the effects system. Do not prescribe animation for every state. For unresolved
trade/discard and game-over flows, compare compositions before committing to the
existing modal. Preserve forced-selection and match-lifecycle semantics.

External critique tools supply hypotheses. Check each against the current game
identity and rendered evidence; do not adopt blanket bans on glass, player colour
or approved artwork. Keep scores scoped and subjective; never imply accessibility
or performance certification from screenshots or a source detector.
