# Mobile Dev Card Picker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desktop dev-card relic in the mobile player cockpit with a compact mobile dev-card stack button and anchored tray picker.

**Architecture:** Keep desktop `DevCardDisplay` intact, but extract the shared dev-card metadata/grouping rules so desktop and mobile use the same hand semantics. Mobile gets purpose-built components: a right-aligned stack button in the inventory rail, an anchored tray above the rail, and an invisible reveal anchor for the first-card purchase animation.

**Tech Stack:** React/Next.js JavaScript, Tailwind classes, existing Catana glass HUD styling, Vitest source/utility tests.

---

## File Structure

- Modify `app/catana/components/devCardDisplayUtils.js`
  - Export shared dev-card metadata and a grouped hand helper that includes Victory Point cards.
- Modify `app/catana/components/DevCardDisplay.js`
  - Import shared metadata/grouping from `devCardDisplayUtils.js` instead of owning duplicate constants.
- Create `app/catana/components/MobileDevCardButton.js`
  - Compact mobile stack/folder-style button plus invisible reveal anchor.
- Create `app/catana/components/MobileDevCardTray.js`
  - Mobile anchored picker surface for grouped dev cards.
- Modify `app/catana/components/MobilePlayerCockpit.js`
  - Replace embedded `DevCardDisplay` with mobile button/tray state and play-card wiring.
- Modify `app/catana/__tests__/DevCardDisplayGroups.test.js`
  - Cover the new shared hand grouping, including victory points and playable counts.
- Create or modify `app/catana/__tests__/MobileDevCardButton.source.test.js`
  - Lock the mobile button/anchor behavior.
- Create or modify `app/catana/__tests__/MobileDevCardTray.source.test.js`
  - Lock the tray grouping/play-card surface.
- Modify `app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - Update expectations from `DevCardDisplay` embedded mode to mobile dev-card picker components.
- Modify `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md`
  - Record the mobile dev-card picker direction after implementation.

## Task 1: Shared Dev Card Hand Model

**Files:**
- Modify `app/catana/components/devCardDisplayUtils.js`
- Modify `app/catana/components/DevCardDisplay.js`
- Modify `app/catana/__tests__/DevCardDisplayGroups.test.js`

- [ ] Extend `devCardDisplayUtils.js` with exported `DEV_CARD_SVGS`, `DEV_CARD_TEXT`, and `getDevCardHandGroups({ cards, playableCountsByType, ... })`.
- [ ] Ensure `getDevCardHandGroups` returns Victory Point first, then `DEV_CARD_DISPLAY_ORDER`, with `{ type, count, playableCount, isPlayable, layout, cards }`.
- [ ] Update `DevCardDisplay.js` to import metadata and grouping from the utility module.
- [ ] Keep desktop visual output equivalent: grouped stacks, duplicate counts, tooltips, and disabled Victory Point behavior stay the same.
- [ ] Add/adjust Vitest coverage for grouping with 0 cards, 1 victory point, duplicate playable cards, and mixed playable/nonplayable counts.
- [ ] Run: `pnpm exec vitest run app/catana/__tests__/DevCardDisplayGroups.test.js --reporter=dot`

## Task 2: Mobile Dev Stack Button

**Files:**
- Create `app/catana/components/MobileDevCardButton.js`
- Create `app/catana/__tests__/MobileDevCardButton.source.test.js`

- [ ] Build `MobileDevCardButton` with props: `cards`, `playableCountsByType`, `playerId`, `isOpen`, `onToggle`, `containerRef`, `forceMount`.
- [ ] For `cards.length > 0`, render a compact right-edge button aligned to the inventory row with id `p${playerId}-devcards`.
- [ ] Show total count as a small glass badge and a subtle playable indicator when any group has `playableCount > 0`.
- [ ] For `cards.length === 0 && forceMount`, render an invisible absolute destination anchor with the same id/ref so first-dev purchase reveal still lands without reserving visible width.
- [ ] For `cards.length === 0 && !forceMount`, render `null`.
- [ ] Suppress mobile long-press context menu on the button.
- [ ] Run: `pnpm exec vitest run app/catana/__tests__/MobileDevCardButton.source.test.js --reporter=dot`

## Task 3: Mobile Dev Card Tray

**Files:**
- Create `app/catana/components/MobileDevCardTray.js`
- Create `app/catana/__tests__/MobileDevCardTray.source.test.js`

- [ ] Build a glass tray that opens above the inventory rail, anchored to the bottom cockpit rather than the viewport center.
- [ ] Render grouped cards from `getDevCardHandGroups`.
- [ ] Use existing dev-card SVGs at mobile-friendly size, count badges for duplicates, and disabled styling for nonplayable/VP groups.
- [ ] A playable group calls `onPlayCard(type)` and then `onClose()`.
- [ ] Close on backdrop/outer press; keep the tray small enough that it does not cover the board center.
- [ ] Respect `prefers-reduced-motion` by keeping transitions CSS-only and nonessential.
- [ ] Run: `pnpm exec vitest run app/catana/__tests__/MobileDevCardTray.source.test.js --reporter=dot`

## Task 4: Cockpit Integration

**Files:**
- Modify `app/catana/components/MobilePlayerCockpit.js`
- Modify `app/catana/__tests__/MobilePlayerCockpit.source.test.js`

- [ ] Remove the mobile import/use of `DevCardDisplay`.
- [ ] Add local `isDevTrayOpen` state.
- [ ] Render `MobileDevCardButton` at the right side of the inventory strip only when there are cards or `keepDevCardShellMounted` is true.
- [ ] Render `MobileDevCardTray` above the inventory strip when `isDevTrayOpen && visibleDevCards.length > 0`.
- [ ] Wire tray play actions to `moves.playDevCardStart(cardType)`.
- [ ] Close the tray when the visible dev-card list becomes empty or after a card is selected.
- [ ] Preserve `devCardDisplayRef` as the reveal destination ref through the mobile button/anchor.
- [ ] Run: `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`

## Task 5: Focused Polish and Docs

**Files:**
- Modify `docs/agent/PROGRESS.md`
- Modify `docs/agent/NOTES.md`

- [ ] Tune spacing so resources use full width when there are 0 dev cards and compress only when the stack button appears.
- [ ] Keep the stack button visually subordinate to resources but obvious as the dev-hand affordance.
- [ ] Update docs with the mobile dev-card picker direction and reveal-anchor constraint.
- [ ] Run focused checks:
  - `pnpm exec eslint app/catana/components/devCardDisplayUtils.js app/catana/components/DevCardDisplay.js app/catana/components/MobileDevCardButton.js app/catana/components/MobileDevCardTray.js app/catana/components/MobilePlayerCockpit.js`
  - `pnpm exec vitest run app/catana/__tests__/DevCardDisplayGroups.test.js app/catana/__tests__/MobileDevCardButton.source.test.js app/catana/__tests__/MobileDevCardTray.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
  - `git diff --check`

## Acceptance Criteria

- 0 dev cards: no visible dev-card button and resources are not artificially cramped.
- First dev purchase: reveal animation keeps a destination anchor without showing an empty dev slot.
- 1 dev card: stack button opens the tray instead of instantly playing the card.
- 2+ dev cards: button count reflects total owned cards; tray groups by card type.
- Victory Point cards are visible in the tray but not playable.
- Existing desktop dev-card dock behavior remains unchanged.
