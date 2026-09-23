# Enforced UI foundations — first migration

Approved direction: the user asked to begin the global, enforced design system,
with complete typography roles and the custom display face kept separate from
normal UI. Execute inline in the existing isolated Clarity worktree.

## Boundaries and acceptance

- Preserve approved home mode-button appearance and game geometry.
- Do not redefine Tailwind's existing defaults or restyle all headings globally.
- Use existing dependencies. No auth/lifecycle/engine changes or deployment.
- Foundation values have one owner; complete type roles include family, size,
  weight, line height and tracking. Semantic heading level is independent.
- Shared controls and the account page/modal are the first migrated consumers.
- Partial display font: approved static wordmark/celebration phrases only;
  unsupported text uses the normal UI face as a whole, not mixed glyphs.
- A source-policy checker blocks new raw typography, radii, palette and off-scale
  spacing in application code. Existing findings are a counted migration ledger,
  not a claim that every screen has migrated. Board-specific findings remain
  visible without automatically altering game styling.
- Storybook uses the production definitions, including portal font inheritance.
- Check actual desktop/phone rendering, modal interaction, integrated 2D sandbox
  and the homepage. Preserve existing user tabs; close the task QA tab.

## Tasks

- [x] Capture desktop/phone game and homepage baselines.
- [x] Implement and test the policy scanner against valid/invalid fixture input;
  record a shrink-only legacy ledger and wire the check into lint/verify.
- [x] Add canonical typography/spacing/shape/colour definitions and semantic
  Tailwind mappings without replacing old utility values.
- [x] Adopt roles in shared actions, fields, dialogs/panels and account forms;
  reuse the same auth selector in both account entry points.
- [x] Add the approved display font with provenance, coverage guard, wordmark
  fit, and Storybook examples; keep ordinary UI in Outfit.
- [x] Update Foundations and migration documentation, including what remains.
- [x] Run targeted behavioral tests, lint/policy checks and browser verification;
  compare the protected game/home baseline and report limitations accurately.

## Next migration after this stage

Work through the checked-in ledger surface-by-surface: identity/menu, lobby and
recovery, postgame/replay, then standard in-game panels. Bespoke board/action
geometry needs a deliberate exception or its own verified migration, never a
blanket token substitution. Accessibility contrast on the approved lime/white
palette remains an explicit unresolved issue.
