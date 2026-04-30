# Friend Challenge Rehydration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a pending `Play a Friend` invite after lobby refresh so the waiting modal reappears, explicit close still cancels, and terminal challenge states clear local resume state.

**Architecture:** Keep this slice narrow to friend challenges only. Add a small local-storage helper for the pending invite pointer plus a pure-ish rehydration helper that asks the existing challenge route for server truth and returns either `pending`, `accepted`, or `clear`. `LobbyPageClient` stays responsible for wiring the helper into modal state and routing.

**Tech Stack:** Next.js app router client components, browser localStorage, existing app challenge routes, Vitest, ESLint.

---

### Task 1: Add Pending Friend Challenge Storage + Rehydration Helpers

**Files:**
- Create: `app/catana/utils/pendingFriendChallenge.js`
- Create: `app/catana/__tests__/pendingFriendChallenge.test.js`

- [ ] **Step 1: Write failing helper tests**
- [ ] **Step 2: Run `pnpm exec vitest run app/catana/__tests__/pendingFriendChallenge.test.js` and confirm it fails**
- [ ] **Step 3: Implement minimal storage + rehydration helpers**
- [ ] **Step 4: Re-run `pnpm exec vitest run app/catana/__tests__/pendingFriendChallenge.test.js` and confirm it passes**

### Task 2: Wire Lobby Friend Challenge Flow To Persist + Restore

**Files:**
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Modify: `app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`

- [ ] **Step 1: Write/extend failing source assertions for persisted friend-challenge resume wiring**
- [ ] **Step 2: Run `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js` and confirm it fails**
- [ ] **Step 3: Update `LobbyPageClient` to write the pending pointer on invite creation, restore it on mount, and clear it on accept/cancel/expiry**
- [ ] **Step 4: Re-run `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/pendingFriendChallenge.test.js` and confirm they pass**

### Task 3: Update Notes And Verify The Slice

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Record the resumed-friend-challenge behavior and the architectural rule in agent docs**
- [ ] **Step 2: Run focused verification**
  - `pnpm exec vitest run app/catana/__tests__/pendingFriendChallenge.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/reconnectBanner.test.js`
  - `pnpm exec eslint app/catana/utils/pendingFriendChallenge.js app/catana/lobby/LobbyPageClient.js app/catana/__tests__/pendingFriendChallenge.test.js`
