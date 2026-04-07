# Game Status And Log Presentation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current status-box hack with a viewer-personalized current-status model, keep the thought bubble aligned to that same model, and improve game-log payloads/timing so Monopoly, robber, and finite-bank-shortage events read clearly without turning the status box into a second feed.

**Architecture:** Keep current-status and event history as separate surfaces. `app/catana/utils/gameStatus.js` becomes the shared current-status resolver for the status box and thought bubble, while the log remains canonical history produced by moves and formatted by `app/catana/utils/gameText.js`. Canonical log entries still land immediately in state, but `GameScreen` gets a client-local reveal queue so distribution-related lines can wait for local effect completion and still recover correctly on reconnect.

**Tech Stack:** boardgame.io, bgio-effects, React (JavaScript), TypeScript game-core rules, Vitest, pnpm

---

## File Structure

### Current-status resolution

- Modify: `app/catana/utils/gameStatus.js`
  - Replace the current string-only phase mapper with a richer viewer-aware status model.
  - Export a small timer-alignment helper so stale timer snapshots can be suppressed instead of shown beside the wrong prompt.
- Modify: `app/catana/__tests__/gameStatus.test.js`
  - Cover viewer-personalized copy and timer-alignment behavior.

### Status-box consumption

- Modify: `app/catana/GameScreen.js`
  - Pass viewer context into `getGameStatus(...)`.
  - Compute the final status object that `PlayerActionContainer` and opponent boxes consume.
- Modify: `app/catana/components/PlayerActionContainer.js`
  - Render `gameStatus.title` instead of `gameStatus.text`.
  - Gate timer rendering behind the new `showTimer`/timer-alignment contract.
- Create: `app/catana/__tests__/PlayerActionContainer.status.test.js`
  - Source-level guard that the status box renders `title` and hides timer output when status says not to show it.
- Create: `app/catana/__tests__/GameScreen.statusPresentation.test.js`
  - Source-level guard that `GameScreen` passes viewer context into `getGameStatus(...)`.

### Engine return data for richer logs

- Modify: `game-core/src/rules/devCards.ts`
  - Return Monopoly summary data instead of only `{ ok: true }`.
- Modify: `game-core/src/rules/devCards.test.ts`
  - Lock the Monopoly return contract.
- Modify: `game-core/src/rules/turnFlow.ts`
  - Return shortage metadata alongside successful distributions / blocked tiles.
- Modify: `game-core/src/rules/turnFlow.test.ts`
  - Lock both multi-claimant and single-claimant finite-bank shortage metadata.

### Canonical log entries and formatting

- Modify: `app/catana/Moves.js`
  - Append richer public log payloads:
    - `dev:monopolyResult`
    - `resource:shortage`
    - robber destination metadata on `robber:move`
- Modify: `app/catana/utils/gameText.js`
  - Format the new payloads into concise public copy.
- Modify: `app/catana/__tests__/Moves.gameLog.test.js`
  - Cover the new canonical entries.
- Modify: `app/catana/__tests__/gameText.test.js`
  - Cover monopoly result, robber destination, public steal wording, and shortage copy.

### Client-local log reveal timing

- Create: `app/catana/utils/gameLogPresentation.js`
  - Pure helpers for:
    - classifying delayable entries,
    - separating live vs backlog entries,
    - deciding which entries reveal immediately,
    - flushing / resetting deferred entries.
- Create: `app/catana/__tests__/gameLogPresentation.test.js`
  - Unit coverage for live delay, immediate reveal, backlog bypass, and reconnect reset rules.
- Modify: `app/catana/GameScreen.js`
  - Replace direct `visibleLogEntries = mergeVisibleLogEntries(...)` usage with staged local presentation state.
  - Reset any deferred reveal state on reconnect / backlog.
- Modify: `app/catana/effects/resourceDistribution.js`
  - Accept an `onComplete` callback and invoke it when the local distribution animation finishes.
  - Invoke it immediately for non-animated / short-circuit paths.
- Modify: `app/catana/__tests__/effects/resourceDistribution.test.js`
  - Cover the new completion callback contract.
- Create: `app/catana/__tests__/GameScreen.logPresentation.test.js`
  - Source-level guard that `GameScreen` owns deferred log presentation state and clears it on reconnect.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- The status box remains a current-prompt/orientation surface only.
- The thought bubble stays icon-only and continues to consume `statusType` only.
- No transient event-flash behavior should be added to the status box in this slice.
- Public robber-steal logs must remain generic; do not expose the stolen resource publicly.
- If the game still has no explicit `robberSteal` stage in boardgame.io state, do not invent one in the UI. Keep the status model ready for it, but only use states that can be derived from live authoritative state.
- There is no fully-fledged in-game "disable animations" setting yet; use a local boolean seam for delayed log reveal so a future setting can plug in without redesign. For MVP, browser reduced-motion and any existing short-circuit effect paths should bypass local delay.
- Leave unrelated in-progress work such as `app/catana/components/DevCardDisplay.css` untouched.

## Execution Notes

- Use `@test-driven-development` on each code slice.
- If a focused test fails for an unexpected reason, stop and use `@systematic-debugging` before patching around the symptom.
- Before claiming the feature is finished, use `@verification-before-completion`.

### Task 1: Upgrade the shared current-status resolver

**Files:**
- Modify: `app/catana/utils/gameStatus.js`
- Modify: `app/catana/__tests__/gameStatus.test.js`

- [ ] **Step 1: Write the failing status tests for viewer-personalized copy**

Extend `app/catana/__tests__/gameStatus.test.js` with cases like:

```js
it("tells the active viewer to roll", () => {
  const status = getGameStatus(baseCoreState, baseCtx, {
    viewerPlayerId: "0",
    playerMap: { "0": { name: "Ada" }, "1": { name: "Bren" } }
  });

  expect(status).toMatchObject({
    kind: "waiting_for_roll",
    title: "Roll dice",
    statusType: STATUS_TYPES.ROLLING,
    activePlayerId: "0"
  });
});

it("tells a non-acting viewer who is rolling", () => {
  const status = getGameStatus(baseCoreState, baseCtx, {
    viewerPlayerId: "1",
    playerMap: { "0": { name: "Ada" }, "1": { name: "Bren" } }
  });

  expect(status.title).toBe("Waiting for Ada to roll");
});

it("personalizes robber discard copy", () => {
  const core = {
    ...baseCoreState,
    turn: { ...baseCoreState.turn, phase: "robberDiscard", pendingDiscards: ["1"] }
  };
  const ctx = { ...baseCtx, currentPlayer: "0", activePlayers: { "1": "robberDiscard" } };

  expect(
    getGameStatus(core, ctx, {
      viewerPlayerId: "1",
      playerMap: { "0": { name: "Ada" }, "1": { name: "Bren" } }
    }).title
  ).toBe("Discard resources");
});
```

- [ ] **Step 2: Write the failing timer-alignment tests**

In the same file, add a pure helper expectation such as:

```js
it("hides a stale pre-roll timer once status has advanced to your turn", () => {
  const status = {
    kind: "your_turn",
    statusType: STATUS_TYPES.THINKING
  };

  expect(
    shouldShowGameStatusTimer(status, {
      kind: "stage",
      stageKey: "main:preRoll",
      remainingMs: 4000
    })
  ).toBe(false);
});
```

- [ ] **Step 3: Run the status tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/gameStatus.test.js
```

Expected: FAIL because `getGameStatus(...)` still accepts only `playerAction` and returns only coarse generic text.

- [ ] **Step 4: Implement the minimal status resolver changes**

Implement in `app/catana/utils/gameStatus.js`:

- accept an options object instead of only `playerAction`, for example:

```js
getGameStatus(core, ctx, {
  playerAction,
  viewerPlayerId,
  playerMap
} = {})
```

- return a richer object such as:

```js
{
  kind: "discard_other",
  title: "Ada is discarding",
  statusType: STATUS_TYPES.DISCARDING,
  activePlayerId: "0"
}
```

- export a small helper like:

```js
export function shouldShowGameStatusTimer(status, timerSnapshot) {
  // hide on null / game over / semantically stale snapshot
}
```

- [ ] **Step 5: Run the status tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/gameStatus.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the shared status baseline**

```bash
git add app/catana/utils/gameStatus.js app/catana/__tests__/gameStatus.test.js
git commit -m "feat: add viewer-aware game status model"
```

### Task 2: Consume the richer status model in the Catana UI

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Create: `app/catana/__tests__/PlayerActionContainer.status.test.js`
- Create: `app/catana/__tests__/GameScreen.statusPresentation.test.js`

- [ ] **Step 7: Write the failing source-level status presentation tests**

Create `app/catana/__tests__/PlayerActionContainer.status.test.js` with expectations like:

```js
expect(contents).toContain("gameStatus.title");
expect(contents).toContain("gameStatus.showTimer");
expect(contents).not.toContain("gameStatus.text");
```

Create `app/catana/__tests__/GameScreen.statusPresentation.test.js` with expectations like:

```js
expect(contents).toContain("getGameStatus(core, bgioProps.ctx");
expect(contents).toContain("viewerPlayerId: playerID");
expect(contents).toContain("playerMap");
expect(contents).toContain("shouldShowGameStatusTimer");
```

- [ ] **Step 8: Run the UI status presentation tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js
```

Expected: FAIL because the UI still reads `gameStatus.text` and does not pass viewer context / timer-alignment logic through.

- [ ] **Step 9: Implement the minimal UI consumption changes**

Implement:

- `app/catana/GameScreen.js`
  - call `getGameStatus(...)` with:

```js
{
  playerAction,
  viewerPlayerId: playerID,
  playerMap: logPlayerMap
}
```

  - compute final timer visibility via `shouldShowGameStatusTimer(...)`
  - preserve the current `Game Over` override shape

- `app/catana/components/PlayerActionContainer.js`
  - render `gameStatus.title`
  - only render the timer span when `gameStatus.showTimer` is true

- [ ] **Step 10: Run the focused UI status tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/gameStatus.test.js
```

Expected: PASS.

- [ ] **Step 11: Commit the status-box wiring**

```bash
git add app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js
git commit -m "feat: wire viewer-aware status copy into Catana UI"
```

### Task 3: Return richer core data for Monopoly and finite-bank shortages

**Files:**
- Modify: `game-core/src/rules/devCards.ts`
- Modify: `game-core/src/rules/devCards.test.ts`
- Modify: `game-core/src/rules/turnFlow.ts`
- Modify: `game-core/src/rules/turnFlow.test.ts`

- [ ] **Step 12: Write the failing Monopoly summary test**

Extend `game-core/src/rules/devCards.test.ts` with:

```ts
it("returns monopoly summary data", () => {
  const state = createEmptyState(["0", "1", "2"]);
  state.playerStateById["1"].resources = [ResourceType.WOOD, ResourceType.WOOD];
  state.playerStateById["2"].resources = [ResourceType.WOOD];

  expect(applyMonopoly(state, "0", ResourceType.WOOD)).toEqual({
    ok: true,
    resource: ResourceType.WOOD,
    amountStolen: 3
  });
});
```

- [ ] **Step 13: Write the failing finite-bank shortage metadata tests**

Extend `game-core/src/rules/turnFlow.test.ts` with coverage like:

```ts
it("reports a shortage when multiple players are owed a short resource", () => {
  const state = createEmptyState(["0", "1"]);
  state.bank.resources = [ResourceType.WOOD];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "1", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.shortages).toContainEqual({
      resource: ResourceType.WOOD,
      required: 2,
      available: 1,
      entitledByPlayerId: { "0": 1, "1": 1 },
      allocatedByPlayerId: {}
    });
  }
});

it("reports a shortage when a lone claimant gets only the remaining cards", () => {
  // use the existing wheat city setup from the FAQ rule test
  expect(result.shortages).toContainEqual({
    resource: ResourceType.WHEAT,
    required: 2,
    available: 1,
    entitledByPlayerId: { "0": 2 },
    allocatedByPlayerId: { "0": 1 }
  });
});
```

- [ ] **Step 14: Run the core rule tests to verify RED**

Run:
```bash
pnpm -C game-core test -- --run src/rules/devCards.test.ts src/rules/turnFlow.test.ts
```

Expected: FAIL because Monopoly still returns only `{ ok: true }` and resource distribution does not expose `shortages`.

- [ ] **Step 15: Implement the minimal core return-shape changes**

Implement:

- `game-core/src/rules/devCards.ts`
  - accumulate the stolen count in `applyMonopoly(...)`
  - return:

```ts
{ ok: true, resource, amountStolen }
```

- `game-core/src/rules/turnFlow.ts`
  - add a `shortages` array to successful distribution results
  - record both:
    - full denial because multiple claimants compete for insufficient stock
    - partial allocation because a lone claimant receives the remainder
  - forward `shortages` through `applyRollDice(...)`

- [ ] **Step 16: Run the core rule tests to verify GREEN**

Run:
```bash
pnpm -C game-core test -- --run src/rules/devCards.test.ts src/rules/turnFlow.test.ts
```

Expected: PASS.

- [ ] **Step 17: Commit the richer core log data contract**

```bash
git add game-core/src/rules/devCards.ts game-core/src/rules/devCards.test.ts game-core/src/rules/turnFlow.ts game-core/src/rules/turnFlow.test.ts
git commit -m "feat: return monopoly and shortage log metadata"
```

### Task 4: Emit richer canonical game-log entries and format them

**Files:**
- Modify: `app/catana/Moves.js`
- Modify: `app/catana/utils/gameText.js`
- Modify: `app/catana/__tests__/Moves.gameLog.test.js`
- Modify: `app/catana/__tests__/gameText.test.js`

- [ ] **Step 18: Write the failing move-level log-entry tests**

Extend `app/catana/__tests__/Moves.gameLog.test.js` with cases like:

```js
it("logs a monopoly result entry with the claimed total", () => {
  // confirmDevCardPlay.move(...) for monopoly
  expect(context.G.gameLog.map((entry) => entry.type)).toEqual([
    "dev:play",
    "dev:monopolyResult"
  ]);
  expect(context.G.gameLog[1]).toMatchObject({
    type: "dev:monopolyResult",
    actorId: "0",
    data: { resource: ResourceType.WOOD, amountStolen: 3 }
  });
});

it("logs shortage entries after rolling an understocked resource", () => {
  expect(context.G.gameLog.some((entry) => entry.type === "resource:shortage")).toBe(true);
});

it("logs robber destination metadata", () => {
  expect(context.G.gameLog.find((entry) => entry.type === "robber:move")).toMatchObject({
    data: expect.objectContaining({
      tileId: 2,
      tileResource: "Wood",
      tileNumber: 8
    })
  });
});
```

- [ ] **Step 19: Write the failing log-formatting tests**

Extend `app/catana/__tests__/gameText.test.js` with expectations like:

```js
it("formats monopoly result entries", () => {
  const tokens = formatLogEntry({
    type: "dev:monopolyResult",
    actorId: "1",
    data: { resource: "Sheep", amountStolen: 8 }
  }, { "1": "Bren" });

  expect(tokens.some((t) => t.kind === "text" && t.text.includes("claimed 8"))).toBe(true);
});

it("formats robber moves with destination details", () => {
  const tokens = formatLogEntry({
    type: "robber:move",
    actorId: "1",
    data: { tileResource: "Wood", tileNumber: 8 }
  }, { "1": "Bren" });

  expect(tokens.some((t) => t.kind === "text" && t.text.includes("to wood 8"))).toBe(true);
});

it("formats public steal copy without leaking the resource", () => {
  const tokens = formatLogEntry({
    type: "robber:steal",
    actorId: "1",
    data: { victimId: "0" }
  }, { "0": "Ada", "1": "Bren" });

  expect(tokens.some((t) => t.kind === "text" && t.text.includes("stole a card"))).toBe(true);
});
```

- [ ] **Step 20: Run the move/log-formatting tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/gameText.test.js
```

Expected: FAIL because the move layer does not append the richer entries yet and the formatter cannot render them.

- [ ] **Step 21: Implement the minimal move + formatter changes**

Implement in `app/catana/Moves.js`:

- when `confirmDevCardPlay.move(...)` resolves Monopoly:
  - append `dev:play`
  - append:

```js
{
  type: "dev:monopolyResult",
  actorId: playerID,
  data: { resource, amountStolen }
}
```

- when `rollDice.move(...)` receives shortage metadata from core:
  - append one `resource:shortage` entry per shortage summary
- when logging `robber:move`:
  - enrich the payload from `G.tiles` with `tileResource` and `tileNumber`

Implement in `app/catana/utils/gameText.js`:

- add formatting for `dev:monopolyResult`
- add formatting for `resource:shortage`
- update `robber:move` copy to use destination metadata when present
- keep `robber:steal` public

- [ ] **Step 22: Run the move/log-formatting tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/gameText.test.js
```

Expected: PASS.

- [ ] **Step 23: Commit the richer game log entries**

```bash
git add app/catana/Moves.js app/catana/utils/gameText.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/gameText.test.js
git commit -m "feat: improve Catana status-related game log entries"
```

### Task 5: Add client-local log reveal timing and reconnect-safe flush behavior

**Files:**
- Create: `app/catana/utils/gameLogPresentation.js`
- Create: `app/catana/__tests__/gameLogPresentation.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/effects/resourceDistribution.js`
- Modify: `app/catana/__tests__/effects/resourceDistribution.test.js`
- Create: `app/catana/__tests__/GameScreen.logPresentation.test.js`

- [ ] **Step 24: Write the failing pure helper tests for local log presentation**

Create `app/catana/__tests__/gameLogPresentation.test.js` with cases like:

```js
it("defers distribution-resolution entries during live animated play", () => {
  const result = classifyIncomingGameLogEntries({
    entries: [
      { id: 1, type: "roll" },
      { id: 2, type: "resource:gain" }
    ],
    lastSeenId: 0,
    canDelay: true,
    isBackfill: false
  });

  expect(result.visibleNow.map((entry) => entry.type)).toEqual(["roll"]);
  expect(result.deferred.map((entry) => entry.type)).toEqual(["resource:gain"]);
});

it("reveals delayable entries immediately when delay is disabled", () => {
  // canDelay: false
});

it("reveals backlog entries immediately after reconnect", () => {
  // isBackfill: true bypasses local delay
});
```

- [ ] **Step 25: Write the failing distribution completion callback test**

Extend `app/catana/__tests__/effects/resourceDistribution.test.js` with a case like:

```js
it("invokes onComplete after the local distribution run finishes", () => {
  const onComplete = vi.fn();
  const run = createResourceDistributionRunner({
    layerEl,
    getLayout,
    getBoardRect,
    onComplete
  });

  run([{ coordinate: [0, 0, 0], playerID: 0, resource: "Wood" }]);

  expect(onComplete).toHaveBeenCalled();
});
```

If the GSAP mock needs it, assert `timeline.call(...)` is wired to invoke the callback rather than waiting on real time.

- [ ] **Step 26: Write the failing GameScreen source-level reconnect test**

Create `app/catana/__tests__/GameScreen.logPresentation.test.js` with expectations like:

```js
expect(contents).toContain("gameLogPresentation");
expect(contents).toContain("deferredLogEntries");
expect(contents).toContain("setDeferredLogEntries([])");
expect(contents).toContain("bgioProps.isConnected");
```

- [ ] **Step 27: Run the local log-presentation tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/gameLogPresentation.test.js app/catana/__tests__/effects/resourceDistribution.test.js app/catana/__tests__/GameScreen.logPresentation.test.js
```

Expected: FAIL because there is no presentation helper, no completion callback, and no deferred log state in `GameScreen`.

- [ ] **Step 28: Implement the minimal local log-presentation layer**

Implement:

- `app/catana/utils/gameLogPresentation.js`
  - add pure helpers such as:

```js
export function shouldDelayGameLogEntry(entry) {
  return entry?.type === "resource:gain" || entry?.type === "resource:shortage";
}

export function classifyIncomingGameLogEntries({
  entries,
  lastSeenId,
  canDelay,
  isBackfill
}) {
  // return { visibleNow, deferred, nextLastSeenId }
}
```

- `app/catana/effects/resourceDistribution.js`
  - accept `onComplete`
  - invoke it at the end of the local run
  - invoke it immediately for short-circuit paths such as hidden document / no cards

- `app/catana/GameScreen.js`
  - store:
    - presented log entries,
    - deferred log entries,
    - last seen game-log id,
    - a reconnect/backfill flag
  - use `mergeVisibleLogEntries(...)` first to build canonical combined entries
  - then stage them through `gameLogPresentation`
  - flush deferred entries on distribution completion
  - clear deferred entries and bypass delay when reconnect/backfill is detected

- [ ] **Step 29: Run the local log-presentation tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/gameLogPresentation.test.js app/catana/__tests__/effects/resourceDistribution.test.js app/catana/__tests__/GameScreen.logPresentation.test.js
```

Expected: PASS.

- [ ] **Step 30: Commit the local log reveal timing**

```bash
git add app/catana/utils/gameLogPresentation.js app/catana/__tests__/gameLogPresentation.test.js app/catana/effects/resourceDistribution.js app/catana/__tests__/effects/resourceDistribution.test.js app/catana/GameScreen.js app/catana/__tests__/GameScreen.logPresentation.test.js
git commit -m "feat: delay Catana distribution logs until local effect completion"
```

### Task 6: Update docs and run focused verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 31: Update agent docs with the implementation outcome**

Record:

- the viewer-aware status model contract,
- the monopoly / shortage log payload changes,
- the local log-reveal / reconnect rules.

- [ ] **Step 32: Run the focused app tests**

Run:
```bash
pnpm exec vitest run \
  app/catana/__tests__/gameStatus.test.js \
  app/catana/__tests__/PlayerActionContainer.status.test.js \
  app/catana/__tests__/GameScreen.statusPresentation.test.js \
  app/catana/__tests__/Moves.gameLog.test.js \
  app/catana/__tests__/gameText.test.js \
  app/catana/__tests__/gameLogPresentation.test.js \
  app/catana/__tests__/effects/resourceDistribution.test.js \
  app/catana/__tests__/GameScreen.logPresentation.test.js
```

Expected: PASS.

- [ ] **Step 33: Run the focused core tests and build**

Run:
```bash
pnpm -C game-core test -- --run src/rules/devCards.test.ts src/rules/turnFlow.test.ts
pnpm -C game-core build
```

Expected: PASS.

- [ ] **Step 34: Run one broader Catana smoke test batch**

Run:
```bash
pnpm exec vitest run \
  app/catana/__tests__/Moves.devCards.test.js \
  app/catana/__tests__/Moves.robber.test.js \
  app/catana/__tests__/disconnectPresence.test.js \
  app/catana/__tests__/GameLogPanel.test.js
```

Expected: PASS.

- [ ] **Step 35: Commit docs + verified implementation**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record status and log presentation rollout"
```

## Final Verification Checklist

- [ ] Status box says `Roll dice` only for the acting viewer and `Waiting for {name} to roll` for others.
- [ ] `Your turn` appears only when it is actually the viewer's turn.
- [ ] Opponent discard / robber / placement copy uses descriptive wording.
- [ ] The timer hides when the authoritative timer snapshot is semantically stale.
- [ ] Monopoly logs show both the play event and the claimed total.
- [ ] Robber logs show the destination tile and public steal wording only.
- [ ] Finite-bank shortages are logged clearly, including the lone-claimant partial-allocation case.
- [ ] Distribution-related log entries reveal after local animation completion when delay is enabled.
- [ ] Those entries reveal immediately when local delay is disabled / bypassed.
- [ ] Reconnect shows the correct current status immediately and does not leave log entries stuck behind dead reveal gates.
