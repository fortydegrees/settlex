# Knight Dev Card Play Animation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an end-to-end Knight development-card play animation with explicit local/opponent presentation, sandbox tuning controls, and a future-ready motion-policy seam.

**Architecture:** Extend the existing `bgio-effects` -> `GameEffects` -> `EffectBus` -> GSAP runner path with two public Knight lifecycle effects: start and resolve. The move layer emits game-oriented payloads, while `GameScreen` derives viewer perspective, owns temporary display overrides, and provides DOM anchors to a new dev-card play runner. `/catana/dev/sandbox` remains the high-fidelity tuning loop, with dev-only synthetic buttons routed into the same local effect bus.

**Tech Stack:** boardgame.io, bgio-effects, React/Next.js JavaScript, GSAP, Howler cue bus, Vitest, ESLint, pnpm

---

## File Structure

### Move / Effect Contract

- Modify: `app/catana/Moves.js`
  - Emit `effects.devCardPlayStarted(...)` after a successful Knight play.
  - Store a pending Knight presentation payload on outer `G`.
  - Emit `effects.devCardPlayResolved(...)` from robber resolution and clear the pending payload.
- Modify: `app/catana/Game.js`
  - Register `devCardPlayStarted` and `devCardPlayResolved` in `EffectsPlugin`.
- Modify: `app/catana/__tests__/Moves.devCards.test.js`
  - Cover start payload, resolve payload, no-valid-tile path, and illegal play non-emission.

### Effect Bus Wiring

- Modify: `app/catana/effects/GameEffects.js`
  - Forward `devCardPlayStarted` to `devcard:play:start`.
  - Forward `devCardPlayResolved` to `devcard:play:resolve`.
- Modify: `app/catana/effects/registry.js`
  - Register a `devCardPlay` handler on both bus events.
- Modify: `app/catana/__tests__/effects/GameEffects.test.js`
  - Source-level coverage for both effect listeners and bus event names.
- Modify: `app/catana/__tests__/effects/registry.test.js`
  - Unit coverage for the new registry channel.

### Pure Helpers

- Create: `app/catana/effects/devCardPlayPerspective.js`
  - Pure helper for `local` / `opponent` / `spectator` perspective.
  - Pure helper for animation policy.
- Test: `app/catana/__tests__/effects/devCardPlayPerspective.test.js`
- Create: `app/catana/utils/devCardPlayPresentation.js`
  - Pure helpers for freezing/releasing Knight count and Largest Army display state.
- Test: `app/catana/__tests__/utils/devCardPlayPresentation.test.js`

### UI Anchors / Display Overrides

- Modify: `app/catana/components/DevCardDisplay.js`
  - Accept `playerId`.
  - Add stable per-type card group IDs such as `p0-devcard-knight`.
- Modify: `app/catana/components/PlayerActionContainer.js`
  - Pass `player.id` into `DevCardDisplay`.
  - Pass Knight display override into `PlayerAvatarStats`.
- Modify: `app/catana/components/OpponentPlayerBox.js`
  - Add `id="p{playerId}-devcards"` around opponent dev-card stack.
  - Pass Knight display override into `PlayerAvatarStats`.
- Modify: `app/catana/components/PlayerAvatarStats.js`
  - Accept `knightDisplayOverride`.
  - Add `id="p{playerId}-largest-army"` to the Largest Army row/target.
  - Render overridden `knightsPlayed` and `largestArmyOwnerId` while an animation is active.
- Modify: relevant source tests under `app/catana/__tests__/`
  - Lock anchor IDs and override plumbing.

### GSAP Runner / Audio Cues

- Create: `app/catana/effects/devCardPlay.js`
  - Creates and parks detached Knight card actors.
  - Chooses local vs opponent choreography from perspective.
  - Stores parked actor DOM nodes in an injected ref-backed map.
  - Resolves parked actors to the Largest Army target.
  - Emits cue names through the existing cue bus.
- Test: `app/catana/__tests__/effects/devCardPlay.test.js`
- Modify: `app/catana/effects/soundThemes.js`
  - Add conservative cue mappings for Knight play/flip/resolve.
- Modify or add focused test: `app/catana/__tests__/effects/soundThemes.test.js`

### GameScreen Integration / Sandbox

- Modify: `app/catana/GameScreen.js`
  - Own active Knight display overrides.
  - Own the parked actor store ref.
  - Create the `devCardPlay` runner through the existing `effects` memo.
  - Provide anchor lookup helpers.
  - Add a dev-sandbox-only CustomEvent bridge into `effectsBus`.
- Modify: `app/catana/dev/sandbox/SandboxBoardShell.js`
  - Provide callbacks to trigger synthetic Knight start/resolve events.
- Modify: `app/catana/dev/sandbox/SandboxPanel.js`
  - Add buttons for `Opponent Plays Knight`, `Resolve Opponent Knight`, and `Reset Knight Visual`.
- Modify: `app/catana/__tests__/DevSandboxPanel.source.test.js`
  - Lock the sandbox buttons and bridge names.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Preserve

- Knight gameplay remains server-authoritative.
- The animation payload is public once a Knight is played.
- Local pickup/hover behavior remains client-only; public effect events drive shared presentation.
- Start effects must not block the robber placement stage.
- Resolve effects may delay only local presentation of Knight count/Largest Army, not canonical game state.
- Reduced/disabled animation must never leave display overrides or parked actors stuck.
- Do not implement YoP, Monopoly, or Road Building animations in this slice.

### Task 1: Add the Authoritative Knight Play Start/Resolve Payloads

**Files:**
- Modify: `app/catana/Moves.js`
- Modify: `app/catana/Game.js`
- Modify: `app/catana/__tests__/Moves.devCards.test.js`

- [ ] **Step 1: Write the failing start-payload test**

Extend `app/catana/__tests__/Moves.devCards.test.js` with a Knight play test that asserts `devCardPlayStarted` receives the public payload and that a pending animation record is stored.

```js
it("emits a public Knight play start effect and stores pending presentation data", () => {
  const state = createEmptyState(["0", "1"]);
  state.playerStateById["0"].devCards = ["knight"];
  state.playerStateById["0"].knightsPlayed = 0;
  const effects = { devCardPlayStarted: vi.fn() };
  const events = { setStage: vi.fn() };
  const ctx = {
    currentPlayer: "0",
    activePlayers: { "0": "postRoll" },
    turn: 12
  };
  const context = {
    G: { core: state, coreTopology, tiles, gameLog: [], gameLogSeq: 0 },
    playerID: "0",
    ctx,
    events,
    effects
  };

  playDevCardStart.move(context, "knight");

  expect(effects.devCardPlayStarted).toHaveBeenCalledTimes(1);
  expect(effects.devCardPlayStarted).toHaveBeenCalledWith(
    expect.objectContaining({
      playerId: "0",
      cardType: "knight",
      phase: "start",
      startedFromStage: "postRoll",
      previousKnightsPlayed: 0,
      nextKnightsPlayed: 1,
      previousLargestArmyOwnerId: null
    })
  );
  expect(context.G.pendingDevCardPlayAnimation).toMatchObject({
    playerId: "0",
    cardType: "knight",
    previousKnightsPlayed: 0,
    nextKnightsPlayed: 1
  });
});
```

- [ ] **Step 2: Write the failing resolve-payload test**

Add a test that plays Knight, then resolves robber movement and expects `devCardPlayResolved`.

```js
it("emits a Knight play resolve effect when robber resolution finishes", () => {
  const state = createEmptyState(["0", "1"]);
  state.playerStateById["0"].devCards = ["knight"];
  state.playerStateById["1"].resources = [ResourceType.WOOD];
  const effects = {
    devCardPlayStarted: vi.fn(),
    devCardPlayResolved: vi.fn()
  };
  const events = {
    setStage: vi.fn(),
    setActivePlayers: vi.fn()
  };
  const ctx = {
    currentPlayer: "0",
    activePlayers: { "0": "postRoll" },
    turn: 12
  };
  const random = { Number: () => 0 };
  const context = {
    G: { core: state, coreTopology, tiles, gameLog: [], gameLogSeq: 0 },
    playerID: "0",
    ctx,
    events,
    effects,
    random
  };

  playDevCardStart.move(context, "knight");
  moveRobber.move(context, 1);

  expect(effects.devCardPlayResolved).toHaveBeenCalledWith(
    expect.objectContaining({
      playerId: "0",
      cardType: "knight",
      phase: "resolve",
      previousKnightsPlayed: 0,
      nextKnightsPlayed: 1
    })
  );
  expect(context.G.pendingDevCardPlayAnimation).toBe(null);
});
```

Update the import at the top of the test file to include `moveRobber`.

- [ ] **Step 3: Write the failing no-valid-tile cleanup test**

Extend the existing no-valid-tile Knight test so it expects start and resolve/cleanup behavior.

```js
expect(effects.devCardPlayStarted).toHaveBeenCalled();
expect(effects.devCardPlayResolved).toHaveBeenCalled();
expect(context.G.pendingDevCardPlayAnimation).toBe(null);
```

- [ ] **Step 4: Run the move tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js
```

Expected: FAIL because the new effects and pending record do not exist.

- [ ] **Step 5: Implement the minimal move helpers**

In `app/catana/Moves.js`, add helpers near the existing award helpers:

```js
const buildDevCardPlayEffectId = ({ playerId, cardType, turn }) =>
  `devcard:${cardType}:${playerId}:turn-${turn ?? "unknown"}`;

const createKnightPlayPayload = ({
  playerId,
  cardType = "knight",
  phase,
  startedFromStage,
  ctx,
  previousKnightsPlayed,
  nextKnightsPlayed,
  previousAwards,
  nextAwards
}) => ({
  effectId:
    phase === "resolve"
      ? `${buildDevCardPlayEffectId({ playerId, cardType, turn: ctx?.turn })}:resolve`
      : buildDevCardPlayEffectId({ playerId, cardType, turn: ctx?.turn }),
  playerId,
  cardType,
  phase,
  startedFromStage,
  previousKnightsPlayed,
  nextKnightsPlayed,
  previousLargestArmyOwnerId: previousAwards?.largestArmyOwnerId ?? null,
  nextLargestArmyOwnerId: nextAwards?.largestArmyOwnerId ?? null
});

const emitPendingDevCardPlayResolution = (context) => {
  const pending = context.G?.pendingDevCardPlayAnimation;
  if (!pending || pending.cardType !== "knight") return;
  const payload = {
    ...pending,
    phase: "resolve",
    effectId: `${pending.effectId}:resolve`
  };
  context.effects?.devCardPlayResolved?.(payload);
  context.G.pendingDevCardPlayAnimation = null;
};
```

Then in the Knight branch of `playDevCardStart.move(...)`:

1. Capture `previousKnightsPlayed`.
2. Use existing `previousAwards`.
3. After `playDevCard(...)` and `applyKnight(...)` succeed, compute `nextAwards`.
4. Build and store the start payload.
5. Emit `effects?.devCardPlayStarted?.(payload)` before `beginRobberMoveStage(...)`.

In `finishRobberResolution(context)`, call `emitPendingDevCardPlayResolution(context)` before returning.

- [ ] **Step 6: Register the effects in `Game.js`**

Add to the `EffectsPlugin` config:

```js
devCardPlayStarted: {
  create: (value) => value,
  duration: 0.01
},
devCardPlayResolved: {
  create: (value) => value,
  duration: 0.65
}
```

Use a near-zero start duration so robber placement is not blocked by `EffectsBoardWrapper(..., { updateStateAfterEffects: true })`.

- [ ] **Step 7: Run the move tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit the move/effect payload contract**

```bash
git add app/catana/Moves.js app/catana/Game.js app/catana/__tests__/Moves.devCards.test.js
git commit -m "feat: emit knight dev card play effects"
```

### Task 2: Wire Knight Play Effects Through the Catana Effect Bus

**Files:**
- Modify: `app/catana/effects/GameEffects.js`
- Modify: `app/catana/effects/registry.js`
- Modify: `app/catana/__tests__/effects/GameEffects.test.js`
- Modify: `app/catana/__tests__/effects/registry.test.js`

- [ ] **Step 1: Add failing source coverage for `GameEffects`**

Extend `GameEffects.test.js`:

```js
it("wires Knight dev-card play effects to bus events", () => {
  const path = fileURLToPath(
    new URL("../../effects/GameEffects.js", import.meta.url)
  );
  const source = fs.readFileSync(path, "utf8");

  expect(source).toContain("devCardPlayStarted");
  expect(source).toContain("devcard:play:start");
  expect(source).toContain("devCardPlayResolved");
  expect(source).toContain("devcard:play:resolve");
});
```

- [ ] **Step 2: Add failing registry coverage**

Extend `registry.test.js`:

```js
it("registers dev card play handlers and cleans up", () => {
  const unsubscribeStart = vi.fn();
  const unsubscribeResolve = vi.fn();
  const bus = {
    on: vi
      .fn()
      .mockReturnValueOnce(unsubscribeStart)
      .mockReturnValueOnce(unsubscribeResolve)
  };
  const handler = vi.fn();

  const cleanup = registerEffects({
    bus,
    effects: { devCardPlay: handler }
  });

  expect(bus.on).toHaveBeenCalledWith("devcard:play:start", handler);
  expect(bus.on).toHaveBeenCalledWith("devcard:play:resolve", handler);
  cleanup();
  expect(unsubscribeStart).toHaveBeenCalled();
  expect(unsubscribeResolve).toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the effect wiring tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js
```

Expected: FAIL because the new listeners and registry hooks do not exist.

- [ ] **Step 4: Implement the effect forwarding**

In `GameEffects.js`, add two listeners near the existing `buyDevCardReveal` listener:

```js
useEffectListener(
  "devCardPlayStarted",
  (payload) => {
    if (!payload) return;
    bus.emit({
      type: "devcard:play:start",
      payload,
      effectId: payload.effectId
    });
  },
  [bus]
);

useEffectListener(
  "devCardPlayResolved",
  (payload) => {
    if (!payload) return;
    bus.emit({
      type: "devcard:play:resolve",
      payload,
      effectId: payload.effectId
    });
  },
  [bus]
);
```

In `registry.js`, register both events:

```js
if (effects.devCardPlay) {
  unsubscribes.push(bus.on("devcard:play:start", effects.devCardPlay));
  unsubscribes.push(bus.on("devcard:play:resolve", effects.devCardPlay));
}
```

- [ ] **Step 5: Run the effect wiring tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the effect-bus wiring**

```bash
git add app/catana/effects/GameEffects.js app/catana/effects/registry.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js
git commit -m "feat: wire knight play through effects bus"
```

### Task 3: Add Pure Perspective and Presentation Helpers

**Files:**
- Create: `app/catana/effects/devCardPlayPerspective.js`
- Create: `app/catana/__tests__/effects/devCardPlayPerspective.test.js`
- Create: `app/catana/utils/devCardPlayPresentation.js`
- Create: `app/catana/__tests__/utils/devCardPlayPresentation.test.js`

- [ ] **Step 1: Write failing perspective helper tests**

Create `app/catana/__tests__/effects/devCardPlayPerspective.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  getDevCardPlayPerspective,
  shouldAnimateDevCardPlay
} from "../../effects/devCardPlayPerspective";

describe("devCardPlayPerspective", () => {
  it("returns local for the acting viewer", () => {
    expect(
      getDevCardPlayPerspective({ playerId: "0", viewerPlayerId: "0" })
    ).toBe("local");
  });

  it("returns opponent for another seated viewer", () => {
    expect(
      getDevCardPlayPerspective({ playerId: "0", viewerPlayerId: "1" })
    ).toBe("opponent");
  });

  it("returns spectator when there is no viewer player id", () => {
    expect(
      getDevCardPlayPerspective({ playerId: "0", viewerPlayerId: null })
    ).toBe("spectator");
  });

  it("disables animation when motion is reduced or animations are disabled", () => {
    expect(shouldAnimateDevCardPlay({ animationsEnabled: false })).toBe(false);
    expect(shouldAnimateDevCardPlay({ reducedMotion: true })).toBe(false);
    expect(shouldAnimateDevCardPlay({ animationsEnabled: true, reducedMotion: false })).toBe(true);
  });
});
```

- [ ] **Step 2: Write failing presentation helper tests**

Create `app/catana/__tests__/utils/devCardPlayPresentation.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  getKnightDisplayOverrideForPlayer,
  getPlayerKnightStatsDisplay
} from "../../utils/devCardPlayPresentation";

describe("devCardPlayPresentation", () => {
  it("returns the frozen override for the matching player", () => {
    const overrides = {
      "0": { playerId: "0", knightsPlayed: 2, largestArmyOwnerId: null }
    };

    expect(getKnightDisplayOverrideForPlayer(overrides, "0")).toEqual(
      overrides["0"]
    );
    expect(getKnightDisplayOverrideForPlayer(overrides, "1")).toBe(null);
  });

  it("applies frozen knight count and largest army owner", () => {
    const display = getPlayerKnightStatsDisplay({
      player: { id: "0", knightsPlayed: 3 },
      core: { awards: { largestArmyOwnerId: "0" } },
      knightDisplayOverride: {
        knightsPlayed: 2,
        largestArmyOwnerId: null
      }
    });

    expect(display).toEqual({
      knightsPlayed: 2,
      hasLargestArmy: false
    });
  });
});
```

- [ ] **Step 3: Run helper tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/devCardPlayPerspective.test.js app/catana/__tests__/utils/devCardPlayPresentation.test.js
```

Expected: FAIL because the helper modules do not exist.

- [ ] **Step 4: Implement perspective helpers**

Create `app/catana/effects/devCardPlayPerspective.js`:

```js
export function getDevCardPlayPerspective({ playerId, viewerPlayerId } = {}) {
  if (playerId == null) return "spectator";
  if (viewerPlayerId == null) return "spectator";
  return String(playerId) === String(viewerPlayerId) ? "local" : "opponent";
}

export function shouldAnimateDevCardPlay({
  animationsEnabled = true,
  reducedMotion = false
} = {}) {
  return animationsEnabled !== false && reducedMotion !== true;
}
```

- [ ] **Step 5: Implement presentation helpers**

Create `app/catana/utils/devCardPlayPresentation.js`:

```js
export function getKnightDisplayOverrideForPlayer(overridesByPlayerId, playerId) {
  if (playerId == null) return null;
  return overridesByPlayerId?.[String(playerId)] ?? null;
}

export function getPlayerKnightStatsDisplay({
  player,
  core,
  knightDisplayOverride
} = {}) {
  const playerId = player?.id;
  const knightsPlayed =
    knightDisplayOverride?.knightsPlayed ?? player?.knightsPlayed ?? 0;
  const largestArmyOwnerId =
    knightDisplayOverride?.largestArmyOwnerId ??
    core?.awards?.largestArmyOwnerId ??
    null;

  return {
    knightsPlayed,
    hasLargestArmy:
      playerId != null && String(largestArmyOwnerId) === String(playerId)
  };
}
```

- [ ] **Step 6: Run helper tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/devCardPlayPerspective.test.js app/catana/__tests__/utils/devCardPlayPresentation.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit helpers**

```bash
git add app/catana/effects/devCardPlayPerspective.js app/catana/utils/devCardPlayPresentation.js app/catana/__tests__/effects/devCardPlayPerspective.test.js app/catana/__tests__/utils/devCardPlayPresentation.test.js
git commit -m "feat: add knight play presentation helpers"
```

### Task 4: Add Stable UI Anchors and Knight Display Overrides

**Files:**
- Modify: `app/catana/components/DevCardDisplay.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/components/OpponentPlayerBox.js`
- Modify: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/__tests__/DevCardDisplayLayout.source.test.js`
- Modify: `app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js`
- Create or modify: `app/catana/__tests__/playerAvatarStats.test.js`

- [ ] **Step 1: Add failing source tests for anchors**

Extend `DevCardDisplayLayout.source.test.js`:

```js
it("exposes stable anchors for dev-card play effects", () => {
  const componentSource = fs.readFileSync(componentPath, "utf8");

  expect(componentSource).toContain("playerId");
  expect(componentSource).toContain("`p${playerId}-devcard-${item.type}`");
});
```

Extend `DevSandboxPanel.source.test.js` or create a focused source test for opponent anchors later in this task:

```js
const opponentSource = read("../components/OpponentPlayerBox.js");
expect(opponentSource).toContain("`p${player.id}-devcards`");
```

- [ ] **Step 2: Add failing source tests for `PlayerAvatarStats` override**

Extend `app/catana/__tests__/playerAvatarStats.test.js` or add source-level checks:

```js
expect(source).toContain("knightDisplayOverride");
expect(source).toContain("getPlayerKnightStatsDisplay");
expect(source).toContain("`p${player.id}-largest-army`");
```

- [ ] **Step 3: Run the anchor/override tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js
```

Expected: FAIL because the new anchors and override props do not exist.

- [ ] **Step 4: Add `playerId` anchor support to `DevCardDisplay`**

In `DevCardDisplay`, accept `playerId`:

```js
export const DevCardDisplay = ({
  cards = [],
  playableCountsByType = {},
  onPlayCard,
  activeCardType,
  showCountBadge = false,
  badgeMinCount = 3,
  containerRef = null,
  forceMount = false,
  playerId = null,
}) => {
```

Pass it into `DevCardDockItem`, then set an ID on the button:

```js
id={playerId != null ? `p${playerId}-devcard-${item.type}` : undefined}
```

- [ ] **Step 5: Pass `player.id` from `PlayerActionContainer`**

Update the local `DevCardDisplay` call:

```jsx
<DevCardDisplay
  playerId={player.id}
  cards={displayDevCards ?? player.devCards}
  ...
/>
```

- [ ] **Step 6: Add opponent dev-card stack anchor**

In `OpponentPlayerBox`, wrap the dev-card `CardStack`:

```jsx
<div id={`p${player.id}-devcards`}>
  <CardStack
    count={devCount}
    src={devCardBackIcon}
    alt="Dev cards"
    className={stackMotionClass}
  />
</div>
```

- [ ] **Step 7: Add Knight display override support**

In `PlayerAvatarStats.js`, import `getPlayerKnightStatsDisplay` and replace the existing values:

```js
const knightDisplay = getPlayerKnightStatsDisplay({
  player,
  core,
  knightDisplayOverride
});
const currentArmySize = knightDisplay.knightsPlayed;
const hasLargestArmy = knightDisplay.hasLargestArmy;
```

Add the destination anchor to the Largest Army row:

```jsx
<div id={`p${player.id}-largest-army`} className="flex items-center">
```

Thread `knightDisplayOverride` through `PlayerActionContainer` and `OpponentPlayerBox`.

- [ ] **Step 8: Run focused tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit anchors and display override plumbing**

```bash
git add app/catana/components/DevCardDisplay.js app/catana/components/PlayerActionContainer.js app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerAvatarStats.js app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js
git commit -m "feat: add knight play animation anchors"
```

### Task 5: Implement the GSAP Knight Play Runner

**Files:**
- Create: `app/catana/effects/devCardPlay.js`
- Create: `app/catana/__tests__/effects/devCardPlay.test.js`
- Modify: `app/catana/effects/soundThemes.js`
- Modify: `app/catana/__tests__/effects/soundThemes.test.js`

- [ ] **Step 1: Write failing timing/config tests**

Create `app/catana/__tests__/effects/devCardPlay.test.js`:

```js
import { describe, expect, it, vi } from "vitest";
import {
  getDevCardPlayTimings,
  getDevCardPlayCueName,
  createDevCardPlayRunner
} from "../../effects/devCardPlay";

vi.mock("gsap", () => {
  const makeTimeline = () => {
    const timeline = {
      set: vi.fn(() => timeline),
      call: vi.fn((fn) => {
        fn?.();
        return timeline;
      }),
      to: vi.fn(() => timeline),
      fromTo: vi.fn(() => timeline)
    };
    return timeline;
  };

  return {
    gsap: {
      set: vi.fn(),
      timeline: vi.fn(makeTimeline)
    }
  };
});

describe("devCardPlay runner", () => {
  it("uses resource-like resolve travel timing", () => {
    expect(getDevCardPlayTimings(false).resolveTravel).toBeCloseTo(0.6, 5);
    expect(getDevCardPlayTimings(true).resolveTravel).toBeLessThan(0.6);
  });

  it("maps Knight cue names", () => {
    expect(getDevCardPlayCueName("start")).toBe("devcard:knight:play");
    expect(getDevCardPlayCueName("flip")).toBe("devcard:knight:flip");
    expect(getDevCardPlayCueName("resolve")).toBe("devcard:knight:resolve");
  });
});
```

- [ ] **Step 2: Write failing runner behavior tests**

Add tests for missing anchors and completion:

```js
it("completes immediately when motion is disabled", () => {
  const onResolveComplete = vi.fn();
  const runner = createDevCardPlayRunner({
    getLayerEl: () => ({ appendChild: vi.fn() }),
    getAnchorRect: () => null,
    getPerspective: () => "opponent",
    getMotionPolicy: () => ({ animationsEnabled: false, reducedMotion: false }),
    onResolveComplete
  });

  runner({
    type: "devcard:play:resolve",
    payload: { playerId: "1", cardType: "knight", phase: "resolve" }
  });

  expect(onResolveComplete).toHaveBeenCalled();
});
```

- [ ] **Step 3: Run runner tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/devCardPlay.test.js
```

Expected: FAIL because the runner does not exist.

- [ ] **Step 4: Implement runner exports**

Create `app/catana/effects/devCardPlay.js` with:

```js
import { gsap } from "gsap";
import { isDocumentHidden } from "../utils/visibility";
import { shouldAnimateDevCardPlay } from "./devCardPlayPerspective";

const DEV_CARD_BACK_SVG = "/svgs/cards/development/card_devcardback.svg";
const KNIGHT_CARD_SVG = "/svgs/cards/development/knight.svg";

export function getDevCardPlayTimings(reducedMotion = false) {
  if (reducedMotion) {
    return {
      startLift: 0.12,
      startFlip: 0.18,
      resolveTravel: 0.28
    };
  }
  return {
    startLift: 0.24,
    startFlip: 0.34,
    resolveTravel: 0.6
  };
}

export function getDevCardPlayCueName(phase) {
  if (phase === "flip") return "devcard:knight:flip";
  if (phase === "resolve") return "devcard:knight:resolve";
  return "devcard:knight:play";
}
```

Then implement `createDevCardPlayRunner(...)` with these injected dependencies:

```js
export function createDevCardPlayRunner({
  getLayerEl,
  getAnchorRect,
  getPerspective,
  getMotionPolicy,
  actorStoreRef,
  emitCue,
  onStart,
  onResolveComplete
} = {}) {
  return function run(event) {
    const payload = event?.payload ?? event;
    if (!payload || payload.cardType !== "knight") return;

    const policy = getMotionPolicy?.() ?? {};
    if (!shouldAnimateDevCardPlay(policy) || isDocumentHidden()) {
      if (payload.phase === "start") onStart?.(payload);
      if (payload.phase === "resolve") onResolveComplete?.(payload);
      return;
    }

    // Implementation details:
    // - phase=start: create a fixed actor, animate from source to parked point, store it.
    // - local source: p{playerId}-devcard-knight
    // - opponent/spectator source: p{playerId}-devcards
    // - phase=resolve: fly stored actor or fallback actor to p{playerId}-largest-army.
    // - emit cue names through emitCue.
  };
}
```

Keep the DOM creation compact:
- root actor `div` with fixed positioning and pointer-events none,
- one `img` for local start,
- back/front images for opponent flip if needed,
- remove actor on resolve completion.

- [ ] **Step 5: Add conservative cue mappings**

In `soundThemes.js`, add:

```js
"devcard:knight:play": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.34 },
"devcard:knight:flip": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.24 },
"devcard:knight:resolve": { src: "/sounds/card_woosh.mp3", volume: 0.36 },
```

Extend `soundThemes.test.js`:

```js
it("maps Knight dev-card play cues", () => {
  expect(DEFAULT_THEME["devcard:knight:play"]).toBeTruthy();
  expect(DEFAULT_THEME["devcard:knight:resolve"].src).toBe("/sounds/card_woosh.mp3");
});
```

- [ ] **Step 6: Run focused runner/audio tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/devCardPlay.test.js app/catana/__tests__/effects/soundThemes.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit the runner**

```bash
git add app/catana/effects/devCardPlay.js app/catana/effects/soundThemes.js app/catana/__tests__/effects/devCardPlay.test.js app/catana/__tests__/effects/soundThemes.test.js
git commit -m "feat: add knight play animation runner"
```

### Task 6: Integrate the Runner in `GameScreen`

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/components/OpponentPlayerBox.js`
- Create or modify: `app/catana/__tests__/GameScreen.devCardPlay.test.js`

- [ ] **Step 1: Write failing source-level integration tests**

Create `app/catana/__tests__/GameScreen.devCardPlay.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gameScreenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen Knight dev-card play effects", () => {
  it("creates the devCardPlay runner with perspective, anchors, and callbacks", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("createDevCardPlayRunner");
    expect(source).toContain("getDevCardPlayPerspective");
    expect(source).toContain("knightDisplayOverrideByPlayerId");
    expect(source).toContain("devCardPlayActorStoreRef");
    expect(source).toContain("devCardPlay:");
    expect(source).toContain("p${playerId}-largest-army");
  });

  it("passes Knight display overrides into local and opponent player surfaces", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("knightDisplayOverride");
    expect(source).toContain("getKnightDisplayOverrideForPlayer");
  });
});
```

- [ ] **Step 2: Run integration source tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.devCardPlay.test.js
```

Expected: FAIL because `GameScreen` is not wired yet.

- [ ] **Step 3: Import helpers and create state in `GameScreen`**

Add imports:

```js
import { createDevCardPlayRunner } from "./effects/devCardPlay";
import { getDevCardPlayPerspective } from "./effects/devCardPlayPerspective";
import { getKnightDisplayOverrideForPlayer } from "./utils/devCardPlayPresentation";
```

Add state/refs near existing refs:

```js
const devCardPlayActorStoreRef = useRef(new Map());
const [knightDisplayOverrideByPlayerId, setKnightDisplayOverrideByPlayerId] =
  useState({});
```

- [ ] **Step 4: Add display override callbacks**

Add callbacks:

```js
const handleDevCardPlayStart = useCallback((payload) => {
  if (!payload || payload.cardType !== "knight") return;
  setKnightDisplayOverrideByPlayerId((current) => ({
    ...current,
    [String(payload.playerId)]: {
      playerId: String(payload.playerId),
      knightsPlayed: payload.previousKnightsPlayed,
      largestArmyOwnerId: payload.previousLargestArmyOwnerId ?? null
    }
  }));
}, []);

const handleDevCardPlayResolveComplete = useCallback((payload) => {
  if (!payload?.playerId) return;
  setKnightDisplayOverrideByPlayerId((current) => {
    const next = { ...current };
    delete next[String(payload.playerId)];
    return next;
  });
}, []);
```

- [ ] **Step 5: Add anchor and motion-policy helpers**

Inside `GameScreen`, add:

```js
const getDevCardPlayAnchorRect = useCallback((anchorId) => {
  if (typeof document === "undefined" || !anchorId) return null;
  return document.getElementById(anchorId)?.getBoundingClientRect?.() ?? null;
}, []);

const getDevCardPlayMotionPolicy = useCallback(() => {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  return {
    reducedMotion: Boolean(reducedMotion),
    animationsEnabled: true
  };
}, []);
```

- [ ] **Step 6: Register `devCardPlay` in the `effects` memo**

Add to `effects`:

```js
devCardPlay: ({ layerRef, emitCue }) => {
  const runner = createDevCardPlayRunner({
    getLayerEl: () => layerRef.current,
    getAnchorRect: getDevCardPlayAnchorRect,
    getPerspective: (payload) =>
      getDevCardPlayPerspective({
        playerId: payload?.playerId,
        viewerPlayerId: playerID
      }),
    getMotionPolicy: getDevCardPlayMotionPolicy,
    actorStoreRef: devCardPlayActorStoreRef,
    emitCue,
    onStart: handleDevCardPlayStart,
    onResolveComplete: handleDevCardPlayResolveComplete
  });

  return (event) => runner(event);
}
```

Add all callbacks and `playerID` to the memo dependency list.

- [ ] **Step 7: Thread display overrides to local and opponents**

For local `PlayerActionContainer`:

```jsx
knightDisplayOverride={getKnightDisplayOverrideForPlayer(
  knightDisplayOverrideByPlayerId,
  player.id
)}
```

For each `OpponentPlayerBox`, pass the matching override.

Update `PlayerActionContainer` and `OpponentPlayerBox` props to pass `knightDisplayOverride` down to `PlayerAvatarStats`.

- [ ] **Step 8: Run source integration tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.devCardPlay.test.js app/catana/__tests__/effects/devCardPlay.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit GameScreen integration**

```bash
git add app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js app/catana/components/OpponentPlayerBox.js app/catana/__tests__/GameScreen.devCardPlay.test.js
git commit -m "feat: integrate knight play animation in game screen"
```

### Task 7: Add Dev Sandbox Knight Effect Controls

**Files:**
- Modify: `app/catana/dev/sandbox/SandboxPanel.js`
- Modify: `app/catana/dev/sandbox/SandboxBoardShell.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/DevSandboxPanel.source.test.js`

- [ ] **Step 1: Add failing sandbox source tests**

Extend `DevSandboxPanel.source.test.js`:

```js
it("exposes Knight animation tuning controls", () => {
  const panelSource = read("../dev/sandbox/SandboxPanel.js");
  const shellSource = read("../dev/sandbox/SandboxBoardShell.js");
  const gameScreenSource = read("../GameScreen.js");

  expect(panelSource).toContain("Opponent Plays Knight");
  expect(panelSource).toContain("Resolve Opponent Knight");
  expect(panelSource).toContain("Reset Knight Visual");
  expect(shellSource).toContain("catana:dev-sandbox:devcard-play");
  expect(gameScreenSource).toContain("catana:dev-sandbox:devcard-play");
});
```

- [ ] **Step 2: Run sandbox source test to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxPanel.source.test.js
```

Expected: FAIL because the controls and bridge do not exist.

- [ ] **Step 3: Add panel buttons**

In `SandboxPanel`, accept new callbacks:

```js
onTriggerOpponentKnightStart,
onTriggerOpponentKnightResolve,
onResetKnightVisual
```

Add a section:

```jsx
<div className="flex flex-col gap-2">
  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
    Knight animation
  </div>
  <div className="grid grid-cols-1 gap-2">
    <button type="button" onClick={onTriggerOpponentKnightStart}>Opponent Plays Knight</button>
    <button type="button" onClick={onTriggerOpponentKnightResolve}>Resolve Opponent Knight</button>
    <button type="button" onClick={onResetKnightVisual}>Reset Knight Visual</button>
  </div>
</div>
```

Use the existing sandbox button styling.

- [ ] **Step 4: Dispatch dev-only CustomEvents from `SandboxBoardShell`**

Add helper:

```js
const getSandboxOpponentId = () =>
  playerIds.find((id) => String(id) !== String(viewerSeat)) ?? playerIds[0];

const dispatchKnightSandboxEvent = (phase) => {
  if (typeof window === "undefined") return;
  const playerId = getSandboxOpponentId();
  window.dispatchEvent(
    new CustomEvent("catana:dev-sandbox:devcard-play", {
      detail: {
        phase,
        payload: {
          effectId: `sandbox:devcard:knight:${playerId}:${phase}:${Date.now()}`,
          playerId,
          cardType: "knight",
          phase,
          startedFromStage: "postRoll",
          previousKnightsPlayed: bgioProps.G?.core?.playerStateById?.[playerId]?.knightsPlayed ?? 0,
          nextKnightsPlayed:
            (bgioProps.G?.core?.playerStateById?.[playerId]?.knightsPlayed ?? 0) + 1,
          previousLargestArmyOwnerId: bgioProps.G?.core?.awards?.largestArmyOwnerId ?? null,
          nextLargestArmyOwnerId: playerId
        }
      }
    })
  );
};
```

Wire the panel callbacks:

```jsx
onTriggerOpponentKnightStart={() => dispatchKnightSandboxEvent("start")}
onTriggerOpponentKnightResolve={() => dispatchKnightSandboxEvent("resolve")}
onResetKnightVisual={() => dispatchKnightSandboxEvent("reset")}
```

- [ ] **Step 5: Listen for sandbox events in `GameScreen`**

Add a dev-sandbox-only effect:

```js
useEffect(() => {
  if (matchID !== "dev-sandbox") return undefined;
  if (typeof window === "undefined") return undefined;

  const handler = (event) => {
    const phase = event.detail?.phase;
    const payload = event.detail?.payload;
    if (phase === "reset") {
      devCardPlayActorStoreRef.current?.forEach?.((entry) => entry?.node?.remove?.());
      devCardPlayActorStoreRef.current?.clear?.();
      setKnightDisplayOverrideByPlayerId({});
      return;
    }
    if (phase === "start") {
      effectsBus.emit({ type: "devcard:play:start", payload, effectId: payload?.effectId });
    }
    if (phase === "resolve") {
      effectsBus.emit({ type: "devcard:play:resolve", payload, effectId: payload?.effectId });
    }
  };

  window.addEventListener("catana:dev-sandbox:devcard-play", handler);
  return () =>
    window.removeEventListener("catana:dev-sandbox:devcard-play", handler);
}, [effectsBus, matchID]);
```

- [ ] **Step 6: Run sandbox tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxPanel.source.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit sandbox controls**

```bash
git add app/catana/dev/sandbox/SandboxPanel.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/GameScreen.js app/catana/__tests__/DevSandboxPanel.source.test.js
git commit -m "feat: add sandbox knight animation controls"
```

### Task 8: Polish, Docs, and Manual Verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Potentially modify tuning constants in `app/catana/effects/devCardPlay.js`

- [ ] **Step 1: Run the full focused test set**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/Moves.devCards.test.js \
  app/catana/__tests__/effects/GameEffects.test.js \
  app/catana/__tests__/effects/registry.test.js \
  app/catana/__tests__/effects/devCardPlayPerspective.test.js \
  app/catana/__tests__/utils/devCardPlayPresentation.test.js \
  app/catana/__tests__/effects/devCardPlay.test.js \
  app/catana/__tests__/effects/soundThemes.test.js \
  app/catana/__tests__/DevCardDisplayLayout.source.test.js \
  app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js \
  app/catana/__tests__/playerAvatarStats.test.js \
  app/catana/__tests__/GameScreen.devCardPlay.test.js \
  app/catana/__tests__/DevSandboxPanel.source.test.js
```

Expected: PASS.

- [ ] **Step 2: Run lint on touched files**

Run:

```bash
pnpm exec eslint \
  app/catana/Moves.js \
  app/catana/Game.js \
  app/catana/GameScreen.js \
  app/catana/effects/GameEffects.js \
  app/catana/effects/registry.js \
  app/catana/effects/devCardPlay.js \
  app/catana/effects/devCardPlayPerspective.js \
  app/catana/effects/soundThemes.js \
  app/catana/utils/devCardPlayPresentation.js \
  app/catana/components/DevCardDisplay.js \
  app/catana/components/PlayerActionContainer.js \
  app/catana/components/OpponentPlayerBox.js \
  app/catana/components/PlayerAvatarStats.js \
  app/catana/dev/sandbox/SandboxPanel.js \
  app/catana/dev/sandbox/SandboxBoardShell.js
```

Expected: PASS or only pre-existing warnings already documented in this repo.

- [ ] **Step 3: Start the dev server**

Run:

```bash
pnpm dev
```

Expected: Next dev server starts. If port `3000` is busy, use the printed alternate port.

- [ ] **Step 4: Manual sandbox verification**

Open `/catana/dev/sandbox` and use preset `Dev-card ready`.

Verify:
- viewer seat `Visitor 1`: click local Knight and confirm the local start/hold behavior while robber placement is active,
- place the robber and confirm the card flies to the local Largest Army target and the count releases,
- switch to another viewer seat or use sandbox controls to trigger `Opponent Plays Knight`,
- confirm opponent card emerges from the opponent dev stack, flips to Knight, and parks below the opponent box,
- click `Resolve Opponent Knight` and confirm the card flies to that opponent's Largest Army target,
- click `Reset Knight Visual` and confirm no parked cards or frozen counts remain.

- [ ] **Step 5: Manual reduced-motion verification**

With browser reduced motion enabled, repeat one local and one sandbox synthetic flow.

Expected:
- gameplay remains usable,
- no long card movement occurs,
- counts and Largest Army display do not get stuck.

- [ ] **Step 6: Update agent docs**

Append to `docs/agent/PROGRESS.md`:
- summary of the Knight play animation path,
- test commands run,
- manual sandbox verification notes.

Append to `docs/agent/NOTES.md`:
- the new `devCardPlayStarted` / `devCardPlayResolved` payload contract,
- anchor IDs,
- local/opponent perspective split,
- sandbox tuning buttons,
- reduced/disabled motion behavior.

- [ ] **Step 7: Commit docs and final tuning**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md app/catana/effects/devCardPlay.js
git commit -m "docs: note knight play animation workflow"
```

- [ ] **Step 8: Final status check**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing user changes remain.

## Execution Notes

- Use `app/catana/dev/sandbox/` for visual iteration; do not add broad tests for value-only timing tweaks.
- If a visual pass changes shared logic, keep or add focused tests.
- Do not change non-Knight dev-card behavior except where shared helper props are threaded through.
- Do not revert unrelated dirty worktree changes.
