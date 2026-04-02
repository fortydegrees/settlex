# Global Reconnect Banner Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global "Rejoin match" banner that appears anywhere in the app for the browser's most recently saved Catana match, using local state plus lightweight lobby validation.

**Architecture:** Keep the logic split into three small seams: local storage helpers for saved match state, a pure reconnect-banner candidate resolver that can be unit-tested in Node, and a thin client banner component mounted from the root layout as a fixed overlay. Reuse the existing lobby match endpoint only as a weak existence check, and reuse the existing credential-loading flow on the match page instead of introducing a new reconnect transport.

**Tech Stack:** Next.js app router, React client components, existing Catana Tailwind/glass UI, Vitest (Node environment), browser localStorage, existing boardgame.io lobby endpoints.

---

## File Structure

### New / focused files

- Create: `app/catana/utils/activeMatchStorage.js`
  - Single source of truth for:
    - `catana:last-active-match`
    - `catana:lobby:credentials:${matchID}:${playerID}`
    - safe read/write/clear helpers that fail closed when localStorage is unavailable.
- Create: `app/catana/utils/reconnectBanner.js`
  - Pure-ish resolver for:
    - path suppression,
    - lightweight lobby validation,
    - deriving the banner candidate from saved local state.
- Create: `app/catana/components/GlobalReconnectBanner.js`
  - Client-only fixed overlay banner mounted from the root layout.
- Create: `app/catana/__tests__/activeMatchStorage.test.js`
  - Real unit tests for storage parsing, writing, and clearing.
- Create: `app/catana/__tests__/reconnectBanner.test.js`
  - Real unit tests for banner-candidate resolution using injected storage + fetch stubs.
- Create: `app/catana/__tests__/GlobalReconnectBanner.source.test.js`
  - Source-level wiring checks for layout/component copy and route target.

### Existing files to modify

- Modify: `app/layout.js`
  - Mount the reconnect banner as a fixed overlay so full-screen pages do not cover it.
- Modify: `app/catana/lobby/LobbyPageClient.js`
  - Replace duplicated credential-key logic with shared helpers.
  - Save `lastActiveMatch` on successful join/create flows.
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
  - Replace duplicated credential-key logic with shared helpers.
  - Save `lastActiveMatch` when valid credentials resume the seat.
- Modify: `app/catana/GameScreen.js`
  - Clear the saved active-match record when the seated match reaches known game over.
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

### Dirty worktree warning

The current worktree already contains uncommitted disconnect-follow-up server changes. Do not stage or commit those unrelated files while implementing this banner plan unless the human explicitly asks to bundle them. Stage only the reconnect-banner files listed in this plan.

## Task 1: Build Shared Active-Match Storage Helpers

**Files:**
- Create: `app/catana/utils/activeMatchStorage.js`
- Test: `app/catana/__tests__/activeMatchStorage.test.js`

- [ ] **Step 1: Write the failing storage-helper tests**

```js
import { describe, expect, it } from "vitest";
import {
  ACTIVE_MATCH_STORAGE_KEY,
  getCredentialsStorageKey,
  readLastActiveMatch,
  writeLastActiveMatch,
  clearLastActiveMatch
} from "../utils/activeMatchStorage";

describe("activeMatchStorage", () => {
  it("builds the seat credential key", () => {
    expect(
      getCredentialsStorageKey({ matchID: "abc", playerID: "1" })
    ).toBe("catana:lobby:credentials:abc:1");
  });

  it("round-trips the last active match record", () => {
    const storage = createMemoryStorage();
    writeLastActiveMatch(storage, {
      matchID: "abc",
      playerID: "1",
      playerName: "Alice",
      savedAtMs: 123
    });

    expect(readLastActiveMatch(storage)).toEqual({
      matchID: "abc",
      playerID: "1",
      playerName: "Alice",
      savedAtMs: 123
    });
  });

  it("fails closed on malformed JSON", () => {
    const storage = createMemoryStorage({
      [ACTIVE_MATCH_STORAGE_KEY]: "{bad json"
    });
    expect(readLastActiveMatch(storage)).toBeNull();
  });

  it("clears the saved active match", () => {
    const storage = createMemoryStorage();
    writeLastActiveMatch(storage, { matchID: "abc", playerID: "1" });
    clearLastActiveMatch(storage);
    expect(readLastActiveMatch(storage)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the storage test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/activeMatchStorage.test.js`

Expected: FAIL because `app/catana/utils/activeMatchStorage.js` does not exist yet.

- [ ] **Step 3: Write the minimal storage implementation**

```js
export const ACTIVE_MATCH_STORAGE_KEY = "catana:last-active-match";

export const getCredentialsStorageKey = ({ matchID, playerID }) =>
  `catana:lobby:credentials:${matchID}:${playerID}`;

const normalizeRecord = (value) => {
  if (!value || typeof value !== "object") return null;
  if (!value.matchID || value.playerID == null) return null;
  return {
    matchID: String(value.matchID),
    playerID: String(value.playerID),
    playerName:
      typeof value.playerName === "string" ? value.playerName : undefined,
    savedAtMs:
      Number.isFinite(Number(value.savedAtMs)) ? Number(value.savedAtMs) : Date.now()
  };
};

export function readLastActiveMatch(storage = window?.localStorage) {
  try {
    const raw = storage?.getItem?.(ACTIVE_MATCH_STORAGE_KEY);
    if (!raw) return null;
    return normalizeRecord(JSON.parse(raw));
  } catch (err) {
    return null;
  }
}

export function writeLastActiveMatch(storage = window?.localStorage, record) {
  const normalized = normalizeRecord(record);
  if (!normalized) return;
  try {
    storage?.setItem?.(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    // ignore
  }
}

export function clearLastActiveMatch(storage = window?.localStorage) {
  try {
    storage?.removeItem?.(ACTIVE_MATCH_STORAGE_KEY);
  } catch (err) {
    // ignore
  }
}
```

- [ ] **Step 4: Run the storage test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/activeMatchStorage.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the storage helper slice**

```bash
git add app/catana/utils/activeMatchStorage.js app/catana/__tests__/activeMatchStorage.test.js
git commit -m "feat: add active match storage helpers"
```

## Task 2: Build The Reconnect-Banner Candidate Resolver

**Files:**
- Create: `app/catana/utils/reconnectBanner.js`
- Test: `app/catana/__tests__/reconnectBanner.test.js`
- Reference: `docs/superpowers/specs/2026-04-02-global-reconnect-banner-design.md`

- [ ] **Step 1: Write the failing resolver tests**

```js
import { describe, expect, it, vi } from "vitest";
import { resolveReconnectBannerCandidate } from "../utils/reconnectBanner";

describe("resolveReconnectBannerCandidate", () => {
  it("returns null when no active match is saved", async () => {
    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage: createMemoryStorage(),
      fetchImpl: vi.fn()
    });
    expect(result).toBeNull();
  });

  it("returns null when the seat credentials key is missing", async () => {
    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage: createMemoryStorage({
        "catana:last-active-match": JSON.stringify({
          matchID: "m1",
          playerID: "0"
        })
      }),
      fetchImpl: vi.fn()
    });
    expect(result).toBeNull();
  });

  it("returns null on the active match page", async () => {
    const storage = seededStorageForMatch("m1", "0");
    const result = await resolveReconnectBannerCandidate({
      pathname: "/catana/lobby/m1",
      storage,
      fetchImpl: vi.fn()
    });
    expect(result).toBeNull();
  });

  it("returns a banner candidate when storage and match validation succeed", async () => {
    const storage = seededStorageForMatch("m1", "0", "Alice");
    const fetchImpl = vi.fn().mockResolvedValue(okJson({
      matchID: "m1",
      players: [{ id: 0, name: "Alice" }, { id: 1, name: "Bren" }]
    }));

    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl,
      lobbyBaseUrl: "http://localhost:8080"
    });

    expect(result).toEqual({
      matchID: "m1",
      playerID: "0",
      playerName: "Alice",
      href: "/catana/lobby/m1?playerID=0"
    });
  });

  it("returns null when the lobby match validation fails", async () => {
    const storage = seededStorageForMatch("m1", "0");
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await resolveReconnectBannerCandidate({
      pathname: "/",
      storage,
      fetchImpl
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the resolver test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/reconnectBanner.test.js`

Expected: FAIL because `app/catana/utils/reconnectBanner.js` does not exist yet.

- [ ] **Step 3: Write the minimal resolver implementation**

```js
import {
  getCredentialsStorageKey,
  readLastActiveMatch
} from "./activeMatchStorage";

const defaultLobbyBaseUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8080";
  return `${window.location.protocol}//${window.location.hostname}:8080`;
};

export const isSameMatchPath = (pathname, matchID) =>
  pathname === `/catana/lobby/${matchID}`;

export async function resolveReconnectBannerCandidate({
  pathname,
  storage,
  fetchImpl = fetch,
  lobbyBaseUrl = defaultLobbyBaseUrl()
}) {
  const activeMatch = readLastActiveMatch(storage);
  if (!activeMatch) return null;
  if (isSameMatchPath(pathname, activeMatch.matchID)) return null;

  const credentialsKey = getCredentialsStorageKey(activeMatch);
  if (!storage?.getItem?.(credentialsKey)) {
    clearLastActiveMatch(storage);
    return null;
  }

  let response;
  try {
    response = await fetchImpl(`${lobbyBaseUrl}/games/catan/${activeMatch.matchID}`, {
      cache: "no-store"
    });
  } catch (err) {
    return null;
  }
  if (!response?.ok) {
    if (response?.status === 404) {
      clearLastActiveMatch(storage);
    }
    return null;
  }

  const match = await response.json();
  const savedSeatStillExists = Array.isArray(match?.players) &&
    match.players.some((player) => String(player?.id) === activeMatch.playerID);
  if (!savedSeatStillExists) {
    clearLastActiveMatch(storage);
    return null;
  }

  return {
    matchID: activeMatch.matchID,
    playerID: activeMatch.playerID,
    playerName: activeMatch.playerName,
    href: `/catana/lobby/${activeMatch.matchID}?playerID=${encodeURIComponent(activeMatch.playerID)}`
  };
}
```

- [ ] **Step 4: Run the resolver test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/reconnectBanner.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the resolver slice**

```bash
git add app/catana/utils/reconnectBanner.js app/catana/__tests__/reconnectBanner.test.js
git commit -m "feat: add reconnect banner validation"
```

## Task 3: Add The Global Banner UI And Layout Wiring

**Files:**
- Create: `app/catana/components/GlobalReconnectBanner.js`
- Modify: `app/layout.js`
- Test: `app/catana/__tests__/GlobalReconnectBanner.source.test.js`
- Reference: `docs/agent/skills/catana-brand/SKILL.md`

- [ ] **Step 1: Write the failing source-level banner wiring test**

```js
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("GlobalReconnectBanner wiring", () => {
  it("mounts the reconnect banner from the root layout", () => {
    const source = readFileSync(resolve(process.cwd(), "app/layout.js"), "utf8");
    expect(source).toContain("GlobalReconnectBanner");
  });

  it("renders the approved reconnect copy and route target", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/components/GlobalReconnectBanner.js"),
      "utf8"
    );
    expect(source).toContain("You're already in a game");
    expect(source).toContain("Rejoin match");
    expect(source).toContain("Dismiss");
    expect(source).toContain("resolveReconnectBannerCandidate");
  });
});
```

- [ ] **Step 2: Run the banner wiring test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/GlobalReconnectBanner.source.test.js`

Expected: FAIL because the new component is not mounted yet.

- [ ] **Step 3: Write the minimal banner component and layout mount**

```jsx
// app/catana/components/GlobalReconnectBanner.js
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlassPillButton } from "./GlassPillButton";
import { resolveReconnectBannerCandidate } from "../utils/reconnectBanner";

export function GlobalReconnectBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (dismissed) return;
    resolveReconnectBannerCandidate({ pathname, storage: window.localStorage })
      .then((nextCandidate) => {
        if (!cancelled) setCandidate(nextCandidate);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, dismissed]);

  if (dismissed || !candidate) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-slate-800 shadow-xl ring-1 ring-white/70 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">You're already in a game</div>
          <div className="text-sm text-slate-600">
            Return to your latest Catana match.
          </div>
        </div>
        <GlassPillButton onClick={() => router.push(candidate.href)}>
          Rejoin match
        </GlassPillButton>
        <button type="button" onClick={() => setDismissed(true)}>Dismiss</button>
      </div>
    </div>
  );
}

// app/layout.js
import { GlobalReconnectBanner } from "./catana/components/GlobalReconnectBanner";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        {children}
        <GlobalReconnectBanner />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run the banner wiring test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/GlobalReconnectBanner.source.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the banner UI slice**

```bash
git add app/layout.js app/catana/components/GlobalReconnectBanner.js app/catana/__tests__/GlobalReconnectBanner.source.test.js
git commit -m "feat: add global reconnect banner"
```

## Task 4: Persist The Active Match During Join / Resume And Clear It On Game Over

**Files:**
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Modify: `app/catana/GameScreen.js`
- Test: `app/catana/__tests__/ReconnectBannerPersistence.source.test.js`

- [ ] **Step 1: Write the failing source-level persistence test**

```js
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("reconnect banner persistence wiring", () => {
  it("writes the last active match from lobby join flows", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );
    expect(source).toContain("writeLastActiveMatch");
  });

  it("writes the last active match when resuming a seated match page", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );
    expect(source).toContain("writeLastActiveMatch");
  });

  it("clears the saved match from GameScreen when the match ends", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/GameScreen.js"),
      "utf8"
    );
    expect(source).toContain("clearLastActiveMatch");
  });
});
```

- [ ] **Step 2: Run the persistence test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/ReconnectBannerPersistence.source.test.js`

Expected: FAIL before the helper calls are wired in.

- [ ] **Step 3: Write the minimal persistence implementation**

```js
// LobbyPageClient.js and MatchPageClient.js
import {
  getCredentialsStorageKey,
  writeLastActiveMatch
} from "../utils/activeMatchStorage";

writeLastActiveMatch(window.localStorage, {
  matchID,
  playerID: String(playerID),
  playerName: name,
  savedAtMs: Date.now()
});

// GameScreen.js
import {
  clearLastActiveMatch,
  readLastActiveMatch
} from "./utils/activeMatchStorage";

useEffect(() => {
  if (!isGameOver || !matchID || playerID == null || typeof window === "undefined") return;
  const saved = readLastActiveMatch(window.localStorage);
  if (
    saved &&
    saved.matchID === String(matchID) &&
    saved.playerID === String(playerID)
  ) {
    clearLastActiveMatch(window.localStorage);
  }
}, [isGameOver, matchID, playerID]);
```

Implementation notes:
- Keep the new helper imported from one place instead of duplicating localStorage-key logic again.
- Use `../utils/activeMatchStorage` from `LobbyPageClient.js` and `../../utils/activeMatchStorage` from `lobby/[matchID]/MatchPageClient.js`.
- Save the record only for seated users with valid credentials.
- Do not change the existing reconnect route shape or match-page credential loading flow.

- [ ] **Step 4: Run the persistence test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/ReconnectBannerPersistence.source.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the persistence slice**

```bash
git add app/catana/lobby/LobbyPageClient.js app/catana/lobby/[matchID]/MatchPageClient.js app/catana/GameScreen.js app/catana/__tests__/ReconnectBannerPersistence.source.test.js
git commit -m "feat: persist latest reconnectable match"
```

## Task 5: Update Notes And Run Full Verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Update agent docs with the implemented reconnect-banner behavior**

Add brief notes covering:
- the new `lastActiveMatch` local record,
- the global fixed overlay banner,
- the fact that validation is intentionally weak and linked to `docs/mvp-compromises.md`.

- [ ] **Step 2: Run the focused reconnect-banner suite**

Run:

```bash
pnpm vitest run \
  app/catana/__tests__/activeMatchStorage.test.js \
  app/catana/__tests__/reconnectBanner.test.js \
  app/catana/__tests__/GlobalReconnectBanner.source.test.js \
  app/catana/__tests__/ReconnectBannerPersistence.source.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run: `pnpm verify`

Expected:
- all tests pass,
- lint exits `0`,
- warning-only existing `<img>` / hook-deps output may remain.

- [ ] **Step 4: Commit the docs / verification slice**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note reconnect banner MVP behavior"
```

- [ ] **Step 5: Prepare execution handoff**

Before handing off or continuing:
- confirm that the reconnect-banner commits stage only the intended files,
- leave the pre-existing unrelated disconnect-follow-up changes untouched unless the human explicitly asks to bundle them,
- summarize any remaining stale-banner risk exactly as documented in `docs/mvp-compromises.md`.
