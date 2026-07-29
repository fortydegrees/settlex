# SettleHex UI Catalog And Claude Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a current, production-faithful Storybook catalog for SettleHex standard UI, expose real rare states and motion, improve the homepage account-chrome component boundaries, and sync the verified system into Claude Design.

**Architecture:** Storybook renders the existing `app/ui` primitives and focused production components with deterministic, network-free fixtures. Route clients retain orchestration; independently reviewable presentation moves into small components that accept production-shaped state and callbacks. Claude Design consumes the verified Storybook catalog only after local build and browser review pass.

**Tech Stack:** Next.js 13.5, React 18, JavaScript/JSX, Tailwind CSS, Base UI, Storybook 8.6.14 with `@storybook/nextjs`, Vitest 1.6, Storybook interaction tests, Claude CLI `/design-sync`.

## Global Constraints

- Work in a new worktree and branch named `codex/ui-catalog-storybook`, based on current committed `main`; keep `/Users/david/.codex/worktrees/00e0/settlex` read-only as historical reference.
- Do not copy or merge the old atlas wholesale; port only setup or fixture patterns that still match current production code.
- Scope is standard product UI. Exclude board rendering, resources, cards, dice, pieces, gameplay-event animation/audio/haptics, and the full `GameScreen`.
- Stories must use real production components, CSS, copy owners, and state helpers.
- The primary catalog contains only production-valid state combinations. Controls may vary harmless values but must not manufacture impossible states.
- Stories are deterministic and network-free. Do not emulate auth, matchmaking, push, replay, or boardgame.io provider graphs.
- Production components own transitions. Story files trigger motion but do not duplicate it.
- Retain the existing motion tokens `--settlex-ui-duration-fast`, `--settlex-ui-duration-dialog`, `--settlex-ui-ease-standard`, and `--settlex-ui-ease-bounce`; add a token only if repeated use is demonstrated.
- Use rendered behavior tests for new component boundaries and Storybook play tests for visible interaction. Do not add source-grep tests for UI implementation details.
- Treat every touched surviving `*.source.test.js` file as a migration candidate, not an endorsed contract. Map its assertions to behavior-first coverage, delete redundant copy/structure assertions, and replace only genuinely unique runtime behavior before deleting the source test.
- Storybook/browser review owns exact UI copy, CSS, layout, and motion. Vitest may assert an exact response only when that response is itself an external API/runtime contract; do not duplicate the same copy assertion across helpers and components.
- Use pnpm. Keep Storybook on 8.6.14 and pin `webpack@5.101.2` for the current Next 13 integration unless the clean install proves that combination unusable.
- Do not push, deploy, or alter production. Pause for explicit approval immediately before the Claude Design upload.
- Follow `docs/agent/TESTING.md`, `.agents/skills/catana-design/SKILL.md`, `docs/agent/UI_CONTEXT.md`, and `docs/agent/skills/catana-brand/SKILL.md`.

---

## File And Responsibility Map

### Storybook foundation

- `.storybook/main.js` — story discovery, addons, Next.js framework, static assets, and current Next config.
- `.storybook/preview.js` — production global CSS, Catana surface decorator, desktop/mobile viewports, and App Router context.
- `package.json` and `pnpm-lock.yaml` — Storybook scripts and pinned development dependencies.
- `.gitignore` — ignore `storybook-static/`.

### Catalog records and fixtures

- `docs/agent/UI_CATALOG.md` — finite implementation inventory and coverage checklist, not a second prop reference.
- `docs/agent/STORYBOOK.md` — concise commands, scope, story policy, and review workflow.
- `app/catana/dev/storybook/accountFixtures.js` — identity/account fixtures and production-derived match-alert display fixtures.
- `app/catana/dev/storybook/replayFixtures.js` — deterministic replay players, events, and score series.
- `app/catana/dev/storybook/storyDecorators.jsx` — only shared surface/frame decorators that cannot live in `.storybook/preview.js`.

### Homepage presentation boundaries

- `app/catana/matchAlerts/MatchAlertControl.js` — presentational match-alert status/action surface.
- `app/catana/home/SystemAccountMenu.js` — sign-in trigger or account popover, with controlled/uncontrolled open state.
- `app/catana/home/SystemTopChrome.js` — homepage links plus account menu composition.
- `app/catana/home/SearchingModal.js` — matchmaking wait/rescue presentation; no matchmaking calls.
- `app/catana/home/HomeTableClient.js` — retains provider hooks, route actions, board orchestration, and adapters.
- `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.js` — inviter, invitee, and expired friend-invite presentation.
- `app/catana/lobby/[matchID]/MatchPageClient.js` — retains friend-challenge polling, accept/cancel calls, credentials, and navigation.
- `app/account/AccountPageView.js` — provider-free account/profile presentation and local form interaction.
- `app/account/AccountPageClient.js` — retains account/auth fetches and provider calls.
- `app/catana/matchAlerts/matchAlertState.js` — existing display-state owner plus shared human-game pause error copy.
- `app/api/match-alerts/handler.js` — consumes the shared error copy instead of owning a duplicate literal.

### Stories

- `app/ui/Foundations.stories.jsx`
- `app/ui/Button.stories.jsx`
- `app/ui/Fields.stories.jsx`
- `app/ui/Feedback.stories.jsx`
- `app/ui/Overlays.stories.jsx`
- `app/catana/home/SystemAccountMenu.stories.jsx`
- `app/catana/home/SystemTopChrome.stories.jsx`
- `app/catana/home/SearchingModal.stories.jsx`
- `app/catana/lobby/AccountEntryModal.stories.jsx`
- `app/catana/lobby/IdentityModal.stories.jsx`
- `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.stories.jsx`
- `app/account/AccountPageView.stories.jsx`
- `app/catana/matchAlerts/MatchAlertDialog.stories.jsx`
- `app/catana/components/RecoverySurfaces.stories.jsx`
- `app/catana/components/GameOverModal.stories.jsx`
- `app/replays/components/ReplaySurfaces.stories.jsx`
- `app/replays/components/ReplayPanel.stories.jsx`

### Tests and guidance

- `app/catana/__tests__/SystemAccountMenu.test.js` — pure menu-state model and server-rendered sign-in semantics.
- Touched source tests — audit, migrate any unique runtime contracts to behavior-first coverage, then delete.
- `app/catana/matchAlerts/__tests__/matchAlertState.test.js` — production state mapping.
- Existing matchmaking, challenge, match-alert join/provider, and route tests — retain lifecycle behavior while the presentation boundaries move.
- `app/__tests__/api/matchAlertRoutes.test.js` — confirm the API still returns the shared pause message.
- `AGENTS.md` — concise rule routing standard UI work through the catalog.
- `.agents/skills/catana-design/SKILL.md` — add Storybook as executable design evidence.
- `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` — record the meaningful implementation and verification result.

---

### Task 1: Create The Fresh Execution Worktree And Baseline Inventory

**Files:**
- Create: `docs/agent/UI_CATALOG.md`
- Reference only: `/Users/david/.codex/worktrees/00e0/settlex`
- Reference only: `docs/superpowers/specs/2026-07-29-settlehex-ui-catalog-and-claude-design-design.md`

**Interfaces:**
- Consumes: committed `main` and the approved design spec.
- Produces: branch `codex/ui-catalog-storybook` and a row-per-surface coverage checklist used by every later task.

- [ ] **Step 1: Invoke the worktree skill and create the isolated checkout**

Run the `superpowers:using-git-worktrees` skill. From `/Users/david/coding/settlex`, create a worktree from committed `main`:

```bash
git worktree add .worktrees/ui-catalog-storybook -b codex/ui-catalog-storybook main
cd /Users/david/coding/settlex/.worktrees/ui-catalog-storybook
git status --short --branch
```

Expected: branch `codex/ui-catalog-storybook`, no uncommitted files. If that path is already registered, let the worktree skill select another safe path while retaining the branch name.

- [ ] **Step 2: Confirm the old atlas remains reference-only**

```bash
git -C /Users/david/.codex/worktrees/00e0/settlex status --short --branch
git log -1 --oneline codex/storybook-ui-atlas
git rev-list --left-right --count codex/storybook-ui-atlas...main
```

Expected: the old branch and its distance from current `main` are visible. Do not change its files or branch.

- [ ] **Step 3: Write the catalog inventory**

Create `docs/agent/UI_CATALOG.md` with this exact schema and fill every listed row from the current checkout:

```markdown
# SettleHex Standard UI Catalog

This is the implementation checklist for the production-faithful Storybook
catalog. Storybook is the living visual/state reference; this file records
ownership, scope, and coverage only.

| Domain | Surface | Production owner | Appears in | Valid visible states | Copy owner | Motion/interaction | Viewports | Story | Boundary work |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Foundations | Brand foundations | `app/globals.css` | Product-wide | Default; reduced motion | CSS tokens | Token samples | Desktop; mobile | Planned | None |
| Components | Button | `app/ui/Button.js` | Product-wide | Variants; sizes; disabled; sheen | Component children | Hover; press; focus | Both | Planned | None |
| Components | Icon button | `app/ui/IconButton.js` | Product-wide | Variants; sizes; disabled | `aria-label` at call site | Hover; press; tooltip composition | Both | Planned | None |
| Components | Fields and selectors | `app/ui/Input.js`, `Select.js`, `SwatchPicker.js` | Account and setup forms | Empty; populated; disabled; selected | Call site | Focus; selection | Both | Planned | None |
| Components | Feedback | `app/ui/Banner.js`, `Panel.js` | Status and content surfaces | Neutral; danger; title/body/actions | Props | Entry at composition | Both | Planned | None |
| Components | Overlays | `app/ui/Dialog.js`, `AlertDialog.js`, `Popover.js`, `MetaDisclosure.js`, `Tooltip.js` | Product-wide | Open; closed; confirm; destructive | Props | Open; close; dismiss; focus | Both | Planned | None |
| Account & Identity | Account entry | `app/catana/lobby/AccountEntryModal.js` | Homepage/account entry | Sign in; save guest profile; pending; error | Component | Dialog transition | Both | Planned | None |
| Account & Identity | Identity editor | `app/catana/lobby/IdentityModal.js` | Homepage/lobby | New guest; edit guest; edit saved; validation | Component and identity helpers | Dialog; picker selection | Both | Planned | None |
| Account & Identity | Account menu | `app/catana/home/HomeTableClient.js` | Homepage top chrome | Signed out; guest; claimed; alert states; pending; error | Component and match-alert helper | Popover open/close | Both | Planned | Extract |
| Account & Identity | Account/profile page | `app/account/AccountPageClient.js` | `/account` | No profile; guest; claimed; sign-in; sign-up; pending; error | Component | Form state | Both | Planned | Extract view |
| Lobby & Matchmaking | Search/rescue modal | `app/catana/home/HomeTableClient.js` | Homepage matchmaking | Waiting; alert rescue; Puffer rescue; found; Puffer starting | Component and rescue helper | Overlay/state change | Both | Planned | Extract |
| Lobby & Matchmaking | Friend invite | `app/catana/lobby/[matchID]/MatchPageClient.js` | Pending challenge route | Inviter; invitee; expired; pending; error | Component and challenge helpers | Copy; join; cancel | Both | Planned | Extract |
| Alerts & Recovery | Match-alert control | `app/catana/home/HomeTableClient.js` | Account menu/search rescue | Off; active; paused; blocked; unsupported; install required; pending; error | `matchAlertState.js` | Action feedback | Both | Planned | Extract |
| Alerts & Recovery | Match-alert dialog | `app/catana/matchAlerts/MatchAlertDialog.js` | Alert deep link | Checking; confirm; Puffer handoff; stale; error | Component | Dialog/action transition | Both | Planned | None |
| Alerts & Recovery | Recovery surfaces | `StatusBanner`, `GlobalReconnectBanner`, `IdlePromptModal`, `ResignConfirmDialog` | Match lifecycle | Reconnecting; idle; confirm; error | Production components/helpers | Banner/dialog | Both | Planned | Compose provider-free leaves |
| Postgame & Replay | Game over | `app/catana/components/GameOverModal.js` | Completed match | Winner; loser; archived/replay actions | Display model/component | Dialog/actions | Both | Planned | None |
| Postgame & Replay | Replay controls | `app/replays/components/ReplayStepControls.jsx` | Replay | Start; middle; end; autoplay state | Component | Button interaction | Both | Planned | None |
| Postgame & Replay | Replay status | `app/replays/components/ReplayStatusPage.jsx` | Replay loading/error | Loading; unavailable; invalid; error | Component | Status change | Both | Planned | None |
| Postgame & Replay | Replay score chart | `app/replays/components/ReplayScoreChart.jsx` | Replay panel | Multi-player; selected event; keyboard seek | Timeline helpers/component | Hover; keyboard seek | Both | Planned | None |
| Postgame & Replay | Replay panel | `app/replays/components/ReplayPanel.jsx` | Replay | Desktop open; desktop collapsed; mobile closed; mobile open | Component | Rail/drawer transition | Both | Planned | None |
```

For each row, replace `Planned` with `Covered`, `Excluded`, or `Needs boundary work` as implementation progresses. Add a row only when a current production file proves another in-scope surface exists.

- [ ] **Step 4: Review inventory against exports and route-local components**

```bash
rg -n "^export (function|const|default)" app/ui app/catana/lobby app/catana/matchAlerts app/catana/components app/replays/components
rg -n "^function [A-Z]" app/catana/home/HomeTableClient.js app/catana/lobby/AccountPageClient.js
git diff -- docs/agent/UI_CATALOG.md
```

Expected: every in-scope shared primitive and independently meaningful standard-UI surface has a row; gameplay-only pieces remain absent.

- [ ] **Step 5: Commit the reviewed inventory**

```bash
git add docs/agent/UI_CATALOG.md
git commit -m "docs: inventory SettleHex standard UI"
```

### Task 2: Install And Verify The Storybook Foundation

**Files:**
- Create: `.storybook/main.js`
- Create: `.storybook/preview.js`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: Next.js config, `app/globals.css`, `CATANA_TABLE_BACKGROUND`, and public assets.
- Produces: `pnpm storybook` on port 6006 and `pnpm build-storybook`.

- [ ] **Step 1: Record the expected missing-command baseline**

```bash
pnpm storybook
```

Expected before implementation: failure because the script or binary is not present.

- [ ] **Step 2: Add the pinned development dependencies**

```bash
pnpm add -D storybook@8.6.14 @storybook/nextjs@8.6.14 @storybook/addon-essentials@8.6.14 @storybook/addon-a11y@8.6.14 @storybook/test@8.6.14 webpack@5.101.2
```

Expected: `package.json` and `pnpm-lock.yaml` update; production dependencies do not change.

- [ ] **Step 3: Add scripts and ignore output**

Set these exact scripts in `package.json`:

```json
{
  "scripts": {
    "prestorybook": "pnpm -C game-core build",
    "storybook": "storybook dev -p 6006",
    "prebuild-storybook": "pnpm -C game-core build",
    "build-storybook": "storybook build"
  }
}
```

Append this exact line to `.gitignore`:

```gitignore
storybook-static/
```

- [ ] **Step 4: Add current Storybook configuration**

Create `.storybook/main.js` using the already-proven Next 13 configuration:

```js
/** @type {import("@storybook/nextjs").StorybookConfig} */
const config = {
  stories: ["../app/**/*.stories.@(js|jsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/nextjs",
    options: {
      nextConfigPath: "../next.config.js",
    },
  },
  staticDirs: ["../public"],
  docs: {
    autodocs: "tag",
  },
};

export default config;
```

Create `.storybook/preview.js`:

```js
import React from "react";
import "../app/globals.css";
import { CATANA_TABLE_BACKGROUND } from "../app/catana/theme/backgrounds";

const preview = {
  decorators: [
    (Story, context) => {
      const isFullscreen = context.parameters.layout === "fullscreen";

      return React.createElement(
        "div",
        {
          className: "min-h-screen text-slate-800",
          style: {
            background: CATANA_TABLE_BACKGROUND,
            fontFamily:
              "Outfit, ui-rounded, \"Nunito Sans\", system-ui, sans-serif",
            padding: isFullscreen ? 0 : "2rem",
          },
        },
        React.createElement(Story)
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        catanaDesktop: {
          name: "Catana desktop (1440 × 900)",
          styles: { width: "1440px", height: "900px" },
        },
        catanaMobile: {
          name: "Catana mobile (390 × 844)",
          styles: { width: "390px", height: "844px" },
        },
      },
    },
  },
};

export default preview;
```

- [ ] **Step 5: Add one smoke story**

Create `app/ui/Foundations.stories.jsx` initially:

```jsx
export default {
  title: "Foundations/Smoke",
  parameters: { layout: "fullscreen" },
};

export const ProductionCssLoaded = {
  render: () => (
    <div className="p-8 font-sans text-slate-900">
      <div className="rounded-[1.4rem] border border-white/60 bg-white/75 p-6 shadow-xl">
        SettleHex Storybook
      </div>
    </div>
  ),
};
```

- [ ] **Step 6: Run the static build**

```bash
CI=1 pnpm build-storybook
```

Expected: Storybook static build completes and writes ignored `storybook-static/`.

- [ ] **Step 7: Commit the foundation**

```bash
git add .storybook .gitignore package.json pnpm-lock.yaml app/ui/Foundations.stories.jsx
git commit -m "build: add Storybook UI catalog foundation"
```

### Task 3: Catalog Foundations And Shared UI Primitives

**Files:**
- Modify: `app/ui/Foundations.stories.jsx`
- Create: `app/ui/Button.stories.jsx`
- Create: `app/ui/Fields.stories.jsx`
- Create: `app/ui/Feedback.stories.jsx`
- Create: `app/ui/Overlays.stories.jsx`
- Modify: `docs/agent/UI_CATALOG.md`

**Interfaces:**
- Consumes: all production exports from `app/ui`, CSS variables from `app/globals.css`, and Storybook `fn`.
- Produces: browseable foundations and baseline coverage for every in-scope `app/ui` component except `cn`.

- [ ] **Step 1: Replace the smoke story with production foundation samples**

Use a `Foundations/Visual language` story with named sections for:

```js
export const FOUNDATION_SECTIONS = Object.freeze([
  "Color and semantic roles",
  "Typography hierarchy",
  "Spacing and density",
  "Radii, borders, glass, and shadows",
  "Motion tokens",
  "Layering",
]);
```

Render swatches with the actual Tailwind/CSS classes used by `Button`, `Panel`, `Dialog`, `Popover`, and `Banner`. Read the four motion token values with CSS:

```jsx
const MotionToken = ({ name }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <code>{name}</code>
    <div
      className="mt-2 h-2 w-20 rounded-full bg-sky-500 transition-transform hover:translate-x-8 motion-reduce:transition-none"
      style={{
        transitionDuration: `var(${name})`,
        transitionTimingFunction: "var(--settlex-ui-ease-standard)",
      }}
    />
  </div>
);
```

Do not hard-code a second palette or motion taxonomy.

- [ ] **Step 2: Add canonical action stories**

Create `app/ui/Button.stories.jsx` with:

```jsx
import { BellAlertIcon, PlusIcon } from "@heroicons/react/24/outline";
import { fn } from "@storybook/test";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Tooltip, TooltipProvider } from "./Tooltip";

export default {
  title: "Components/Actions/Button",
  component: Button,
  args: { children: "Find a table", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "accent", "ghost", "subtle", "danger"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
};

export const Playground = { args: { variant: "primary", size: "md" } };

export const ProductionVariants = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {["primary", "secondary", "accent", "ghost", "subtle", "danger"].map((variant) => (
        <Button key={variant} variant={variant}>{variant}</Button>
      ))}
    </div>
  ),
};

export const DisabledAndSheen = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button disabled>Pending</Button>
      <Button variant="accent" sheen>Play online</Button>
    </div>
  ),
};

export const IconButtons = {
  render: () => (
    <TooltipProvider>
      <div className="flex gap-3">
        <Tooltip content="Enable match alerts">
          <IconButton aria-label="Enable match alerts"><BellAlertIcon /></IconButton>
        </Tooltip>
        <IconButton aria-label="Add player" variant="secondary"><PlusIcon /></IconButton>
      </div>
    </TooltipProvider>
  ),
};
```

- [ ] **Step 3: Add fields and selectors**

Create `app/ui/Fields.stories.jsx`. Default metadata targets `Input`; named stories render:

- `TextInput`: empty and populated.
- `DisabledFields`: disabled `Input` and `Select`.
- `SelectField`: production-like duel type choices.
- `PlayerColour`: `SwatchPicker` using the current player color options and local React state.

The color story must import its option source from current production identity/color data rather than duplicating color names or gradients.

- [ ] **Step 4: Add feedback and container stories**

Create `app/ui/Feedback.stories.jsx`. Default metadata targets `Banner`; named stories render:

- `NeutralBanner`
- `DangerBanner`
- `BannerWithActions`
- `PanelWithHeaderAction`

Use exact component props and short production-shaped content. Include a `role="alert"` only where the production component does.

- [ ] **Step 5: Add interactive overlay stories**

Create `app/ui/Overlays.stories.jsx` with controlled wrapper components for:

- `Dialog`
- `AlertDialog`
- `Popover`
- `MetaDisclosure`
- `Tooltip`

Each wrapper owns only `open` state. Use Storybook `play` functions to click the trigger, assert the visible title/menu, close with Escape, and verify focus returns to the trigger:

```jsx
import { expect, fn, userEvent, within } from "@storybook/test";

export const AccountPopoverMotion = {
  render: () => <PopoverHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open example menu" });
    await userEvent.click(trigger);
    await expect(canvas.getByRole("menu", { name: "Example menu" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
  },
};
```

Do not assert millisecond timing or CSS implementation text.

- [ ] **Step 6: Build and update coverage**

```bash
CI=1 pnpm build-storybook
```

Expected: all foundation/component stories index and build. Mark the Foundations and Components rows `Covered` in `docs/agent/UI_CATALOG.md`.

- [ ] **Step 7: Commit primitive coverage**

```bash
git add app/ui docs/agent/UI_CATALOG.md
git commit -m "feat: catalog shared SettleHex UI primitives"
```

### Task 4: Extract Match Alerts And Homepage Account Chrome

**Files:**
- Create: `app/catana/matchAlerts/MatchAlertControl.js`
- Create: `app/catana/home/systemAccountMenuModel.js`
- Create: `app/catana/home/SystemAccountMenu.js`
- Create: `app/catana/home/SystemTopChrome.js`
- Modify: `app/catana/home/HomeTableClient.js`
- Modify: `app/catana/matchAlerts/matchAlertState.js`
- Modify: `app/api/match-alerts/handler.js`
- Create: `app/catana/__tests__/SystemAccountMenu.test.js`
- Modify: `app/__tests__/api/matchAlertRoutes.test.js`
- Delete or replace: `app/catana/__tests__/HomeTableClient.matchmakingRescue.source.test.js`

**Interfaces:**
- Consumes: `getMatchAlertDisplayState`, `Popover`, `Button`, identity/color data, and homepage callbacks.
- Produces:
  - `HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE: string`
  - `getMatchAlertStatusLabel(status: string): string`
  - `MatchAlertControl({ display, loading, error, surface, onAction })`
  - `SystemAccountMenu({ identity, accountStatus, hasIdentity, matchAlertDisplay, matchAlertLoading, matchAlertError, onMatchAlertAction, open, defaultOpen, onOpenChange, ...callbacks })`
  - `SystemTopChrome` with the same account/menu inputs plus homepage links.

- [ ] **Step 1: Add the shared copy and label owner**

Add to `app/catana/matchAlerts/matchAlertState.js`:

```js
export const HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE =
  "Match alerts stay paused until your human game ends.";

const MATCH_ALERT_STATUS_LABELS = Object.freeze({
  off: "Enable",
  active: "On",
  paused: "Paused during game",
  blocked: "Blocked",
  unsupported: "Unsupported",
  unconfigured: "Unavailable",
  install_required: "Home Screen required",
});

export const getMatchAlertStatusLabel = (status) =>
  MATCH_ALERT_STATUS_LABELS[status] ?? "Unavailable";
```

Import `HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE` in `app/api/match-alerts/handler.js` and replace only the matching response literal. Keep the existing route test's exact response assertion.

- [ ] **Step 2: Confirm the existing behavior contracts before extraction**

Run the existing `matchAlertState` and match-alert route tests. They cover the
state machine and the externally visible API error respectively. Do not add
Vitest assertions for compact labels or duplicate the human-game copy in a
component test; named stories and browser review cover those presentation
branches.

- [ ] **Step 3: Implement the presentational alert control**

Move the current markup from `HomeTableClient.js` to `app/catana/matchAlerts/MatchAlertControl.js` with this complete implementation:

```jsx
"use client";

import { BellAlertIcon } from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";
import { getMatchAlertStatusLabel } from "./matchAlertState";

export function MatchAlertControl({
  display,
  loading = false,
  error = "",
  surface = "modal",
  onAction = () => {},
}) {
  const isMenu = surface === "menu";
  const statusLabel = getMatchAlertStatusLabel(display?.status);

  return (
    <div
      className={
        isMenu
          ? "border-t border-slate-200/72 px-2.5 py-2.5"
          : "rounded-[1rem] border border-white/55 bg-white/42 p-3 text-left"
      }
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.74rem] bg-sky-100/72 text-slate-700">
          <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.78rem] font-bold text-slate-900">
            Match alerts
          </span>
          <span className="block text-[0.68rem] font-semibold text-slate-500">
            {statusLabel}
          </span>
        </span>
        {display?.action ? (
          <Button
            variant={isMenu ? "ghost" : "secondary"}
            size="sm"
            className={
              isMenu
                ? "min-h-8 px-2.5 py-1 text-xs"
                : "min-h-9 px-3 py-1.5 text-xs"
            }
            disabled={loading}
            onClick={() => void onAction(display.action)}
          >
            {display.actionLabel}
          </Button>
        ) : null}
      </div>
      {!isMenu || display?.status === "install_required" ? (
        <p className="mt-2 text-[0.7rem] font-medium leading-relaxed text-slate-600">
          {display?.detail}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-2 text-[0.7rem] font-semibold leading-relaxed text-rose-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Write the account-menu model test**

Create `app/catana/__tests__/SystemAccountMenu.test.js`. Test the available
production actions, not their current copy:

```js
import { describe, expect, it } from "vitest";
import { getSystemAccountMenuItems } from "../home/systemAccountMenuModel";

describe("getSystemAccountMenuItems", () => {
  it("returns only production guest actions", () => {
    expect(getSystemAccountMenuItems("guest").map((item) => item.action)).toEqual([
      "saveProfile",
      "identity",
      "signOut",
    ]);
  });

  it("returns only production claimed-account actions", () => {
    expect(getSystemAccountMenuItems("claimed").map((item) => item.action)).toEqual([
      "account",
      "identity",
      "signOut",
    ]);
  });
});
```

The signed-out visible label and button semantics belong to the named Storybook
state and its interaction assertion in Task 5.

- [ ] **Step 7: Extract the account menu with a controllable open state**

Create `app/catana/home/systemAccountMenuModel.js` with this pure menu model,
and import it from `SystemAccountMenu.js`:

```js
export const getSystemAccountMenuItems = (accountStatus) =>
  accountStatus !== "claimed"
    ? [
        { label: "Save profile", icon: UserCircleIcon, action: "saveProfile" },
        { label: "Edit profile", icon: PencilSquareIcon, action: "identity" },
        { label: "Sign out", icon: ArrowRightOnRectangleIcon, action: "signOut" },
      ]
    : SYSTEM_ACCOUNT_MENU_ITEMS;
```

Use this controlled/uncontrolled contract inside `SystemAccountMenu`:

```js
const [internalOpen, setInternalOpen] = useState(defaultOpen);
const isControlled = open !== undefined;
const isOpen = isControlled ? open : internalOpen;
const setIsOpen = (nextOpen) => {
  if (!isControlled) setInternalOpen(nextOpen);
  onOpenChange?.(nextOpen);
};
```

Render the new alert control as:

```jsx
<MatchAlertControl
  display={matchAlertDisplay}
  loading={matchAlertLoading}
  error={matchAlertError}
  surface="menu"
  onAction={onMatchAlertAction}
/>
```

Keep the current `Sign in` button path and current guest/claimed action routing.

- [ ] **Step 8: Extract top chrome and reconnect the route adapter**

Move `HOME_TOP_LINKS` and `SystemTopChrome` to `app/catana/home/SystemTopChrome.js`. In `HomeTableClient.js`, adapt the provider object:

```js
const handleMatchAlertAction = (action) => {
  if (action === "enable") return matchAlerts.enable();
  if (action === "disable") return matchAlerts.disable();
  if (action === "resume") return matchAlerts.resume();
  return Promise.resolve();
};
```

Pass:

```jsx
<SystemTopChrome
  identity={identity}
  accountStatus={accountStatus}
  hasIdentity={hasIdentity}
  matchAlertDisplay={matchAlerts.display}
  matchAlertLoading={matchAlerts.loading}
  matchAlertError={matchAlerts.error}
  onMatchAlertAction={handleMatchAlertAction}
  onEditIdentity={actions.openIdentity}
  onOpenAccount={actions.goToAccount}
  onOpenSignIn={actions.openSignIn}
  onOpenSaveProfile={actions.openSaveProfile}
  onSignOut={actions.signOut}
/>
```

Remove the old local `MATCH_ALERT_STATUS_LABELS`, `handleMatchAlertAction`, `MatchAlertControl`, `SystemAccountMenu`, and `SystemTopChrome`.

- [ ] **Step 9: Migrate brittle extraction assertions and run focused tests**

In `HomeTableClient.matchmakingRescue.source.test.js`, delete the match-alert and
account-menu assertions about copy, component location, imports, and local
handlers. Map any unique behavior to existing state/handler tests; do not replace
the deleted checks with new source assertions. Task 6 completes the audit for the
remaining search-modal assertions.

```bash
pnpm exec vitest run \
  app/catana/matchAlerts/__tests__/matchAlertState.test.js \
  app/catana/__tests__/SystemAccountMenu.test.js \
  app/__tests__/api/matchAlertRoutes.test.js \
  --reporter=dot
```

Expected: all focused tests pass, including the existing API response assertion.

- [ ] **Step 10: Commit the production boundary cleanup**

```bash
git add app/api/match-alerts/handler.js app/__tests__/api/matchAlertRoutes.test.js \
  app/catana/home app/catana/matchAlerts app/catana/__tests__
git commit -m "refactor: extract homepage account chrome"
```

### Task 5: Add Production-Valid Account And Alert Stories

**Files:**
- Create: `app/catana/dev/storybook/accountFixtures.js`
- Create: `app/catana/home/SystemAccountMenu.stories.jsx`
- Create: `app/catana/home/SystemTopChrome.stories.jsx`
- Modify: `docs/agent/UI_CATALOG.md`

**Interfaces:**
- Consumes: `getMatchAlertDisplayState`, `HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE`, `SystemAccountMenu`, and `SystemTopChrome`.
- Produces: deterministic named stories for every reachable account/match-alert combination, including the reported rare error state.

- [ ] **Step 1: Add production-derived account fixtures**

Create `app/catana/dev/storybook/accountFixtures.js`:

```js
import {
  HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE,
  getMatchAlertDisplayState,
} from "../../matchAlerts/matchAlertState";

const supported = { supported: true, permission: "granted" };

export const guestIdentity = Object.freeze({
  name: "BoldTraderYM",
  emoji: "😉",
  color: "teal",
});

export const savedIdentity = Object.freeze({
  name: "HarbourFox",
  emoji: "🦊",
  color: "orange",
});

export const matchAlertFixtures = Object.freeze({
  off: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "off" },
    hasSubscription: false,
  }),
  active: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "active" },
    hasSubscription: true,
  }),
  pausedResumable: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "paused" },
    currentGame: null,
  }),
  pausedHumanGame: getMatchAlertDisplayState({
    configured: true,
    capability: supported,
    preference: { state: "paused" },
    currentGame: { opponentType: "human" },
  }),
  blocked: getMatchAlertDisplayState({
    configured: true,
    capability: { supported: true, permission: "denied" },
    preference: { state: "off" },
  }),
  unsupported: getMatchAlertDisplayState({
    configured: true,
    capability: { supported: false, reason: "unsupported" },
  }),
  installRequired: getMatchAlertDisplayState({
    configured: true,
    capability: { supported: false, reason: "install_required" },
    enableAttempted: true,
  }),
  unconfigured: getMatchAlertDisplayState({ configured: false }),
});

export const matchAlertErrors = Object.freeze({
  humanGamePaused: HUMAN_GAME_MATCH_ALERT_PAUSE_MESSAGE,
});
```

- [ ] **Step 2: Add account menu harness and named stories**

Create `app/catana/home/SystemAccountMenu.stories.jsx`. Use one harness with `fn()` callbacks and `defaultOpen: true`. Export exactly:

```js
export const SignedOut = {};
export const GuestAlertsOff = {};
export const GuestAlertsPausedResumeAvailable = {};
export const GuestAlertsPausedHumanGameActive = {};
export const GuestResumeFailed = {};
export const SavedAccountAlertsActive = {};
export const SavedAccountNotificationsBlocked = {};
export const SavedAccountInstallRequired = {};
export const AlertActionPending = {};
```

Map each story to the corresponding production fixture. `GuestResumeFailed` uses `pausedResumable` plus `matchAlertErrors.humanGamePaused`; this reproduces the screenshot's reachable transient state without copying the text.

- [ ] **Step 3: Add interaction assertions for exact visible copy**

Give `GuestResumeFailed` this play flow:

```jsx
play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body);
  await expect(screen.getByText("Playing as guest")).toBeVisible();
  await expect(screen.getByText("BoldTraderYM")).toBeVisible();
  await expect(screen.getByText("Paused during game")).toBeVisible();
  await expect(screen.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(
    screen.getByRole("alert")
  ).toHaveTextContent("Match alerts stay paused until your human game ends.");
}
```

Give `GuestAlertsPausedHumanGameActive` an assertion that `Resume` is absent. Give `AlertActionPending` an assertion that the visible action is disabled. Set the file title to `Product Patterns/Account & Identity/Account Menu`.

Disable controls for `accountStatus`, `hasIdentity`, `matchAlertDisplay`, `matchAlertLoading`, and `matchAlertError`; those values are fixed by named production stories. Allow controls only for harmless identity fields such as name, emoji, and color.

- [ ] **Step 4: Add composed homepage chrome stories**

Create `app/catana/home/SystemTopChrome.stories.jsx` with title `Composed Surfaces/Account & Identity/Homepage Top Chrome`. Render the real `SystemTopChrome` over `CATANA_TABLE_BACKGROUND` and export:

- `SignedOut`
- `GuestResumeFailed`
- `ClaimedAlertsActive`
- `Mobile`

Use the same `accountFixtures.js` values and callback spies. `Mobile` uses `viewport.defaultViewport = "catanaMobile"`. Do not duplicate account/menu JSX in the composition.

- [ ] **Step 5: Build and update inventory**

```bash
CI=1 pnpm build-storybook
```

Expected: account stories build with no network calls. Mark Account menu and Match-alert control `Covered`.

- [ ] **Step 6: Commit the account catalog**

```bash
git add app/catana/dev/storybook/accountFixtures.js \
  app/catana/home/SystemAccountMenu.stories.jsx \
  app/catana/home/SystemTopChrome.stories.jsx docs/agent/UI_CATALOG.md
git commit -m "feat: catalog account and match-alert states"
```

### Task 6: Catalog Account Entry, Identity, And Matchmaking

**Files:**
- Create: `app/catana/home/SearchingModal.js`
- Modify: `app/catana/home/HomeTableClient.js`
- Create: `app/catana/home/SearchingModal.stories.jsx`
- Create: `app/catana/lobby/AccountEntryModal.stories.jsx`
- Create: `app/catana/lobby/IdentityModal.stories.jsx`
- Create: `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Create: `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.stories.jsx`
- Create: `app/account/AccountPageView.js`
- Modify: `app/account/AccountPageClient.js`
- Create: `app/account/AccountPageView.stories.jsx`
- Delete or replace: `app/catana/__tests__/HomeTableClient.matchmakingRescue.source.test.js`
- Delete or replace: `app/catana/__tests__/MatchPageClient.friendChallenge.source.test.js`
- Modify: `docs/agent/UI_CATALOG.md`

**Interfaces:**
- Consumes: current modal props, `getMatchmakingRescueStage`, extracted `MatchAlertControl`, identity helpers, and action spies.
- Produces: provider-free `SearchingModal`, `PendingFriendChallengeScreen`, `AccountPageView`, and named account/lobby states.

- [ ] **Step 1: Move the search modal without changing its behavior**

Create `app/catana/home/SearchingModal.js` with the current component. Its exact public props are `searchState`, `searchElapsedSeconds`, `matchAlertDisplay`, `matchAlertLoading = false`, `matchAlertError = ""`, `isPufferTransitionPending`, `onMatchAlertAction`, `onCancel`, and `onPlayPuffer`.

Replace the old `matchAlerts` object use with:

```jsx
<MatchAlertControl
  display={matchAlertDisplay}
  loading={matchAlertLoading}
  error={matchAlertError}
  onAction={onMatchAlertAction}
/>
```

Keep local `rescueExpanded` UI state because it belongs to the view. Keep matchmaking/network actions in `HomeTableClient`.

- [ ] **Step 2: Reconnect the route and migrate the source assertions**

Pass the same match-alert adapter from Task 4. Map the remaining
`HomeTableClient.matchmakingRescue.source.test.js` assertions to
`matchmakingRescue.test.js` and `useLobbyHomeActions.matchmaking.test.js`.
Delete copy, component-location, and local-state assertions. Add a behavior
replacement only for a unique runtime contract, then delete the source test.

```bash
pnpm exec vitest run \
  app/catana/matchmaking/__tests__/matchmakingRescue.test.js \
  app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js \
  --reporter=dot
```

Expected: behavior coverage passes without reading `HomeTableClient.js`.

- [ ] **Step 3: Add production matchmaking states**

Create `SearchingModal.stories.jsx` with exact named stories and inputs:

| Story | `searchState` | Seconds | Puffer pending | Required visible state |
| --- | --- | ---: | --- | --- |
| `FindingTable` | `{ phase: "searching", startedAt: 1 }` | 5 | false | `Finding a table`, `0:05`, Cancel |
| `AlertRescueAvailable` | same | 15 | false | beta explanation, match alerts, Keep waiting |
| `PufferRescueAvailable` | same | 35 | false | match alerts, Keep waiting, Play Puffer |
| `MatchFound` | `{ phase: "matchFound", startedAt: 1 }` | 36 | false | `Match found`, `Loading board...` |
| `StartingPuffer` | null | 0 | true | `Starting Puffer`, `Setting up a bot duel...` |

Derive the match-alert display from `matchAlertFixtures.off`; use `fn()` callbacks.
Disable free-form controls for `searchState`, elapsed time, and transition state; the named stories own those valid combinations.

- [ ] **Step 4: Port current account-entry stories**

Create `AccountEntryModal.stories.jsx` with this base:

```jsx
import { expect, fn, userEvent, within } from "@storybook/test";
import { AccountEntryModal } from "./AccountEntryModal";

const callbacks = {
  onClose: fn(),
  onSwitchToAuth: fn(),
  onPlayUsernameSubmit: fn(),
  onEmailSignIn: fn(),
  onEmailSignUp: fn(),
  onSignInProvider: fn(),
  onContinueAsGuest: fn(),
};

export default {
  title: "Product Patterns/Account & Identity/Account Entry",
  component: AccountEntryModal,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    authOptions: {
      emailPassword: true,
      socialProviders: ["google", "discord"],
    },
    ...callbacks,
  },
};

export const SignInOrGuest = { args: { mode: "auth-first" } };
export const SaveGuestProfile = { args: { mode: "save-profile" } };
export const ChooseOnlineIdentity = {
  args: {
    mode: "play-username",
    intent: "online",
    identity: { name: "BoldTraderYM", emoji: "😉", color: "teal" },
  },
};
export const ChooseFriendIdentity = {
  args: { ...ChooseOnlineIdentity.args, intent: "friend" },
};
```

Add `MissingCredentials` by rendering `mode: "auth-first"`, clicking `Sign in` with blank fields, and asserting the component-owned text `Enter an email and password.` Add `EmailSubmitting` with `onEmailSignIn` returning a never-resolving promise; fill both fields, click `Sign in`, and assert `Working...`. Do not invoke a real auth provider.

- [ ] **Step 5: Port current identity stories**

Create `IdentityModal.stories.jsx` with the current reachable states:

```jsx
import { fn, userEvent, within } from "@storybook/test";
import { EmojiPicker, IdentityModal } from "./IdentityModal";

export default {
  title: "Product Patterns/Account & Identity/Identity",
  component: IdentityModal,
  parameters: { layout: "fullscreen" },
};

export const SuggestedIdentity = {
  args: { onSubmit: fn(), onClose: fn() },
};

export const ExistingIdentity = {
  args: {
    initialName: "BoldTraderYM",
    initialEmoji: "😉",
    initialColor: "teal",
    onSubmit: fn(),
    onClose: fn(),
  },
};

export const EmptyName = {
  args: { ...ExistingIdentity.args },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.clear(await screen.findByLabelText("Player name"));
  },
};

export const EmojiBrowser = {
  render: () => (
    <EmojiPicker
      value="😉"
      onChange={fn()}
      colorGradient="from-teal-300 to-teal-600"
    />
  ),
};

export const Mobile = {
  ...ExistingIdentity,
  parameters: { viewport: { defaultViewport: "catanaMobile" } },
};
```

The modal itself imports production `EMOJI_OPTIONS` and player colors; the story must not redefine those option lists.

- [ ] **Step 6: Extract and catalog the friend-invite screen**

Move `ChallengeExpiryCountdown`, `ChallengeSeat`, `ChallengeStatusBanner`, and `PendingFriendChallengeScreen` unchanged from `MatchPageClient.js` into `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.js`. Export only `PendingFriendChallengeScreen`, with exact props `mode`, `matchID`, `challengeUrl`, `match`, `challengeState`, `playerName`, `setPlayerName`, `joinPending`, `cancelPending`, `isLoadingMatch`, `error`, `onJoin`, `onCancel`, `onRefresh`, and `onBackToLobby`.

The file imports `sanitizeDisplayName`, `CATANA_TABLE_BACKGROUND`, `Banner`, `Button`, `Input`, and `Panel`. `MatchPageClient` retains `resolveFriendChallengeState`, polling, credentials, accept/cancel requests, and navigation, and imports the extracted screen.

Create `PendingFriendChallengeScreen.stories.jsx` with title `Composed Surfaces/Lobby & Matchmaking/Friend Challenge` and this fixture:

```js
const challengeState = {
  status: "pending",
  inviterSeatId: "0",
  inviteeSeatId: "1",
  expiresAt: "2099-01-01T00:00:00.000Z",
};
const match = {
  players: [
    { id: 0, name: "HarbourFox" },
    { id: 1, name: null },
  ],
};
const baseArgs = {
  matchID: "storybook-friend-duel",
  challengeUrl: "/g/storybook-friend-duel",
  match,
  challengeState,
  playerName: "BoldTraderYM",
  setPlayerName: fn(),
  joinPending: false,
  cancelPending: false,
  isLoadingMatch: false,
  error: "",
  onJoin: fn((event) => event.preventDefault()),
  onCancel: fn(),
  onRefresh: fn(),
  onBackToLobby: fn(),
};
```

Export `Inviter`, `Invitee`, `InviteeJoining`, `Expired`, and `ChallengeError`. The pending variants alter only `mode`, `joinPending`, `cancelPending`, or `error`. Do not invoke accept/cancel APIs.

- [ ] **Step 7: Extract and catalog the account/profile view**

Create `app/account/AccountPageView.js` by moving all current rendered account markup and local form state out of `AccountPageClient`. Its exact props are `account`, `authOptions = { emailPassword: true, socialProviders: [] }`, `onEmailSignIn`, `onEmailSignUp`, and `onSignInProvider`.

The view retains `authMode`, `email`, `password`, `statusMessage`, and `isSubmitting`; it calls `onEmailSignIn({ email, password })`, `onEmailSignUp({ email, password })`, or `onSignInProvider(provider)`. Replace the page's native inputs/buttons with the canonical `Input` and `Button` components while preserving visible copy and layout. Export:

```js
export function getAccountProfileCopy(account) {
  if (!account) {
    return {
      title: "No profile yet",
      description:
        "Create a profile from the home table, then connect a provider here.",
    };
  }
  if (account.status === "claimed") {
    return {
      title: account.currentUsername,
      description: "Your profile is connected to a sign-in method.",
    };
  }
  return {
    title: account.currentUsername,
    description:
      "You are playing as a guest. Connect a provider to keep this profile across devices.",
  };
}
```

`AccountPageClient` retains `refreshAccount`, the two option/account fetches, `authClient`, provider redirect, and account refresh after email auth. It passes network callbacks into `AccountPageView`.

Create `AccountPageView.stories.jsx` with title `Composed Surfaces/Account & Identity/Account Page` and stories `NoProfile`, `GuestProfile`, `ClaimedProfile`, `MissingCredentials`, `EmailSubmitting`, and `Mobile`. Use callback spies or a never-resolving promise; do not call `authClient` or `fetch`.

- [ ] **Step 8: Audit the touched source tests and run focused behavior tests**

For `HomeTableClient.matchmakingRescue.source.test.js` and
`MatchPageClient.friendChallenge.source.test.js`, map every assertion to the
existing matchmaking/challenge helper, handler, or route tests. Delete copy,
component-location, import, and local-state assertions. If a unique lifecycle
contract remains, add the smallest behavior-first replacement and then delete
the source test; otherwise delete it outright.

Run the affected matchmaking, pending-friend-challenge, route, and any new
rendered interaction tests. Exact account and friend-challenge copy is verified
through the named stories and browser pass, not a pure-copy Vitest helper.

- [ ] **Step 9: Build, review both viewports, and commit**

```bash
CI=1 pnpm build-storybook
```

Expected: no provider/network error. Mark Account entry, Identity editor, Account/profile page, Search/rescue modal, and Friend invite `Covered`.

```bash
git add app/account app/catana/home app/catana/lobby app/catana/__tests__ \
  docs/agent/UI_CATALOG.md
git commit -m "feat: catalog account entry and matchmaking UI"
```

### Task 7: Catalog Alerts, Recovery, And Postgame Surfaces

**Files:**
- Create: `app/catana/matchAlerts/MatchAlertDialog.stories.jsx`
- Create: `app/catana/components/RecoverySurfaces.stories.jsx`
- Create: `app/catana/components/GameOverModal.stories.jsx`
- Modify: `app/catana/matchAlerts/MatchAlertDialog.js`
- Delete or replace: `app/catana/matchAlerts/__tests__/MatchAlertDialog.source.test.js`
- Modify: `docs/agent/UI_CATALOG.md`

**Interfaces:**
- Consumes: real production components and their pure display helpers.
- Produces: named provider-free stories for copy, actions, and dialog/banner motion.

- [ ] **Step 1: Extract the match-alert dialog copy model**

Add to `app/catana/matchAlerts/MatchAlertDialog.js`:

```js
export function getMatchAlertDialogCopy({ state, alert, currentGame }) {
  const seekerName = alert?.seekerName || "Someone";
  if (state === "confirm" || state === "joining") {
    return {
      title: `${seekerName} is looking for a duel`,
      description:
        currentGame?.opponentType === "bot"
          ? `Leave your Puffer game and join ${seekerName}?`
          : "Take the open seat?",
    };
  }
  if (state === "stale") {
    return {
      title: "That table has already filled",
      description:
        "Someone else got there first. Match alerts are still on, or we can find you another duel.",
    };
  }
  if (state === "error") {
    return {
      title: "We couldn’t join that table",
      description: "Check your connection, or look for another open duel.",
    };
  }
  return {
    title: "Checking that table…",
    description: "Making sure the seat is still open.",
  };
}
```

Replace the component's conditional title/description block with:

```js
const { title, description } = getMatchAlertDialogCopy({
  state,
  alert,
  currentGame,
});
```

Do not add a table of exact-title Vitest assertions. The named Storybook states
below are the executable copy catalog.

- [ ] **Step 2: Add match-alert dialog stories**

Create stories:

- `CheckingSeat`
- `JoinOpenSeat`
- `LeavePufferAndJoin`
- `TableAlreadyFilled`
- `JoinFailed`

Construct the existing `alert` inputs:

```js
const openAlert = {
  status: "open",
  matchID: "storybook-match",
  seekerName: "HarbourFox",
};
const staleAlert = { ...openAlert, status: "stale" };
const errorAlert = { ...openAlert, status: "error" };
```

Do not click `Join duel` or `Keep looking` because those paths intentionally invoke production navigation/network helpers. Use `Not now` for the interaction assertion. Do not inject a Storybook-only network implementation.

Audit `MatchAlertDialog.source.test.js` assertion by assertion. Match-alert
resolution, join ordering, conflict handling, storage-failure tolerance, and
provider routing are real lifecycle contracts and must remain covered at their
handler/helper boundary. Delete source-only assertions about imports, labels,
copy, and component nesting, then remove the source test once every unique
runtime contract is mapped or replaced.

- [ ] **Step 3: Add recovery surface stories**

In `RecoverySurfaces.stories.jsx`, render:

- `StatusBannerNeutral`
- `StatusBannerDanger`
- `ReconnectStatusRecipe` using the same `StatusBanner` props returned by the reconnect display helper; do not mount `GlobalReconnectBanner` with storage/router providers.
- `IdlePrompt`
- `ResignConfirmation`
- `UnavailableMatch` using `UnavailableMatchPage`

Use real production copy/data helpers. Interact with open/close or cancel actions using `fn()`.
Keep `LiveMatchLoadingShell` excluded: it intentionally renders the board
underlay and belongs to the board/game-screen verification boundary, not this
standard product-UI catalog.

- [ ] **Step 4: Add game-over stories**

In `GameOverModal.stories.jsx`, cover:

- `Winner`
- `Loser`
- `FinishedHumanMatch`
- `ArchivedMatch`
- `ReplayAvailable`
- `ActionPending`
- `Mobile`

Build props using `buildPostgameSummary` or the current production display model. Do not duplicate winner/reason strings in the story.

- [ ] **Step 5: Run focused tests and Storybook build**

```bash
pnpm exec vitest run \
  app/catana/matchAlerts/__tests__ \
  app/catana/__tests__/GameOverModal.test.js \
  --reporter=dot
CI=1 pnpm build-storybook
```

Expected: existing match-alert and game-over behavior passes; all new stories build.

- [ ] **Step 6: Update inventory and commit**

Mark Match-alert dialog, Recovery surfaces, and Game over `Covered`.

```bash
git add app/catana/matchAlerts app/catana/components docs/agent/UI_CATALOG.md
git commit -m "feat: catalog recovery and postgame UI"
```

### Task 8: Catalog Replay Controls And Panel Chrome

**Files:**
- Create: `app/catana/dev/storybook/replayFixtures.js`
- Create: `app/replays/components/ReplaySurfaces.stories.jsx`
- Create: `app/replays/components/ReplayPanel.stories.jsx`
- Modify: `docs/agent/UI_CATALOG.md`

**Interfaces:**
- Consumes: `ReplayStepControls`, `ReplayStatusPage`, `ReplayScoreChart`, `ReplayPanel`, and production replay timeline shapes.
- Produces: deterministic desktop/mobile replay stories without loading a replay route or game board.

- [ ] **Step 1: Build deterministic production-shaped replay fixtures**

Create `replayFixtures.js` exporting:

```js
export const replayPlayers = Object.freeze([
  { id: "0", name: "HarbourFox", color: "sky", emoji: "🦊" },
  { id: "1", name: "BoldTraderYM", color: "orange", emoji: "😉" },
]);

export const replayEvents = Object.freeze([
  { eventIndex: 0, frameIndex: 0, turn: 0, label: "Initial setup" },
  { eventIndex: 1, frameIndex: 1, turn: 1, label: "HarbourFox built a settlement" },
  { eventIndex: 2, frameIndex: 2, turn: 1, label: "HarbourFox ended their turn" },
  { eventIndex: 3, frameIndex: 3, turn: 2, label: "BoldTraderYM built a road" },
  { eventIndex: 4, frameIndex: 4, turn: 2, label: "BoldTraderYM ended their turn" },
]);

export const replayTurnStarts = Object.freeze([
  { turn: 0, eventIndex: 0 },
  { turn: 1, eventIndex: 1 },
  { turn: 2, eventIndex: 3 },
]);

export const replayScoreSeries = Object.freeze([
  { eventIndex: 0, turn: 0, scoresByPlayerId: { "0": 0, "1": 0 } },
  { eventIndex: 1, turn: 1, scoresByPlayerId: { "0": 1, "1": 0 } },
  { eventIndex: 2, turn: 1, scoresByPlayerId: { "0": 2, "1": 0 } },
  { eventIndex: 3, turn: 2, scoresByPlayerId: { "0": 2, "1": 1 } },
  { eventIndex: 4, turn: 2, scoresByPlayerId: { "0": 2, "1": 2 } },
]);

export const replayTimeline = Object.freeze({
  events: replayEvents,
  players: replayPlayers,
  playerMap: Object.freeze({
    "0": replayPlayers[0],
    "1": replayPlayers[1],
  }),
  turnStarts: replayTurnStarts,
  scoreSeries: replayScoreSeries,
  logEventIndexByKey: Object.freeze({}),
});
```

- [ ] **Step 2: Add replay control and status stories**

Set `ReplaySurfaces.stories.jsx` title to `Product Patterns/Postgame & Replay/Replay Controls` and export:

- `StepControlsAtStart`
- `StepControlsInMiddle`
- `StepControlsAtEnd`
- `PreparingArchive`
- `MatchStillActive`
- `ReplayUnavailable`
- `ReplayScoreTimeline`

Use `fn()` for seek/step callbacks. Add a keyboard interaction play function to `ReplayScoreTimeline` that focuses the chart, presses an arrow key, and verifies the seek spy receives the production-derived target index.

- [ ] **Step 3: Add composed panel stories**

Create `ReplayPanel.stories.jsx` with title `Composed Surfaces/Postgame & Replay/Replay Panel`. Use a controlled harness that changes only panel visibility/perspective. Export:

- `DesktopPanelOpen`
- `DesktopPanelCollapsed`
- `MobileDockClosed`
- `MobileDrawerOpen`

Set Storybook viewport parameters:

```js
DesktopPanelOpen.parameters = {
  viewport: { defaultViewport: "catanaDesktop" },
};
MobileDrawerOpen.parameters = {
  viewport: { defaultViewport: "catanaMobile" },
};
```

Render the real `ReplayPanel` and its actual child components. Do not mount `PostgameGameBoard` or a replay route.

- [ ] **Step 4: Run replay tests and static build**

```bash
pnpm exec vitest run app/replays --reporter=dot
CI=1 pnpm build-storybook
```

Expected: replay logic tests pass and all replay stories render in the static build.

- [ ] **Step 5: Update inventory and commit**

Mark all replay rows `Covered`.

```bash
git add app/catana/dev/storybook/replayFixtures.js \
  app/replays/components/ReplaySurfaces.stories.jsx \
  app/replays/components/ReplayPanel.stories.jsx docs/agent/UI_CATALOG.md
git commit -m "feat: catalog replay UI states"
```

### Task 9: Review Standard UI Motion And Responsive Behavior

**Files:**
- Modify if repeated need is proven: `app/globals.css`
- Modify: relevant story files from Tasks 3, 5, 6, 7, and 8
- Modify: `docs/agent/UI_CATALOG.md`

**Interfaces:**
- Consumes: production motion classes/tokens and interactive story harnesses.
- Produces: inspectable dialog, popover, banner, state-transition, mobile drawer, and reduced-motion behavior.

- [ ] **Step 1: Start Storybook and inspect normal motion**

```bash
pnpm storybook
```

Open `http://localhost:6006`. Trigger:

- Dialog and AlertDialog open/close.
- Popover/account menu open/close.
- Matchmaking waiting → rescue presentation.
- Match-alert pending/error states.
- Replay mobile drawer open/close.
- Button hover, press, focus, and disabled states.

Expected: each interaction uses production motion and remains understandable.

- [ ] **Step 2: Inspect reduced-motion behavior**

Use browser emulation for `prefers-reduced-motion: reduce`, reload the same stories, and repeat the interactions.

Expected: motion is removed or substantially reduced where current `motion-reduce:*` rules apply; every control still changes state and remains operable.

- [ ] **Step 3: Fix only demonstrated inconsistencies**

If two or more standard UI components independently encode the same missing duration/easing, add one narrowly named CSS variable in `app/globals.css` and apply it to those real components. Otherwise, fix the component-specific class and leave the token set unchanged.

Do not add automated timing-value tests. Verify the edited story directly.

- [ ] **Step 4: Check desktop and mobile composition**

Review at least:

- `SystemAccountMenu/GuestResumeFailed` at 1440×900 and 390×844.
- `SearchingModal/PufferRescueAvailable` at both viewports.
- `GameOverModal/Mobile` at 390×844.
- `ReplaySurfaces/DesktopPanelOpen` at 1440×900.
- `ReplaySurfaces/MobileDrawerOpen` at 390×844.

Record any deliberate responsive exclusions in `UI_CATALOG.md`; otherwise mark motion/viewports reviewed.

- [ ] **Step 5: Build and commit motion fixes**

```bash
CI=1 pnpm build-storybook
git diff --check
```

Expected: build and whitespace check pass.

```bash
git add app docs/agent/UI_CATALOG.md
git commit -m "fix: align standard UI motion in catalog"
```

If visual review requires no production changes, commit only the reviewed inventory/story annotations with message `docs: record UI motion review`.

### Task 10: Encode The Catalog Workflow For Future Agents

**Files:**
- Create: `docs/agent/STORYBOOK.md`
- Modify: `AGENTS.md`
- Modify: `.agents/skills/catana-design/SKILL.md`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: verified Storybook commands and catalog structure.
- Produces: one concise, consistent agent workflow.

- [ ] **Step 1: Write contributor guidance**

Create `docs/agent/STORYBOOK.md`:

```markdown
# Storybook UI Catalog

Storybook is SettleHex's executable reference for standard product UI. It
renders real production components, CSS, copy, valid states, and motion without
requiring a live match or provider graph.

## Commands

- `pnpm storybook` — build `game-core`, then run Storybook on port 6006.
- `CI=1 pnpm build-storybook` — build the static catalog.

## Scope

Use Storybook for `app/ui` primitives, account/identity UI, homepage/lobby
chrome, alerts/recovery, postgame, and replay controls. Use the Catana sandbox,
effects lab, or real route for board, gameplay HUD, game-event effects, audio,
haptics, and provider/network behavior.

## Adding Standard UI

1. Read `docs/agent/UI_CONTEXT.md` and the Catana design skill.
2. Find the owning component or pattern in `docs/agent/UI_CATALOG.md`.
3. Inspect its primitive and composed stories.
4. Reuse or extend the shared production component.
5. Add a named story for a meaningful production state or copy branch.
6. Derive copy/state from production helpers; do not paste a second copy model.
7. Verify interaction, desktop/mobile layout, and reduced motion.

Stories must be deterministic, network-free, and production-valid. Controls
may vary safe presentation values but must not create impossible product state.
```

- [ ] **Step 2: Add the concise repository rule**

Under the Design System section of `AGENTS.md`, add:

```markdown
- **Standard UI catalog**: before adding or changing standard product UI,
  inspect `docs/agent/UI_CATALOG.md` and the relevant Storybook stories. Reuse
  the owning production component, add a named story for a meaningful
  production state/copy branch, and verify interaction plus desktop/mobile
  motion with `pnpm storybook`. Use integrated Catana dev surfaces for
  gameplay/provider behavior outside Storybook's scope.
```

- [ ] **Step 3: Route the design skill through Storybook**

In `.agents/skills/catana-design/SKILL.md`, add one routing paragraph after its required-context section:

```markdown
For standard product UI, also consult `docs/agent/UI_CATALOG.md` and the
relevant Storybook component/composed stories before inventing a new pattern.
Treat Storybook as executable evidence for production components, valid states,
copy, responsive behavior, and standard UI motion. Use the sandbox/effects lab
or real route when the change depends on gameplay, providers, or network state.
```

- [ ] **Step 4: Record the implementation**

Append dated entries to `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` recording:

- fresh branch/worktree rather than old-atlas merge;
- Storybook version and Next 13/webpack pin;
- included/excluded scope;
- account/menu/match-alert extraction;
- production-valid fixture policy;
- test/build/browser verification status;
- Claude Design sync remains a separate approval-gated final step.

- [ ] **Step 5: Commit guidance**

```bash
git add AGENTS.md .agents/skills/catana-design/SKILL.md \
  docs/agent/STORYBOOK.md docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: route standard UI work through Storybook"
```

### Task 11: Perform Full Local Verification

**Files:**
- Modify only for defects found: in-scope source/story/test files.
- Modify: `docs/agent/UI_CATALOG.md`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: complete catalog-enabled branch.
- Produces: clean local evidence suitable for the Claude Design upload checkpoint.

- [ ] **Step 1: Run focused behavior suites**

```bash
pnpm exec vitest run \
  app/catana/matchAlerts \
  app/catana/__tests__/SystemAccountMenu.test.js \
  app/catana/matchmaking/__tests__/matchmakingRescue.test.js \
  app/catana/__tests__/useLobbyHomeActions.matchmaking.test.js \
  app/catana/__tests__/pendingFriendChallenge.test.js \
  app/catana/__tests__/GameOverModal.test.js \
  app/replays \
  app/__tests__/api/matchAlertRoutes.test.js \
  --reporter=dot
```

Expected: all selected tests pass.

- [ ] **Step 2: Run the static build**

```bash
CI=1 pnpm build-storybook
```

Expected: exit 0 with a complete `storybook-static/`.

- [ ] **Step 3: Run a browser smoke sweep**

Start Storybook, enumerate indexed stories from Storybook's index, and visit each iframe route. Treat only visible `.sb-errordisplay` elements, uncaught page errors, or console errors as failures; ignore hidden Storybook error-display scaffolding.

Expected: every indexed story renders with no visible Storybook error.

- [ ] **Step 4: Complete keyboard and viewport checks**

Verify:

- button/icon-button accessible names;
- Tab/Enter/Escape operation for popover and dialogs;
- focus return after dismissal;
- replay chart arrow-key seek;
- the five representative desktop/mobile stories from Task 9;
- normal and reduced-motion operation.

Expected: no keyboard trap, clipped required action, or unreachable copy.

- [ ] **Step 5: Finalize the coverage record**

Every `UI_CATALOG.md` row must now be `Covered` or deliberately `Excluded` with a reason. No unfinished status marker may remain.

```bash
rg -n "Planned|Needs boundary work|T[B]D|T[O]DO" docs/agent/UI_CATALOG.md
```

Expected: no output.

- [ ] **Step 6: Run repository hygiene checks**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended final documentation updates remain.

- [ ] **Step 7: Record evidence and commit**

Update `PROGRESS.md` and `NOTES.md` with actual counts and command results, then:

```bash
git add docs/agent/UI_CATALOG.md docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record Storybook catalog verification"
git status --short --branch
```

Expected: clean branch. Do not push.

### Task 12: Sync The Verified Catalog Into Claude Design

**Files:**
- Do not commit by default: `.design-sync/config.json`
- Modify after evidence: `docs/agent/PROGRESS.md`
- Modify after evidence: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: clean verified Storybook catalog and existing Claude Design project `SettleHex Design System`.
- Produces: verified Claude Design import plus two recognizably SettleHex acceptance compositions.

- [ ] **Step 1: Present the upload checkpoint**

Show the user:

- branch/worktree path;
- story/module counts;
- focused test result;
- static build result;
- browser/motion/viewport result;
- upload target `SettleHex Design System`;
- confirmation that no production deploy or push is included.

Stop here until the user explicitly approves the Claude Design upload.

- [ ] **Step 2: Run Claude CLI interactively from the catalog worktree**

```bash
cd /Users/david/coding/settlex/.worktrees/ui-catalog-storybook
claude
```

Use a TTY. Run:

```text
/design-sync
```

Select the existing pinned `SettleHex Design System` project and the Storybook path. Do not choose whole-app synth-entry mode.

- [ ] **Step 3: Approve and monitor the bounded sync**

Approve only the Storybook/catalog upload described at Step 1. Let the CLI complete component conversion and visual verification. Record any missing, stale, generic, or failed entries by production owner/story.

- [ ] **Step 4: Correct the local source and resync if needed**

For any weak import:

1. identify whether the problem is missing state, ambiguous API, generic story context, or invalid copied content;
2. fix the production component/story/fixture locally;
3. rerun focused tests and `CI=1 pnpm build-storybook`;
4. rerun `/design-sync`.

Do not compensate with an ever-larger Claude prompt or edit generated artifacts as the source of truth.

- [ ] **Step 5: Run the two acceptance exercises**

Ask Claude Design to:

1. create an alternative account/profile surface using only the imported SettleHex system;
2. create a replay-control composition using only the imported SettleHex system.

Accept only if both preserve the bright, rounded, game-native SettleHex family and reuse imported primitives/patterns without drifting into generic SaaS styling.

- [ ] **Step 6: Record the final result**

Append the project name, sync date, imported coverage/counts, resync fixes, and acceptance verdict to `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md`.

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record Claude Design catalog sync"
git status --short --branch
```

Expected: clean branch. Do not push, merge, or deploy without a separate explicit request.

---

## Final Acceptance Checklist

- [ ] Current-main inventory reviewed; old atlas used only as reference.
- [ ] Every in-scope `app/ui` primitive is inspectable.
- [ ] Account, identity, matchmaking, alerts/recovery, postgame, and replay have production-valid named stories.
- [ ] Exact match-alert copy is derived from production owners.
- [ ] Rare guest/resume-failed account-menu state is visible and interactive.
- [ ] Route orchestration stays in `HomeTableClient`; presentation boundaries are independently renderable.
- [ ] Dialog, popover, banner/state, input feedback, replay drawer, and reduced-motion behavior are reviewed.
- [ ] Focused rendered/helper tests pass without new UI source-grep tests.
- [ ] Static Storybook build and all-story browser smoke pass.
- [ ] Desktop and 390×844 mobile review pass.
- [ ] Agent guidance routes future standard UI work through Storybook.
- [ ] Claude Design imports from Storybook rather than whole-app synth-entry.
- [ ] Account/profile and replay acceptance exercises look recognizably SettleHex.
- [ ] No push, merge, or deploy occurred.
