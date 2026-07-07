# Catana Design Review Checklist

Use this for one-off visual audit passes, design reviews, or pre-redesign orientation. It is intentionally more specific than a generic "taste" checklist: judge the surface against the current SettleHex game/product direction first, then use external references only to sharpen the critique.

## Inputs To Gather

- Surface, route, and target state being reviewed.
- Desktop and mobile viewport screenshots when layout is part of the question.
- Current user goal for the surface: play now, join, sign in, inspect status, manage account, or absorb ambient game life.
- Existing local references: current game screen, `/catana/dev/sandbox`, `/catana/dev/ui`, relevant component README, and `docs/agent/NOTES.md` entries for the surface.

## Review Passes

1. Surface role: decide whether the screen is gameplay HUD, title surface, lobby/product chrome, dialog, settings, or quiet metadata. Call out any element whose visual weight does not match its role.
2. Canonical fit: compare against the current game screen and local primitives. Flag anything that reads as generic shadcn, stock SaaS, AI landing page, or unrelated decorative styling.
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
- Prefer `/catana/dev/sandbox` for board/HUD verification and `/catana/dev/effects` for deterministic effect/audio tuning.
- Do not turn bespoke gameplay chrome into generic product cards.

## Output Shape

Lead with the few highest-impact findings, each tied to a concrete surface or component. Then give the smallest next action: keep, tune, replace, remove, or prototype. Avoid broad redesign prescriptions unless the evidence shows the current surface direction is wrong.
