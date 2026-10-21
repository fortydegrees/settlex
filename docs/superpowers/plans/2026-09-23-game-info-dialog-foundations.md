# Game Information Dialog Foundations Implementation Plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Use superpowers:subagent-driven-development when explicitly requested or when substantial independent tasks justify separate implementers and reviews. Preserve any project-required review and approval gates. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring game settings and rules into the enforced Clarity system and catalog their actual production components.

**Architecture:** Extract only the two presentational Dialog compositions from GameScreen into GameInfoDialogs. GameScreen continues owning open state, audio state/handler and rule-row calculation. Reuse Dialog, Button and the existing inset material; no new primitives or control behavior.

**Tech Stack:** React, Tailwind semantic tokens, Base UI via shared Dialog, Storybook 8.

## Global Constraints

- Work only in the existing codex/clarity-ui-redesign worktree; preserve all dirty work.
- Keep labels, values, dialog widths, event callbacks, data-allow-interaction guards and audio behavior unchanged.
- Do not touch board/HUD geometry, rules, timers, preferences or match lifecycle.
- No new dependencies, exceptions, global type resets, commits, pushes or deployment.

---

### Task 1: Migrate and verify settings/rules compositions

**Files:**
- Create: `app/catana/components/GameInfoDialogs.js`
- Create: `app/catana/components/GameInfoDialogs.stories.jsx`
- Modify: `app/catana/GameScreen.js` (imports and two dialog call sites only)
- Modify: `scripts/design-system/legacy-styles.json` (remove resolved findings only)
- Update: `docs/agent/{PROGRESS,NOTES,UI_CATALOG,DESIGN_SYSTEM,CLARITY_UI_REVIEW}.md`

**Interfaces:**
- `GameSettingsDialog({open, onOpenChange, isMuted, onToggleMute, themeId})`
- `GameRulesDialog({open, onOpenChange, rows})`, where rows is the existing array of `[label, value]` pairs.
- `onOpenChange(false)` on Close; forward other shared Dialog open-change events unchanged.

**Verification shape:** Presentation/manual baseline plus production-component Storybook interaction checks. No logic change or source-grep tests.

- [x] Capture current settings/rules at `/catana/dev/sandbox?theme=classic`, 1440x900. Settings is 384px wide, rules 448px; rows use one-off 16px corners and split type declarations. Read-only theme observed as Emoji, seven rule rows observed.
- [x] Extract the compositions; use `settlex-ui-inset`, `px-ui-4 py-ui-3`, `gap-ui-4`, `type-action-small text-ink-primary` labels and `type-label text-ink-secondary` values. Rule rows use `grid-cols-2` with wrapping so longer rule identifiers cannot overflow narrow dialogs. Keep control variants and full-width mute button.
- [x] Add SettingsAudioOn, SettingsMuted, StandardRules and CustomRules stories using local state/callback spies only. Exercise toggle, Close, Escape and focus return; assert ordered rendered rule values and no audio side effects for rules. Leave the dialog open for visual review.
- [x] Verify stories and actual sandbox entry points at 1440x900 and 390x844; check long rules at 320x568, keyboard focus and scrolling, plus reduced motion/transparency. Do not alter persistent audio preferences during sandbox verification.
- [x] Run `pnpm exec vitest run app/catana/__tests__/gameScreenCommandState.test.js scripts/design-system/policy.test.mjs app/ui/displayFont.test.js --reporter=dot`, `pnpm lint` and `git diff --check`. Prune only decreased existing ledger counts; confirm no new findings.
- [x] Request independent read-only review against `/tmp/settlehex-dialog-review.08yBLx/GameScreen.js` and the ledger snapshot; fix actionable findings.
- [x] Document observed checks/limits, close the temporary QA tab, reset viewport/media overrides and hand off the local Storybook preview. Leave work uncommitted.
