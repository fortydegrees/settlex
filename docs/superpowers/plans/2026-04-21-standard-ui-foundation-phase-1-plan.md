# Settlex Standard UI Foundation Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first reusable slice of the Settlex standard UI system and migrate the highest-value existing standard UI surfaces onto it.

**Architecture:** Create one shared UI layer under `app/ui/` that owns the first standard component recipes: `Button`, `Panel`, `Banner`, `Input`, `Select`, `Dialog`, and `AlertDialog`. Use `@base-ui/react` only where behavior/a11y primitives matter now, keep native HTML wrappers for simple fields, and migrate existing Catana adapters and proving-ground surfaces incrementally instead of attempting a big-bang rewrite.

**Tech Stack:** Next.js app router, React 18, Tailwind CSS, `@base-ui/react`, existing Catana JS components, Vitest source tests, pnpm

---

## Scope And Assumptions

- This is **Phase 1** of the broader standard UI system from `docs/superpowers/specs/2026-04-21-settlex-standard-ui-system-design.md`.
- This plan intentionally covers only the first high-value standard components:
  - `Button`
  - `Panel`
  - `Banner`
  - `Input`
  - `Select`
  - `Dialog`
  - `AlertDialog`
- This plan assumes explicit approval to add the runtime dependency `@base-ui/react` before implementation begins.
- This plan does **not** yet implement:
  - `Toast`
  - `Tooltip`
  - `Popover`
  - `Tabs`
  - `Table`
  - `ScrollArea`
  - `Slider`
  - `Switch`
  - `Checkbox`
- This plan does **not** redesign bespoke gameplay controls such as `End Turn`, `Roll Dice`, or build-action controls.
- This plan uses existing source-test patterns already common in the repo, because many current UI tests verify component structure and styling contracts by reading source files directly.

## File Structure

### New shared UI files

- Create: `app/ui/cn.js`
  - Tiny class-name join helper for the new shared components.
- Create: `app/ui/Button.js`
  - Shared Settlex button component with standard variants such as `primary`, `pill`, `ghost`, and `chip`.
- Create: `app/ui/Panel.js`
  - Shared frosted panel shell with optional title/right-action header.
- Create: `app/ui/Banner.js`
  - Shared banner/inline-alert shell with `neutral` and `danger` variants.
- Create: `app/ui/Input.js`
  - Shared styled text input wrapper.
- Create: `app/ui/Select.js`
  - Shared styled native select wrapper.
- Create: `app/ui/Dialog.js`
  - Shared Settlex dialog wrapper built on `@base-ui/react/dialog`.
- Create: `app/ui/AlertDialog.js`
  - Shared Settlex alert/confirm dialog wrapper built on `@base-ui/react/alert-dialog`.
- Create: `app/catana/components/ResignConfirmDialog.js`
  - Small Catana-specific content wrapper around the shared alert dialog.
- Create: `app/catana/__tests__/SettlexUiFoundation.source.test.js`
  - Source-level test for layout root isolation and global UI tokens/motion hooks.
- Create: `app/catana/__tests__/SettlexUiRecipes.source.test.js`
  - Source-level tests for the shared component recipes.
- Create: `app/catana/__tests__/SettlexDialogs.source.test.js`
  - Source-level tests for the shared dialog wrappers.
- Create: `app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`
  - Source-level test covering migration of custom-game controls to the shared UI layer.
- Create: `app/catana/__tests__/MatchPageClient.standardUi.source.test.js`
  - Source-level test covering migration of join-seat panels/forms to the shared UI layer.

### Existing files to modify

- Modify: `package.json`
  - Add `@base-ui/react`.
- Modify: `app/layout.js`
  - Add a stable UI root wrapper for portaled components and keep `GlobalReconnectBanner` inside that isolated root.
- Modify: `app/globals.css`
  - Add Settlex UI CSS variables and shared motion hooks used by the new standard UI layer.
- Modify: `app/catana/components/GlassPillButton.js`
  - Turn into a thin adapter over `app/ui/Button.js`.
- Modify: `app/catana/components/StatusBanner.js`
  - Turn into a thin adapter over `app/ui/Banner.js`.
- Modify: `app/catana/components/GlobalReconnectBanner.js`
  - Switch to the shared `Button`/`Banner` API instead of local one-off styling.
- Modify: `app/catana/components/IdlePromptModal.js`
  - Rebuild around the shared `Dialog`.
- Modify: `app/catana/GameScreen.js`
  - Replace `window.confirm` resign flow with controlled `ResignConfirmDialog`.
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
  - Replace local `GlassPanel`, `GlassInput`, `GlassSelect`, and `PrimaryButton` helpers with shared imports.
- Modify: `app/catana/lobby/LobbyPageClient.js`
  - Replace the custom-game panel/button/select surfaces with shared components where they overlap directly with the new system.
- Modify: `app/catana/__tests__/StatusBanner.source.test.js`
- Modify: `app/catana/__tests__/GlobalReconnectBanner.source.test.js`
- Modify: `app/catana/__tests__/IdlePromptModal.source.test.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`
- Modify: `app/catana/__tests__/GameScreen.connectionBanner.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Task 1: Add The Shared UI Foundation Hooks

**Files:**
- Create: `app/catana/__tests__/SettlexUiFoundation.source.test.js`
- Modify: `package.json`
- Modify: `app/layout.js`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing foundation source test**

```js
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex UI foundation", () => {
  it("adds the Base UI dependency and isolated app root", () => {
    const pkg = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "app/layout.js"), "utf8");

    expect(pkg).toContain('"@base-ui/react"');
    expect(layout).toContain("settlex-ui-root");
    expect(layout).toContain("GlobalReconnectBanner");
  });

  it("defines shared UI tokens and dialog motion hooks in globals", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(css).toContain("--settlex-ui-radius-panel");
    expect(css).toContain("--settlex-ui-duration-fast");
    expect(css).toContain("--settlex-ui-duration-dialog");
    expect(css).toContain(".settlex-ui-root");
    expect(css).toContain("isolation: isolate");
    expect(css).toContain(".settlex-ui-dialog-backdrop");
    expect(css).toContain(".settlex-ui-dialog-popup");
  });
});
```

- [ ] **Step 2: Run the source test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/SettlexUiFoundation.source.test.js`

Expected: FAIL because the dependency, root wrapper, and CSS tokens do not exist yet.

- [ ] **Step 3: Add the minimal foundation changes**

Implementation notes:

- Add `@base-ui/react` to `package.json`.
- Wrap the app body contents in `app/layout.js`:

```jsx
<body className={outfit.className}>
  <div className="settlex-ui-root">
    {children}
    <GlobalReconnectBanner />
  </div>
</body>
```

- Add initial CSS variables and shared motion classes in `app/globals.css`:

```css
:root {
  --settlex-ui-radius-panel: 1rem;
  --settlex-ui-radius-control: 0.75rem;
  --settlex-ui-duration-fast: 140ms;
  --settlex-ui-duration-dialog: 220ms;
  --settlex-ui-ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
}

.settlex-ui-root {
  isolation: isolate;
}

.settlex-ui-dialog-backdrop {
  animation: settlex-ui-backdrop-in var(--settlex-ui-duration-dialog) ease-out both;
}

.settlex-ui-dialog-popup {
  animation: settlex-ui-dialog-in var(--settlex-ui-duration-dialog) var(--settlex-ui-ease-standard) both;
}
```

- [ ] **Step 4: Run the source test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/SettlexUiFoundation.source.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the foundation hook slice**

```bash
git add package.json app/layout.js app/globals.css app/catana/__tests__/SettlexUiFoundation.source.test.js
git commit -m "feat: add Settlex UI foundation hooks"
```

## Task 2: Build Shared Button / Panel / Banner / Field Components

**Files:**
- Create: `app/ui/cn.js`
- Create: `app/ui/Button.js`
- Create: `app/ui/Panel.js`
- Create: `app/ui/Banner.js`
- Create: `app/ui/Input.js`
- Create: `app/ui/Select.js`
- Create: `app/catana/__tests__/SettlexUiRecipes.source.test.js`

- [ ] **Step 1: Write the failing shared-recipe source test**

```js
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex UI recipes", () => {
  it("defines the shared button variants", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/Button.js"), "utf8");
    expect(source).toContain('primary');
    expect(source).toContain('pill');
    expect(source).toContain('chip');
    expect(source).toContain('motion-reduce');
  });

  it("defines the shared panel and banner shells", () => {
    const panel = readFileSync(resolve(process.cwd(), "app/ui/Panel.js"), "utf8");
    const banner = readFileSync(resolve(process.cwd(), "app/ui/Banner.js"), "utf8");
    expect(panel).toContain("rounded-xl");
    expect(panel).toContain("bg-white/25");
    expect(panel).toContain("backdrop-blur-sm");
    expect(banner).toContain("neutral");
    expect(banner).toContain("danger");
  });

  it("defines the shared input and select wrappers", () => {
    const input = readFileSync(resolve(process.cwd(), "app/ui/Input.js"), "utf8");
    const select = readFileSync(resolve(process.cwd(), "app/ui/Select.js"), "utf8");
    expect(input).toContain("bg-white/60");
    expect(select).toContain("focus-visible:ring-2");
  });
});
```

- [ ] **Step 2: Run the recipe source test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js`

Expected: FAIL because `app/ui/*` does not exist yet.

- [ ] **Step 3: Write the minimal shared component layer**

Implementation notes:

- `app/ui/cn.js`

```js
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}
```

- `app/ui/Button.js`

```jsx
import { cn } from "./cn";

const VARIANT_STYLES = {
  primary: "rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-lime-600 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100",
  pill: "rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/60 backdrop-blur-sm transition hover:bg-white/85 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100",
  ghost: "rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/60 hover:text-slate-800",
  chip: "rounded-full px-3 py-1 text-sm font-semibold transition-all"
};

export function Button({ variant = "primary", className = "", ...props }) {
  return <button className={cn(VARIANT_STYLES[variant], className)} {...props} />;
}
```

- `app/ui/Panel.js`

```jsx
import { cn } from "./cn";

export function Panel({ title, right = null, className = "", bodyClassName = "", children }) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/40 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700">
          <div>{title}</div>
          {right}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}
```

- `app/ui/Banner.js`

```jsx
import { cn } from "./cn";

const VARIANTS = {
  neutral: { container: "ring-white/70", indicator: "bg-slate-400", title: "text-slate-800", body: "text-slate-600" },
  danger: { container: "ring-rose-200/90", indicator: "bg-rose-500 animate-pulse motion-reduce:animate-none", title: "text-rose-700", body: "text-rose-600" }
};
```

- `app/ui/Input.js` and `app/ui/Select.js`
  - Wrap native elements with the shared glass-field recipe already repeated in the codebase.

- [ ] **Step 4: Run the recipe source test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the shared recipe slice**

```bash
git add app/ui/cn.js app/ui/Button.js app/ui/Panel.js app/ui/Banner.js app/ui/Input.js app/ui/Select.js app/catana/__tests__/SettlexUiRecipes.source.test.js
git commit -m "feat: add Settlex UI shared recipes"
```

## Task 3: Turn Existing Banner / Button Helpers Into Thin Adapters

**Files:**
- Modify: `app/catana/components/GlassPillButton.js`
- Modify: `app/catana/components/StatusBanner.js`
- Modify: `app/catana/components/GlobalReconnectBanner.js`
- Modify: `app/catana/__tests__/StatusBanner.source.test.js`
- Modify: `app/catana/__tests__/GlobalReconnectBanner.source.test.js`

- [ ] **Step 1: Write the failing adapter source assertions**

Update `app/catana/__tests__/StatusBanner.source.test.js` to expect:

```js
expect(source).toContain('from "../../ui/Banner"');
expect(source).toContain("export function StatusBanner");
```

Update `app/catana/__tests__/GlobalReconnectBanner.source.test.js` to expect:

```js
expect(source).toContain('from "../../ui/Button"');
expect(source).toContain('from "./StatusBanner"');
expect(source).not.toContain("rounded-full px-3 py-2");
```

- [ ] **Step 2: Run the banner tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/StatusBanner.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js`

Expected: FAIL because the adapters still contain the older one-off recipes.

- [ ] **Step 3: Replace the one-off helpers with thin adapters**

Implementation notes:

- `app/catana/components/GlassPillButton.js`

```jsx
import { Button } from "../../ui/Button";

export function GlassPillButton(props) {
  return <Button variant="pill" {...props} />;
}
```

- `app/catana/components/StatusBanner.js`

```jsx
import { Banner } from "../../ui/Banner";

export function StatusBanner(props) {
  return <Banner {...props} />;
}
```

- `app/catana/components/GlobalReconnectBanner.js`
  - Use `Button variant="pill"` for `Rejoin match`.
  - Use `Button variant="ghost"` for `Dismiss`.
  - Keep the existing reconnect logic and copy unchanged.

- [ ] **Step 4: Run the banner tests to verify they pass**

Run: `pnpm exec vitest run app/catana/__tests__/StatusBanner.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the adapter slice**

```bash
git add app/catana/components/GlassPillButton.js app/catana/components/StatusBanner.js app/catana/components/GlobalReconnectBanner.js app/catana/__tests__/StatusBanner.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js
git commit -m "refactor: route banner and pill helpers through Settlex UI"
```

## Task 4: Add Shared Dialog And AlertDialog Wrappers

**Files:**
- Create: `app/ui/Dialog.js`
- Create: `app/ui/AlertDialog.js`
- Create: `app/catana/__tests__/SettlexDialogs.source.test.js`

- [ ] **Step 1: Write the failing dialog-wrapper source test**

```js
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex dialog wrappers", () => {
  it("builds Dialog on Base UI with shared popup/backdrop classes", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/Dialog.js"), "utf8");
    expect(source).toContain("@base-ui/react/dialog");
    expect(source).toContain("settlex-ui-dialog-backdrop");
    expect(source).toContain("settlex-ui-dialog-popup");
  });

  it("builds AlertDialog on Base UI", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/AlertDialog.js"), "utf8");
    expect(source).toContain("@base-ui/react/alert-dialog");
    expect(source).toContain("cancelLabel");
    expect(source).toContain("confirmLabel");
  });
});
```

- [ ] **Step 2: Run the dialog-wrapper test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/SettlexDialogs.source.test.js`

Expected: FAIL because the shared dialog wrappers do not exist yet.

- [ ] **Step 3: Write the minimal dialog wrappers**

Implementation notes:

- `app/ui/Dialog.js`

```jsx
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Button } from "./Button";

export function Dialog({ open, onOpenChange, title, description = null, children, actions = null }) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="settlex-ui-dialog-backdrop fixed inset-0 z-40 bg-blue-900/40 backdrop-blur-sm" />
        <BaseDialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <BaseDialog.Popup className="settlex-ui-dialog-popup w-full max-w-md rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300">
            <BaseDialog.Title className="text-2xl font-bold text-slate-900">{title}</BaseDialog.Title>
            {description ? <BaseDialog.Description className="mt-3 text-sm text-slate-700">{description}</BaseDialog.Description> : null}
            <div className="mt-5">{children}</div>
            {actions ? <div className="mt-5 flex justify-end gap-2">{actions}</div> : null}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
```

- `app/ui/AlertDialog.js`
  - Mirror the same shell, but expose `confirmLabel`, `cancelLabel`, `onConfirm`, and `onCancel`.
  - Use `Button variant="ghost"` and `Button variant="primary"` for the default actions.

- [ ] **Step 4: Run the dialog-wrapper test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/SettlexDialogs.source.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the dialog wrapper slice**

```bash
git add app/ui/Dialog.js app/ui/AlertDialog.js app/catana/__tests__/SettlexDialogs.source.test.js
git commit -m "feat: add Settlex dialog wrappers"
```

## Task 5: Migrate Idle Prompt And Resign Confirmation

**Files:**
- Modify: `app/catana/components/IdlePromptModal.js`
- Create: `app/catana/components/ResignConfirmDialog.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/IdlePromptModal.source.test.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`

- [ ] **Step 1: Write the failing source assertions for the dialog migration**

Update `app/catana/__tests__/IdlePromptModal.source.test.js` to expect:

```js
expect(contents).toContain('from "../../ui/Dialog"');
expect(contents).toContain("Are you still there?");
expect(contents).toContain("I’m still here");
```

Update `app/catana/__tests__/GameScreen.gameOver.test.js` to expect:

```js
expect(contents).toContain("ResignConfirmDialog");
expect(contents).not.toContain("window.confirm");
expect(contents).toContain("moves.resign");
```

- [ ] **Step 2: Run the dialog-migration tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js`

Expected: FAIL because the idle prompt is still hand-rolled and the resign flow still uses `window.confirm`.

- [ ] **Step 3: Rebuild those surfaces on the shared dialog primitives**

Implementation notes:

- `app/catana/components/IdlePromptModal.js`
  - Keep the existing copy and countdown formatting.
  - Replace the hand-rolled overlay shell with the shared `Dialog`.
  - Pass the existing acknowledge button as a `Button variant="primary"`.

- `app/catana/components/ResignConfirmDialog.js`

```jsx
import { AlertDialog } from "../../ui/AlertDialog";

export function ResignConfirmDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resign this match?"
      description="You will immediately lose."
      confirmLabel="Resign"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
    />
  );
}
```

- `app/catana/GameScreen.js`
  - Replace `window.confirm` with `const [showResignConfirm, setShowResignConfirm] = useState(false);`
  - Open the dialog from `handleResign`.
  - Call `moves.resign()` only from the confirm callback.

- [ ] **Step 4: Run the dialog-migration tests to verify they pass**

Run: `pnpm exec vitest run app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the idle/resign migration slice**

```bash
git add app/catana/components/IdlePromptModal.js app/catana/components/ResignConfirmDialog.js app/catana/GameScreen.js app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js
git commit -m "feat: migrate idle and resign prompts to Settlex dialogs"
```

## Task 6: Migrate Existing Form / Panel Proving Grounds

**Files:**
- Create: `app/catana/__tests__/MatchPageClient.standardUi.source.test.js`
- Create: `app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`

- [ ] **Step 1: Write the failing proving-ground source tests**

`app/catana/__tests__/MatchPageClient.standardUi.source.test.js`

```js
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("MatchPageClient standard UI migration", () => {
  it("uses the shared Settlex UI components for the join-seat surface", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain('from "../../../ui/Panel"');
    expect(source).toContain('from "../../../ui/Input"');
    expect(source).toContain('from "../../../ui/Select"');
    expect(source).toContain('from "../../../ui/Button"');
    expect(source).not.toContain("function GlassPanel");
    expect(source).not.toContain("function GlassInput");
    expect(source).not.toContain("function GlassSelect");
    expect(source).not.toContain("function PrimaryButton");
  });
});
```

`app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`

```js
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("LobbyPageClient standard UI migration", () => {
  it("uses shared panels and buttons in the custom-game section", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Panel"');
    expect(source).toContain('from "../../ui/Button"');
  });
});
```

- [ ] **Step 2: Run the proving-ground tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/MatchPageClient.standardUi.source.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`

Expected: FAIL because those pages still define one-off local recipes.

- [ ] **Step 3: Replace the duplicated local recipes with shared imports**

Implementation notes:

- `app/catana/lobby/[matchID]/MatchPageClient.js`
  - Remove local `GlassPanel`, `GlassInput`, `GlassSelect`, and `PrimaryButton`.
  - Import the shared `Panel`, `Input`, `Select`, and `Button`.
  - Keep `GlassPillButton` only if it remains a useful Catana alias over `Button variant="pill"`.

- `app/catana/lobby/LobbyPageClient.js`
  - Migrate the custom-game section and dev-scenario section to use shared `Panel`, `Button`, and `Select` where the styling already maps directly.
  - Leave gameplay-specific or unusual lobby widgets alone if they do not map cleanly in this first pass.

- [ ] **Step 4: Run the proving-ground tests to verify they pass**

Run: `pnpm exec vitest run app/catana/__tests__/MatchPageClient.standardUi.source.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the proving-ground migration slice**

```bash
git add app/catana/lobby/[matchID]/MatchPageClient.js app/catana/lobby/LobbyPageClient.js app/catana/__tests__/MatchPageClient.standardUi.source.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js
git commit -m "refactor: migrate lobby surfaces to Settlex UI primitives"
```

## Task 7: Run Focused Verification And Update Agent Docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Run the focused verification suite**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/SettlexUiFoundation.source.test.js \
  app/catana/__tests__/SettlexUiRecipes.source.test.js \
  app/catana/__tests__/SettlexDialogs.source.test.js \
  app/catana/__tests__/StatusBanner.source.test.js \
  app/catana/__tests__/GlobalReconnectBanner.source.test.js \
  app/catana/__tests__/IdlePromptModal.source.test.js \
  app/catana/__tests__/GameScreen.gameOver.test.js \
  app/catana/__tests__/GameScreen.connectionBanner.test.js \
  app/catana/__tests__/MatchPageClient.standardUi.source.test.js \
  app/catana/__tests__/LobbyPageClient.standardUi.source.test.js
```

Expected: PASS.

- [ ] **Step 2: Run targeted lint and diff checks**

Run:

```bash
pnpm exec eslint \
  app/layout.js \
  app/globals.css \
  app/ui/*.js \
  app/catana/components/GlassPillButton.js \
  app/catana/components/StatusBanner.js \
  app/catana/components/GlobalReconnectBanner.js \
  app/catana/components/IdlePromptModal.js \
  app/catana/components/ResignConfirmDialog.js \
  app/catana/GameScreen.js \
  'app/catana/lobby/[matchID]/MatchPageClient.js' \
  app/catana/lobby/LobbyPageClient.js

git diff --check
```

Expected:

- `eslint` exits `0`
- `git diff --check` produces no output

- [ ] **Step 3: Update progress and notes**

Add a new `docs/agent/PROGRESS.md` entry describing:

- the first Settlex standard UI components now exist under `app/ui/`,
- the resign and idle prompts now use shared dialog primitives,
- the reconnect banner and the first lobby surfaces now route through shared button/panel/banner/field recipes.

Add or update `docs/agent/NOTES.md` with:

- the first implementation slice landed under `app/ui/`,
- `@base-ui/react` is now the standard primitive dependency for future standard overlay/popover work,
- standard UI surfaces should prefer the new shared components over inline Tailwind recipe duplication.

- [ ] **Step 4: Commit verification and docs**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record Settlex UI foundation rollout"
```

## Follow-On Plans After Phase 1

Write separate plans for:

1. `Toast`, `Tooltip`, and `Popover`
2. `Tabs`, `ScrollArea`, and left-rail/chat/log shell migration
3. `Slider`, `Switch`, `Checkbox`, and custom-game/settings controls
4. `Table` and leaderboard/profile/list surfaces

Each of those should build on the foundation created here rather than introducing new one-off recipes.
