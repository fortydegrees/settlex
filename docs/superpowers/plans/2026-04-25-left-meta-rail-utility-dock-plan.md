# Left Meta Rail Utility Dock Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current desktop left meta side-tab shell with a simpler utility rail plus independently open docked cards for `Game Log`, `Chat`, and future support panels.

**Architecture:** Keep `LeftMetaRail` as the production entry point and keep `GameLogPanel` / `ChatPanel` as content payloads. Replace the desktop-only side-tab geometry with a compact rail column, a stack of normal Settlex glass docked panels, local open/width persistence, and a small CSS tab bridge for active buttons. Add a shared `Tooltip` primitive for icon-only rail labels, but defer `ScrollArea` and height resizing.

**Tech Stack:** Next.js app router, React 18 JavaScript components, Tailwind CSS classes, `@base-ui/react/tooltip`, existing Settlex `IconButton`/`Panel`, Vitest source/render tests, pnpm

---

## Scope And References

Design spec:

- `docs/superpowers/specs/2026-04-25-left-meta-rail-utility-dock-design.md`

Local design-system docs:

- `docs/agent/skills/catana-brand/SKILL.md`
- `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md`
- `docs/superpowers/specs/2026-04-21-settlex-standard-ui-system-design.md`

External references reviewed:

- Base UI Tooltip: https://base-ui.com/react/components/tooltip
- Base UI Toolbar: https://base-ui.com/react/components/toolbar
- Base UI Collapsible: https://base-ui.com/react/components/collapsible
- Base UI Accordion: https://base-ui.com/react/components/accordion
- Base UI Popover: https://base-ui.com/react/components/popover

Important local constraints:

- Do not add a new UI library.
- Do not change game logic, chat transport, or log data flow.
- Do not redesign mobile behavior beyond small helpers needed by the desktop refactor.
- Do not modify unrelated dirty worktree files.
- Do not remove the dev-only `/catana/dev/sidebar-connection` study in this slice.

## File Structure

### Create

- `app/ui/Tooltip.js`
  - Shared Settlex tooltip wrapper over `@base-ui/react/tooltip`.

### Modify

- `app/catana/components/LeftMetaRail.js`
  - Replace desktop side-tab geometry with utility dock layout.
  - Keep `MobileMetaRail` path.
  - Keep `DesktopMetaDock` export for tests.
- `app/catana/__tests__/LeftMetaRail.test.js`
  - Replace outdated fixed-column/source assertions with utility-dock render/source guards.
- `app/catana/__tests__/SettlexUiRecipes.source.test.js`
  - Add source guard for shared `Tooltip`.
- `app/catana/dev/ui/UiShowcaseClient.js`
  - Add a small Tooltip example in the standard UI showcase.
- `docs/agent/PROGRESS.md`
  - Record the implementation result after code lands.
- `docs/agent/NOTES.md`
  - Record the left rail utility-dock guardrails after code lands.

### Verify Existing

- `app/catana/utils/leftMetaRailPreferences.js`
  - Keep default `["log", "chat"]`, shared `panelWidth`, and clamp behavior unless tests expose a real mismatch.
- `app/catana/__tests__/leftMetaRailPreferences.test.js`
  - Existing coverage should continue to pass.
- `app/catana/components/GameLogPanel.js`
  - Content payload only.
- `app/catana/components/ChatPanel.js`
  - Content payload only.

## Task 1: Add Shared Tooltip Primitive

**Files:**
- Create: `app/ui/Tooltip.js`
- Modify: `app/catana/__tests__/SettlexUiRecipes.source.test.js`
- Modify: `app/catana/dev/ui/UiShowcaseClient.js`

- [ ] **Step 1: Write the failing Tooltip source guard**

Add a test case to `app/catana/__tests__/SettlexUiRecipes.source.test.js`:

```js
it("defines the shared tooltip primitive", () => {
  const tooltip = readFileSync(resolve(process.cwd(), "app/ui/Tooltip.js"), "utf8");

  expect(tooltip).toContain("@base-ui/react/tooltip");
  expect(tooltip).toContain("Tooltip.Provider");
  expect(tooltip).toContain("Tooltip.Trigger");
  expect(tooltip).toContain("Tooltip.Popup");
  expect(tooltip).toContain("aria-label");
  expect(tooltip).toContain("motion-reduce");
});
```

- [ ] **Step 2: Run the Tooltip source guard to verify it fails**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js
```

Expected: FAIL because `app/ui/Tooltip.js` does not exist.

- [ ] **Step 3: Implement `app/ui/Tooltip.js`**

Create a small wrapper matching the existing `Popover` style:

```jsx
"use client";

import React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "./cn";

export function TooltipProvider({ children, delay = 450 }) {
  return <BaseTooltip.Provider delay={delay}>{children}</BaseTooltip.Provider>;
}

export function Tooltip({
  label,
  children,
  className = "",
  sideOffset = 10,
  align = "center",
}) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          sideOffset={sideOffset}
          align={align}
          className="z-[70]"
        >
          <BaseTooltip.Popup
            className={cn(
              "rounded-[0.85rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(219,234,254,0.86))] px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.52)] backdrop-blur-xl transition-[opacity,transform] duration-[var(--settlex-ui-duration-fast)] data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.96] motion-reduce:transition-none",
              className
            )}
          >
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
```

Implementation note: Base UI’s Tooltip docs say tooltip triggers still need accessible labels. Do not rely on tooltip text as the only accessible name.

- [ ] **Step 4: Add a tiny showcase example**

In `app/catana/dev/ui/UiShowcaseClient.js`, import `Tooltip` and `TooltipProvider`, then add one compact icon-button example near the existing button/control examples.

Example shape:

```jsx
<TooltipProvider>
  <Tooltip label="Open game log">
    <IconButton aria-label="Open game log" variant="secondary">
      <span aria-hidden="true">L</span>
    </IconButton>
  </Tooltip>
</TooltipProvider>
```

Keep this small. The showcase should prove the primitive exists; it should not become a left-rail mockup.

- [ ] **Step 5: Run the Tooltip source guard**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the Tooltip primitive**

```bash
git add app/ui/Tooltip.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/dev/ui/UiShowcaseClient.js
git commit -m "feat: add Settlex tooltip primitive"
```

## Task 2: Rewrite Left Meta Rail Tests For Utility Dock Behavior

**Files:**
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Verify: `app/catana/components/LeftMetaRail.js`

- [ ] **Step 1: Replace outdated source tests**

Replace `app/catana/__tests__/LeftMetaRail.test.js` with source and render coverage for the approved model.

Use this skeleton:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesktopMetaDock } from "../components/LeftMetaRail";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const leftMetaRailPath = path.resolve(
  __dirname,
  "..",
  "components",
  "LeftMetaRail.js"
);

describe("LeftMetaRail", () => {
  it("renders desktop as a utility rail with docked panels", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain("DesktopUtilityDockRow");
    expect(contents).toContain("RailTabBridge");
    expect(contents).toContain("DockedMetaPanel");
    expect(contents).toContain("data-meta-utility-rail");
    expect(contents).toContain("data-meta-docked-panel");
    expect(contents).not.toContain("data-meta-side-tab");
    expect(contents).not.toContain("getSideTabLayoutMetrics");
    expect(contents).not.toContain('import { gsap } from "gsap"');
  });

  it("defaults desktop to both support panels open", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DesktopMetaDock, {
        entries: [],
        logPlayerMap: {},
        initialOpenPanels: ["log", "chat"],
      })
    );

    expect(markup).toContain('data-meta-docked-panel="log"');
    expect(markup).toContain('data-meta-docked-panel="chat"');
    expect(markup).toContain('aria-expanded="true"');
  });

  it("keeps rail buttons when desktop panels are closed", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DesktopMetaDock, {
        entries: [],
        logPlayerMap: {},
        initialOpenPanels: [],
      })
    );

    expect(markup).toContain('data-meta-rail-button="log"');
    expect(markup).toContain('data-meta-rail-button="chat"');
    expect(markup).not.toContain('data-meta-docked-panel="log"');
    expect(markup).not.toContain('data-meta-docked-panel="chat"');
  });

  it("keeps Game Log before Chat in panel metadata", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");
    const gameLogIndex = contents.indexOf('id: "log"');
    const chatIndex = contents.indexOf('id: "chat"');

    expect(gameLogIndex).toBeGreaterThan(-1);
    expect(chatIndex).toBeGreaterThan(-1);
    expect(gameLogIndex).toBeLessThan(chatIndex);
  });
});
```

- [ ] **Step 2: Run the rail tests to verify they fail**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js
```

Expected: FAIL because production still contains side-tab source and lacks utility-dock data attributes.

- [ ] **Step 3: Commit the failing test update**

```bash
git add app/catana/__tests__/LeftMetaRail.test.js
git commit -m "test: specify left meta utility dock"
```

## Task 3: Replace Desktop Side-Tab Shell With Utility Dock

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`
- Verify: `app/catana/__tests__/LeftMetaRail.test.js`
- Verify: `app/catana/__tests__/leftMetaRailPreferences.test.js`

- [ ] **Step 1: Remove side-tab-only desktop geometry**

In `app/catana/components/LeftMetaRail.js`, remove desktop-only side-tab geometry that no longer belongs in production:

- `import { gsap } from "gsap";`
- `BUTTON_RADIUS`
- `SIDE_TAB_*` constants
- `normalizeSideTabAttachment`
- `lerp`
- `easeOutCubic`
- `interpolateStops`
- `usePrefersReducedMotion` if no longer used
- `useGsapDockMotion`
- `getSideTabShellWidth`
- `getSideTabLayoutMetrics`
- `getSideTabRowHeight`
- `DesktopSideTabRow`
- `data-meta-side-tab-*` attributes

Keep:

- `panelIds`
- `defaultDesktopOpenPanels`
- icons
- mobile constants/components
- persistence imports and resize logic
- `DesktopMetaDock` export
- `MobileMetaRail` export
- `LeftMetaRail` export

- [ ] **Step 2: Add desktop utility dock constants**

Add explicit constants near the desktop class names:

```js
const DESKTOP_RAIL_BUTTON_SIZE = 64;
const DESKTOP_RAIL_GAP = 12;
const DESKTOP_RAIL_WIDTH = 76;
const DESKTOP_PANEL_GAP = 12;
const DESKTOP_PANEL_STACK_GAP = 12;
const DESKTOP_META_DOCK_WIDTH_SLACK = 32;
```

Use `DESKTOP_RAIL_BUTTON_SIZE` for desktop icon buttons. Keep mobile button sizing unchanged.

- [ ] **Step 3: Update desktop panel metadata**

In `buildMetaPanels()`, remove `attachment`. Keep one metadata object per panel:

```js
{
  id: "log",
  shortLabel: "Log",
  label: "Game Log",
  ariaLabel: "Toggle game log panel",
  icon: React.createElement(LogIcon),
  height: 286,
  defaultOpenDesktop: true,
  renderDesktop: () =>
    React.createElement(GameLogPanel, {
      entries,
      playerMap: logPlayerMap,
      themeId,
      rootClassName: "w-full",
      panelClassName:
        "flex h-[286px] flex-col overflow-hidden bg-transparent select-text",
      headerClassName: desktopDockedPanelHeaderClassName,
    }),
  renderMobile: () => ...
}
```

Use the same `height` values as today: `286` for log, `230` for chat.

- [ ] **Step 4: Add `RailTabBridge`, `DockedMetaPanel`, and `DesktopUtilityDockRow`**

Add simple composable pieces in `LeftMetaRail.js`.

Required structure:

```js
function RailTabBridge({ isOpen, panelId }) {
  if (!isOpen) return null;

  return React.createElement("span", {
    className:
      "pointer-events-none absolute left-[56px] top-1/2 z-10 h-10 w-8 -translate-y-1/2 rounded-r-[18px] border border-l-0 border-white/45 bg-blue-200/70 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.55)] backdrop-blur-sm",
    "data-meta-rail-tab-bridge": panelId,
    "aria-hidden": "true",
  });
}
```

```js
function DockedMetaPanel({
  panel,
  panelWidth,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onResizePointerCancel,
  onClose,
}) {
  return React.createElement(
    "div",
    {
      id: `desktop-meta-panel-${panel.id}`,
      className:
        "pointer-events-auto relative overflow-hidden rounded-[1.25rem] border border-white/45 bg-blue-200/85 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.58)] backdrop-blur-md transition-[opacity,transform] duration-[var(--settlex-ui-duration-dialog)] motion-reduce:transition-none",
      style: { width: `${panelWidth}px` },
      "data-meta-docked-panel": panel.id,
      "data-allow-interaction": "true",
      onKeyDown: (event) => {
        if (event.code !== "Escape") return;
        event.preventDefault();
        onClose(panel.id);
      },
    },
    panel.renderDesktop(),
    React.createElement("div", {
      className:
        "pointer-events-auto absolute right-0 top-0 z-40 h-full w-4 cursor-ew-resize touch-none",
      onPointerDown: onResizePointerDown,
      onPointerMove: onResizePointerMove,
      onPointerUp: onResizePointerUp,
      onPointerCancel: onResizePointerCancel,
      "data-meta-docked-panel-resize-handle": panel.id,
      "data-allow-interaction": "true",
      "aria-hidden": "true",
    })
  );
}
```

```js
function DesktopUtilityDockRow({ panel, isOpen, onToggle }) {
  return React.createElement(
    "div",
    {
      className: "pointer-events-auto relative",
      "data-meta-utility-row": panel.id,
    },
    React.createElement(RailTabBridge, { isOpen, panelId: panel.id }),
    React.createElement(
      Tooltip,
      { label: panel.label, sideOffset: 12, align: "center" },
      React.createElement(
        IconButton,
        {
          variant: isOpen ? "accent" : "secondary",
          "aria-label": panel.ariaLabel,
          "aria-expanded": isOpen ? "true" : "false",
          "aria-controls": `desktop-meta-panel-${panel.id}`,
          onClick: () => onToggle(panel.id),
          onKeyDown: (event) => {
            if (!isOpen || event.code !== "Escape") return;
            event.preventDefault();
            onToggle(panel.id);
          },
          className:
            "h-16 w-16 rounded-[1.15rem] p-0 text-slate-700",
          "data-meta-rail-button": panel.id,
          "data-meta-sidebar-button": panel.id,
          "data-allow-interaction": "true",
        },
        React.cloneElement(panel.icon, {
          className: desktopButtonIconClassName,
        })
      )
    )
  );
}
```

Adjust class strings during implementation if needed for lint/readability, but keep the data attributes and behavior.

- [ ] **Step 5: Rebuild `DesktopMetaDockComponent` layout**

Render desktop as two adjacent columns:

- left compact rail column,
- right open panel stack.

Required structure:

```js
return React.createElement(
  TooltipProvider,
  null,
  React.createElement(
    "div",
    {
      className:
        "pointer-events-none fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block",
      style: { width: `${desktopDockWidth}px` },
      "data-meta-dock-desktop": "true",
    },
    React.createElement(
      "div",
      {
        className:
          "pointer-events-none flex items-start gap-3 overflow-visible",
        "data-meta-utility-dock": "true",
      },
      React.createElement(
        "div",
        {
          className:
            "pointer-events-auto flex flex-col gap-3 rounded-[1.45rem] bg-white/24 p-1.5 shadow-2xl ring-1 ring-white/35 backdrop-blur-md",
          "data-meta-utility-rail": "true",
          "data-allow-interaction": "true",
        },
        panels.map((panel) =>
          React.createElement(DesktopUtilityDockRow, {
            key: panel.id,
            panel,
            isOpen: openPanels.includes(panel.id),
            onToggle: handleTogglePanel,
          })
        )
      ),
      openPanelItems.length > 0
        ? React.createElement(
            "div",
            {
              className: "pointer-events-none flex flex-col gap-3",
              "data-meta-docked-panel-stack": "true",
            },
            openPanelItems.map((panel) =>
              React.createElement(DockedMetaPanel, {
                key: panel.id,
                panel,
                panelWidth,
                onClose: closePanel,
                onResizePointerDown: handleResizePointerDown,
                onResizePointerMove: handleResizePointerMove,
                onResizePointerUp: finishResizeInteraction,
                onResizePointerCancel: finishResizeInteraction,
              })
            )
          )
        : null
    )
  )
);
```

Compute:

```js
const openPanelItems = panels.filter((panel) => openPanels.includes(panel.id));
const desktopDockWidth =
  DESKTOP_RAIL_WIDTH + DESKTOP_PANEL_GAP + panelWidth + DESKTOP_META_DOCK_WIDTH_SLACK;
```

Important: when `openPanelItems.length === 0`, do not render the panel stack.

- [ ] **Step 6: Replace global desktop Escape collapse with local close behavior**

Remove the desktop `useEscapeCollapse(openPanels.length > 0, collapseAllPanels)` call.

Add:

```js
const closePanel = useCallback((panelId) => {
  updateDesktopPrefs((currentPrefs) => ({
    ...currentPrefs,
    openPanels: currentPrefs.openPanels.filter(
      (currentPanelId) => currentPanelId !== panelId
    ),
  }));
}, [updateDesktopPrefs]);
```

Use `closePanel` from `DockedMetaPanel` `onKeyDown`.

Mobile may keep its current Escape behavior for now, because the spec only requires local Escape behavior for desktop board interaction. If the implementation naturally touches mobile, prefer attaching `onKeyDown` to the mobile panel rather than adding a new global listener.

- [ ] **Step 7: Run focused rail tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/leftMetaRailPreferences.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit the desktop utility dock**

```bash
git add app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js
git commit -m "feat: redesign left meta rail as utility dock"
```

## Task 4: Verify Feed Panel Compatibility

**Files:**
- Verify: `app/catana/components/GameLogPanel.js`
- Verify: `app/catana/components/ChatPanel.js`
- Verify: `app/catana/components/FeedPanel.js`
- Test: `app/catana/__tests__/GameLogPanel.test.js`
- Test: `app/catana/__tests__/ChatPanel.test.js`
- Test: `app/catana/__tests__/renderPerfGuards.test.js`

- [ ] **Step 1: Run focused feed panel tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS. If this fails because the rail class overrides exposed an actual feed-shell seam, fix the minimal prop/class override in `LeftMetaRail.js` first.

- [ ] **Step 2: Check source for accidental content duplication**

Run:

```bash
rg -n "No messages yet|formatLogEntry|formatChatEntry|submitChatDraft" app/catana/components/LeftMetaRail.js
```

Expected:

- no inline feed formatting logic in `LeftMetaRail.js`,
- `submitChatDraft` should not appear,
- `formatLogEntry` and `formatChatEntry` should not appear.

`LeftMetaRail.js` should delegate content to `GameLogPanel` and `ChatPanel`.

- [ ] **Step 3: Commit only if a compatibility fix was needed**

If no files changed, skip this commit.

If a fix was needed:

```bash
git add app/catana/components/LeftMetaRail.js app/catana/components/GameLogPanel.js app/catana/components/ChatPanel.js app/catana/components/FeedPanel.js
git commit -m "fix: preserve feed panels inside utility dock"
```

## Task 5: Browser Check In The Catana Sandbox

**Files:**
- Verify visually: `/catana/dev/sandbox`
- Modify if needed: `app/catana/components/LeftMetaRail.js`

- [ ] **Step 1: Start the dev server**

Run:

```bash
pnpm dev
```

Expected: Next dev server starts. If port `3000` is busy, use the next available URL printed by Next.

- [ ] **Step 2: Open the sandbox**

Open:

```text
http://127.0.0.1:3000/catana/dev/sandbox
```

- [ ] **Step 3: Desktop visual checks**

At a desktop viewport, verify:

- both `Game Log` and `Chat` are open by default,
- rail buttons remain compact and stable,
- each button toggles only its own panel,
- both-open, log-only, chat-only, and both-closed states work,
- closed panels leave no visible or invisible large blocker,
- board panning/dragging is not blocked outside visible rail/panel surfaces,
- chat composer remains usable,
- panel width resizing still works if retained,
- open panels look like Settlex glass cards rather than dark/sidebar chrome.

- [ ] **Step 4: Mobile regression check**

At a narrow/mobile viewport, verify:

- mobile rail still renders,
- mobile still uses one active panel drawer behavior,
- log and chat can still be opened and closed,
- bottom action dock is not covered worse than before.

- [ ] **Step 5: Apply only small visual fixes if needed**

If browser context exposes spacing or clipping problems, keep edits scoped to `LeftMetaRail.js` class names/constants.

Do not redesign `GameLogPanel` or `ChatPanel` in this task.

- [ ] **Step 6: Re-run focused tests after visual fixes**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit visual fixes if any**

If no files changed, skip this commit.

If class/spacing fixes were needed:

```bash
git add app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js
git commit -m "fix: tune left meta utility dock layout"
```

## Task 6: Record Agent Notes And Final Verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Update progress**

Add a new entry to `docs/agent/PROGRESS.md`:

```md
## Status (2026-04-25, left meta utility dock redesign)
- Replaced the production desktop left meta side-tab shell with a simpler utility dock and docked-card layout.
- Current behavior:
- desktop defaults `Game Log` and `Chat` open,
- each rail button toggles only its own panel,
- multiple panels can stay open,
- closed panels leave only compact rail controls,
- the existing shared desktop width/open-state persistence is preserved,
- mobile rail behavior remains the simpler one-active-panel path.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/leftMetaRailPreferences.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js`
- browser check at `/catana/dev/sandbox` for both-open, log-only, chat-only, and both-closed desktop states plus mobile rail regression.
```

- [ ] **Step 2: Update notes**

Add or update a `Left meta utility dock note` in `docs/agent/NOTES.md`:

```md
- Left meta utility dock note:
- the production desktop `LeftMetaRail` is a utility rail with independently open docked cards, not a tabstrip, drawer, or custom SVG side-tab shell,
- keep `GameLogPanel` and `ChatPanel` as content payloads; do not duplicate feed formatting or chat submission logic in the rail,
- desktop should default `log` and `chat` open but persist later user open/closed choices,
- closed desktop panels should not leave panel-sized invisible hitboxes over the board,
- future support panels should be added through rail metadata and should not include primary gameplay controls.
```

- [ ] **Step 3: Run final focused automated verification**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/SettlexUiRecipes.source.test.js \
  app/catana/__tests__/LeftMetaRail.test.js \
  app/catana/__tests__/leftMetaRailPreferences.test.js \
  app/catana/__tests__/GameLogPanel.test.js \
  app/catana/__tests__/ChatPanel.test.js \
  app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS.

- [ ] **Step 4: Run focused lint**

Run:

```bash
pnpm exec eslint \
  app/ui/Tooltip.js \
  app/catana/dev/ui/UiShowcaseClient.js \
  app/catana/components/LeftMetaRail.js \
  app/catana/__tests__/SettlexUiRecipes.source.test.js \
  app/catana/__tests__/LeftMetaRail.test.js \
  app/catana/components/GameLogPanel.js \
  app/catana/components/ChatPanel.js
```

Expected: exits `0`.

- [ ] **Step 5: Run diff check**

Run:

```bash
git diff --check -- \
  app/ui/Tooltip.js \
  app/catana/dev/ui/UiShowcaseClient.js \
  app/catana/components/LeftMetaRail.js \
  app/catana/__tests__/SettlexUiRecipes.source.test.js \
  app/catana/__tests__/LeftMetaRail.test.js \
  docs/agent/PROGRESS.md \
  docs/agent/NOTES.md
```

Expected: no output.

- [ ] **Step 6: Commit docs and final verification updates**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record left meta utility dock rollout"
```

## Completion Criteria

The implementation is complete when:

- desktop `LeftMetaRail` no longer uses the production side-tab geometry,
- desktop renders a compact utility rail plus normal docked cards,
- `Game Log` and `Chat` are both open by default on first desktop load,
- each panel can be toggled independently,
- closed panels leave no large invisible board blocker,
- open state and width persistence still work,
- mobile rail behavior is not regressed,
- Tooltip exists as a shared Settlex primitive and is used for rail icon labels,
- focused tests, lint, and browser verification pass,
- `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` are updated.
