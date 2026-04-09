# Match Lifecycle And `/g/:matchID` Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/g/:matchID` the canonical live-or-archived match URL, keep finished live matches available for postgame chat until the last player leaves plus a grace timer, and fall back to read-only archived postgame/replay on the same URL after cleanup.

**Architecture:** Keep the current bgio live client for active matches, but add an app-level match lifecycle resolver for `/g/:matchID`. Persist chat outside bgio, archive finished match + chat immediately, retain the live finished match while players are connected, then clean it up after a disconnect-based grace period and render archived mode from Postgres on later visits.

**Tech Stack:** Next.js App Router, React client components, boardgame.io server/client + Socket.IO, Koa server hooks, Postgres migrations/queries, Vitest.

---

## File Map

### Database and archive queries

- Create: `lib/server/db/sql/0003_archived_match_chat.sql`
  - Adds durable archived chat storage.
- Modify: `lib/server/replays/getArchivedReplay.js`
  - Loads archived chat alongside replay payload.
- Create: `lib/server/matches/getArchivedMatchByMatchId.js`
  - Reads archived match data by `bgio_match_id` for `/g/:matchID`.

### Live server chat and retention

- Create: `server/chat/MatchChatStore.js`
  - In-memory per-match chat history for live retention and later archival.
- Create: `server/lifecycle/FinishedMatchRetentionManager.js`
  - Holds finished live matches until disconnect-based cleanup is allowed.
- Modify: `server/timers/timerPubSub.js`
  - Records chat messages and forwards match state / matchData to the retention manager.
- Modify: `server/archive/archiveFinishedMatch.js`
  - Writes archived chat rows during archive.
- Modify: `server/archive/ArchiveManager.js`
  - Exposes archived eligibility to the retention manager without re-enabling eager cleanup.
- Modify: `server/server.js`
  - Wires chat store, archive manager, and retention manager together.

### Match lifecycle resolution and `/g/:matchID`

- Create: `lib/server/matches/getMatchPageData.js`
  - Resolves `live_unfinished | live_finished | archived | missing` without bgio auto-creating missing matches.
- Create: `app/g/[matchID]/page.js`
  - Canonical match route.
- Create: `app/g/[matchID]/page-content.js`
  - Server-side branch between live and archived rendering.
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
  - Repoint all internal navigation to `/g/:matchID`.
- Modify: `app/catana/lobby/LobbyPageClient.js`
  - Repoint create/join/find-match flows to `/g/:matchID`.
- Modify: `app/catana/utils/reconnectBanner.js`
  - Repoint reconnect banner URLs and “same page” checks to `/g/:matchID`.
- Delete: `app/catana/lobby/[matchID]/page.js`
  - Removes the old match URL.
- Delete: `app/catana/lobby/page.js`
  - Removes the old lobby route entrypoint.

### Tests and docs

- Create: `server/__tests__/MatchChatStore.test.js`
- Create: `server/__tests__/FinishedMatchRetentionManager.test.js`
- Create: `lib/server/__tests__/getArchivedMatchByMatchId.test.js`
- Create: `lib/server/__tests__/getMatchPageData.test.js`
- Create: `app/__tests__/gMatchPage.test.js`
- Modify: `server/__tests__/ArchiveManager.test.js`
- Modify: `server/__tests__/timerPubSub.test.js`
- Modify: `app/catana/__tests__/reconnectBanner.test.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Modify: `lib/server/__tests__/matchBootstrap.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions

- `/g/:matchID` is the only canonical match permalink.
- `app/page.js` may continue to host the entry/create/join UI; this plan only removes the old `/catana/lobby` route path.
- Archived chat ships as read-only full history in v1; synchronized chat replay is explicitly deferred.

### Task 1: Add Archived Chat Storage And Archived-by-Match Queries

**Files:**
- Create: `lib/server/db/sql/0003_archived_match_chat.sql`
- Create: `lib/server/matches/getArchivedMatchByMatchId.js`
- Modify: `lib/server/replays/getArchivedReplay.js`
- Test: `lib/server/__tests__/dbMigrations.test.js`
- Test: `lib/server/__tests__/getArchivedMatchByMatchId.test.js`

- [ ] **Step 1: Write the failing migration and query tests**

```js
expect(migrationSql).toContain("create table if not exists archived_match_chat_messages");
expect(result.chatMessages).toEqual([
  expect.objectContaining({
    actorId: "0",
    message: "gg",
  }),
]);
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/getArchivedMatchByMatchId.test.js`

Expected: FAIL because the new table/query helper does not exist yet.

- [ ] **Step 3: Add the migration and archived-by-match query helper**

```sql
CREATE TABLE IF NOT EXISTS archived_match_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_match_id UUID NOT NULL REFERENCES archived_matches(id) ON DELETE CASCADE,
  message_seq INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (archived_match_id, message_seq)
);
```

```js
export async function getArchivedMatchByMatchId(matchID, { pool = getPool() } = {}) {
  // SELECT archived match + replay + players + chat rows by bgio_match_id
}
```

- [ ] **Step 4: Extend archived replay reads to include chat rows**

```js
return {
  match: { ... },
  participants,
  initialState,
  finalState,
  log,
  chatMessages,
};
```

- [ ] **Step 5: Run the tests again to verify they pass**

Run: `pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/getArchivedMatchByMatchId.test.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/server/db/sql/0003_archived_match_chat.sql lib/server/matches/getArchivedMatchByMatchId.js lib/server/replays/getArchivedReplay.js lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/getArchivedMatchByMatchId.test.js
git commit -m "feat: add archived chat storage and match lookup"
```

### Task 2: Capture Live Chat And Archive It At Game End

**Files:**
- Create: `server/chat/MatchChatStore.js`
- Modify: `server/timers/timerPubSub.js`
- Modify: `server/archive/archiveFinishedMatch.js`
- Modify: `server/server.js`
- Test: `server/__tests__/MatchChatStore.test.js`
- Test: `server/__tests__/timerPubSub.test.js`
- Test: `server/__tests__/ArchiveManager.test.js`

- [ ] **Step 1: Write the failing chat-store and pubsub tests**

```js
store.onChatMessage("m1", {
  id: "chat_1",
  sender: "0",
  payload: { message: "gg" },
});

expect(store.getMessages("m1")).toEqual([
  expect.objectContaining({
    actorId: "0",
    messageText: "gg",
  }),
]);
```

```js
pubSub.publish("MATCH-m1", {
  type: "chat",
  args: ["m1", { id: "chat_1", sender: "0", payload: "gg" }],
});

expect(chatStore.onChatMessage).toHaveBeenCalled();
```

- [ ] **Step 2: Run the server chat tests to verify they fail**

Run: `pnpm exec vitest run server/__tests__/MatchChatStore.test.js server/__tests__/timerPubSub.test.js server/__tests__/ArchiveManager.test.js`

Expected: FAIL because live chat is not persisted or archived yet.

- [ ] **Step 3: Implement the live chat store**

```js
export class MatchChatStore {
  onChatMessage(matchID, rawMessage) { /* normalize + append with timestamp/seq */ }
  getMessages(matchID) { /* clone array */ }
  clear(matchID) { /* delete retained messages */ }
}
```

- [ ] **Step 4: Hook `timerPubSub` to capture `chat` payloads**

```js
if (payload?.type === "chat") {
  chatStore?.onChatMessage?.(matchID, payload.args?.[1]);
}
```

- [ ] **Step 5: Pass retained chat into `archiveFinishedMatch` and write chat rows**

```js
await archiveFinishedMatch({
  ...,
  chatMessages: matchChatStore.getMessages(matchID),
});
```

```js
await client.query(
  `INSERT INTO archived_match_chat_messages (...) VALUES (...)`,
  [...]
);
```

- [ ] **Step 6: Run the server chat tests again**

Run: `pnpm exec vitest run server/__tests__/MatchChatStore.test.js server/__tests__/timerPubSub.test.js server/__tests__/ArchiveManager.test.js`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/chat/MatchChatStore.js server/timers/timerPubSub.js server/archive/archiveFinishedMatch.js server/server.js server/__tests__/MatchChatStore.test.js server/__tests__/timerPubSub.test.js server/__tests__/ArchiveManager.test.js
git commit -m "feat: capture and archive live match chat"
```

### Task 3: Add Disconnect-Based Finished Match Retention Cleanup

**Files:**
- Create: `server/lifecycle/FinishedMatchRetentionManager.js`
- Modify: `server/archive/ArchiveManager.js`
- Modify: `server/timers/timerPubSub.js`
- Modify: `server/server.js`
- Test: `server/__tests__/FinishedMatchRetentionManager.test.js`
- Test: `server/__tests__/timerPubSub.test.js`

- [ ] **Step 1: Write the failing retention-manager tests**

```js
manager.onState("m1", { ctx: { gameover: { winner: "0" } } });
manager.onMatchData("m1", [
  { id: "0", isConnected: false },
  { id: "1", isConnected: false },
]);

vi.advanceTimersByTime(300000);

expect(cleanupArchivedMatch).toHaveBeenCalledWith({ matchID: "m1" });
```

```js
manager.onMatchData("m1", [{ id: "0", isConnected: true }]);
expect(cleanupArchivedMatch).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the retention tests to verify they fail**

Run: `pnpm exec vitest run server/__tests__/FinishedMatchRetentionManager.test.js server/__tests__/timerPubSub.test.js`

Expected: FAIL because there is no disconnect-based cleanup manager yet.

- [ ] **Step 3: Implement the retention manager with archive gating**

```js
export class FinishedMatchRetentionManager {
  onState(matchID, state) { /* remember finished state */ }
  onMatchData(matchID, matchData) { /* start/cancel cleanup timer based on presence */ }
}
```

```js
if (!isFinished || hasConnectedSeat || !isArchived(matchID)) {
  cancelCleanup(matchID);
  return;
}
scheduleCleanup(matchID);
```

- [ ] **Step 4: Expose archive eligibility and wire the manager in `server/server.js`**

```js
const retentionManager = new FinishedMatchRetentionManager({
  isArchived: (matchID) => archiveManager.isArchived(matchID),
  cleanupArchivedMatch,
  clearChatMessages: (matchID) => chatStore.clear(matchID),
});
```

- [ ] **Step 5: Forward `state` and `matchData` into the retention manager**

```js
retentionManager?.onState?.(matchID, state);
retentionManager?.onMatchData?.(matchID, matchData);
```

- [ ] **Step 6: Run the retention tests again**

Run: `pnpm exec vitest run server/__tests__/FinishedMatchRetentionManager.test.js server/__tests__/timerPubSub.test.js server/__tests__/ArchiveManager.test.js`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/lifecycle/FinishedMatchRetentionManager.js server/archive/ArchiveManager.js server/timers/timerPubSub.js server/server.js server/__tests__/FinishedMatchRetentionManager.test.js server/__tests__/timerPubSub.test.js server/__tests__/ArchiveManager.test.js
git commit -m "feat: retain finished matches until disconnect-based cleanup"
```

### Task 4: Build The Server Match Lifecycle Resolver

**Files:**
- Create: `lib/server/matches/getMatchPageData.js`
- Create: `lib/server/__tests__/getMatchPageData.test.js`
- Modify: `lib/server/matches/joinMatchForAccount.js`
- Modify: `lib/server/matches/createMatchForAccount.js`
- Modify: `app/__tests__/api/matchRoutes.test.js`
- Modify: `lib/server/__tests__/matchBootstrap.test.js`

- [ ] **Step 1: Write the failing lifecycle-resolver tests**

```js
expect(await getMatchPageData("m_live")).toMatchObject({
  status: "live_finished",
  matchID: "m_live",
});

expect(await getMatchPageData("m_arch")).toMatchObject({
  status: "archived",
  archivedMatch: expect.any(Object),
});
```

- [ ] **Step 2: Run the resolver tests to verify they fail**

Run: `pnpm exec vitest run lib/server/__tests__/getMatchPageData.test.js app/__tests__/api/matchRoutes.test.js lib/server/__tests__/matchBootstrap.test.js`

Expected: FAIL because there is no app-level lifecycle resolver or `/g/` URL output yet.

- [ ] **Step 3: Implement a safe live-vs-archived resolver**

```js
export async function getMatchPageData(matchID, deps = {}) {
  const liveMatch = await getLiveMatchSummary(matchID, deps);
  if (liveMatch) return { status: liveMatch.gameover ? "live_finished" : "live_unfinished", ...liveMatch };

  const archivedMatch = await getArchivedMatchByMatchId(matchID, deps);
  if (archivedMatch) return { status: "archived", archivedMatch };

  return { status: "missing", matchID };
}
```

- [ ] **Step 4: Update match bootstrap helpers to emit `/g/:matchID` destinations**

```js
return {
  matchID,
  playerID,
  playerCredentials,
  href: `/g/${matchID}?playerID=${playerID}`,
};
```

- [ ] **Step 5: Run the resolver and wrapper tests again**

Run: `pnpm exec vitest run lib/server/__tests__/getMatchPageData.test.js app/__tests__/api/matchRoutes.test.js lib/server/__tests__/matchBootstrap.test.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/server/matches/getMatchPageData.js lib/server/matches/joinMatchForAccount.js lib/server/matches/createMatchForAccount.js lib/server/__tests__/getMatchPageData.test.js app/__tests__/api/matchRoutes.test.js lib/server/__tests__/matchBootstrap.test.js
git commit -m "feat: add match lifecycle resolver for g route"
```

### Task 5: Move The Match UI To `/g/:matchID` And Add Archived Rendering

**Files:**
- Create: `app/g/[matchID]/page.js`
- Create: `app/g/[matchID]/page-content.js`
- Create: `app/__tests__/gMatchPage.test.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Modify: `app/catana/utils/reconnectBanner.js`
- Modify: `app/catana/__tests__/reconnectBanner.test.js`
- Delete: `app/catana/lobby/page.js`
- Delete: `app/catana/lobby/[matchID]/page.js`

- [ ] **Step 1: Write the failing page and reconnect tests**

```js
expect(result.href).toBe("/g/m1?playerID=0");
expect(isSameMatchPath("/g/m1", "m1")).toBe(true);
expect(markup).toContain("Archived replay");
```

- [ ] **Step 2: Run the page and reconnect tests to verify they fail**

Run: `pnpm exec vitest run app/__tests__/gMatchPage.test.js app/catana/__tests__/reconnectBanner.test.js`

Expected: FAIL because `/g/:matchID` route and `/g/` reconnect links do not exist yet.

- [ ] **Step 3: Create the `/g/[matchID]` route and branch between live and archived rendering**

```js
if (matchPageData.status === "archived") {
  return h(ReplayPageClient, { replay, frames });
}

return h(MatchPageClient, {
  matchID: params.matchID,
  initialPlayerID: searchParams?.playerID ?? null,
});
```

- [ ] **Step 4: Repoint all navigation and reconnect URLs to `/g/:matchID`**

```js
router.push(`/g/${matchID}?playerID=${encodeURIComponent(playerID)}`);
```

```js
export const isSameMatchPath = (pathname, matchID) => pathname === `/g/${matchID}`;
```

- [ ] **Step 5: Remove the old route entry files**

```bash
rm app/catana/lobby/page.js
rm app/catana/lobby/[matchID]/page.js
```

- [ ] **Step 6: Run the UI route tests again**

Run: `pnpm exec vitest run app/__tests__/gMatchPage.test.js app/catana/__tests__/reconnectBanner.test.js app/__tests__/api/matchRoutes.test.js`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/g/[matchID]/page.js app/g/[matchID]/page-content.js app/__tests__/gMatchPage.test.js app/catana/lobby/LobbyPageClient.js app/catana/lobby/[matchID]/MatchPageClient.js app/catana/utils/reconnectBanner.js app/catana/__tests__/reconnectBanner.test.js app/__tests__/api/matchRoutes.test.js
git rm app/catana/lobby/page.js app/catana/lobby/[matchID]/page.js
git commit -m "feat: move canonical match route to g"
```

### Task 6: Final Verification And Agent Docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Update the agent docs with the final route/lifecycle behavior**

```md
- canonical match route is `/g/:matchID`
- finished live matches remain available for postgame chat until last-disconnect cleanup
- archived matches render read-only replay/postgame on the same URL
```

- [ ] **Step 2: Run the focused server and app verification suite**

Run:

```bash
pnpm exec vitest run \
  lib/server/__tests__/dbMigrations.test.js \
  lib/server/__tests__/getArchivedMatchByMatchId.test.js \
  lib/server/__tests__/getMatchPageData.test.js \
  lib/server/__tests__/matchBootstrap.test.js \
  server/__tests__/MatchChatStore.test.js \
  server/__tests__/FinishedMatchRetentionManager.test.js \
  server/__tests__/ArchiveManager.test.js \
  server/__tests__/timerPubSub.test.js \
  app/__tests__/api/matchRoutes.test.js \
  app/__tests__/gMatchPage.test.js \
  app/catana/__tests__/reconnectBanner.test.js
```

Expected: PASS

- [ ] **Step 3: Run source hygiene checks**

Run:

```bash
git diff --check
```

Expected: no whitespace or merge-marker errors

- [ ] **Step 4: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record g route and match lifecycle changes"
```
