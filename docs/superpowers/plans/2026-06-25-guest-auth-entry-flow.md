# Guest Auth Entry Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the agreed homepage guest/auth entry flow: bot play stays silent, online/friend play uses a username-first guest checkpoint, and top-right sign-in uses a modal account entry surface.

**Architecture:** Add one product-specific `AccountEntryModal` composed from existing Settlex primitives (`Dialog`, `Button`, `Input`, `Popover`, `SwatchPicker`). Keep full profile editing in `IdentityModal`; use the new modal only for auth-first, save-profile, and play-username entry. Extend `useLobbyHomeActions` with explicit entry-modal modes and pending play intents instead of reusing the full identity picker as the online gate.

**Tech Stack:** Next.js 13 app UI, React client components, Base UI-backed Settlex primitives, Better Auth client, Vitest source tests, pnpm.

---

### Task 1: Lock The Source Contract

**Files:**
- Modify: `app/catana/__tests__/HomeDemoBoard.source.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.identity.test.js`

- [x] **Step 1: Add failing homepage source tests**

Add assertions that the homepage imports `AccountEntryModal`, no longer renders logged-out sign-in choices inside `SystemAccountMenu`, opens an auth modal from the top-right sign-in trigger, and renders the play-entry modal when the hook says it is open.

- [x] **Step 2: Add failing lobby action source tests**

Add assertions that `useLobbyHomeActions` exposes `entryModal`, `openSignIn`, `openPlayUsername`, `handlePlayUsernameSubmit`, and `closeEntryModal`; that `playOnline` and `playFriend` route through the play-username modal when no profile exists; and that `playBot` still uses `ensureGeneratedGuestAccount`.

- [x] **Step 3: Verify red**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js --reporter=dot
```

Expected: fails because `AccountEntryModal` and the new hook API do not exist yet.

### Task 2: Add AccountEntryModal

**Files:**
- Create: `app/catana/lobby/AccountEntryModal.js`
- Modify: `app/catana/lobby/IdentityModal.js`

- [x] **Step 1: Extract reusable avatar picker pieces**

Export the existing `EmojiPicker` from `IdentityModal.js` so `AccountEntryModal` can reveal the same optional avatar picker instead of inventing a second one.

- [x] **Step 2: Build the product modal**

Create `AccountEntryModal` with three modes:

- `play-username`: username-first guest profile creation, generated name prefilled, avatar/color preview, optional expanded picker on avatar click, CTA copy based on `intent`.
- `auth-first`: email/password sign-in/create account, configured provider buttons, `Continue as guest`.
- `save-profile`: same auth controls with copy that frames saving the current guest profile.

The component must use `Dialog`, `Button`, `Input`, `Popover`, and `SwatchPicker`; it must not add a new shared primitive or import another UI library.

- [x] **Step 3: Run focused tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/LobbyPageClient.identity.test.js --reporter=dot
```

Expected: tests involving `IdentityModal` primitives still pass.

### Task 3: Wire The Entry State

**Files:**
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/home/HomeTableClient.js`

- [x] **Step 1: Add entry modal state to the hook**

Add state for `entryModal`, pending play action, and pending play intent. Expose actions:

- `openSignIn`
- `openPlayUsername`
- `openSaveProfile`
- `closeEntryModal`
- `handlePlayUsernameSubmit`
- `handleAuthEmailSignIn`
- `handleAuthEmailSignUp`
- `continueAsGuest`

- [x] **Step 2: Preserve play behavior**

Keep `playBot` unchanged on `ensureGeneratedGuestAccount`. Change `playOnline` and `playFriend` so no-profile users see `play-username` first, while existing guest/saved profiles continue directly.

- [x] **Step 3: Wire homepage chrome**

Change top-right logged-out `Sign in` from popover menu to a trigger that calls `openSignIn`. Render `AccountEntryModal` from `HomeTableClient` when `entryModal.open` is true. Keep the account popover for existing profiles.

- [x] **Step 4: Run focused tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js --reporter=dot
```

Expected: tests pass.

### Task 4: Verification And Docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [x] **Step 1: Lint touched code**

Run:

```bash
pnpm exec eslint app/catana/lobby/AccountEntryModal.js app/catana/lobby/IdentityModal.js app/catana/lobby/useLobbyHomeActions.js app/catana/home/HomeTableClient.js app/catana/__tests__/HomeDemoBoard.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js
```

Expected: exit 0.

- [x] **Step 2: Run source/auth-adjacent test lane**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/__tests__/accountPage.source.test.js app/__tests__/api/authOptionsRoute.test.js app/__tests__/api/accountGuestRoute.test.js --reporter=dot
```

Expected: tests pass.

- [x] **Step 3: Check whitespace**

Run:

```bash
git diff --check -- app/catana/lobby/AccountEntryModal.js app/catana/lobby/IdentityModal.js app/catana/lobby/useLobbyHomeActions.js app/catana/home/HomeTableClient.js app/catana/__tests__/HomeDemoBoard.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md docs/superpowers/plans/2026-06-25-guest-auth-entry-flow.md docs/superpowers/specs/2026-06-25-guest-auth-and-play-entry-flow-design.md
```

Expected: no output.

- [x] **Step 4: Update agent docs**

Add a short status entry and durable note that the implementation uses `AccountEntryModal` with existing Settlex primitives and reference-informed behavior, not a new shared primitive.
