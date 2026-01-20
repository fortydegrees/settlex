# Effects + Audio v1 (Resource Distribution) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current resource-distribution card animation with a GSAP-driven effect + centralized cue-based audio, while keeping tile flash behavior intact.

**Architecture:** Add a lightweight client Effects layer (event bus + registry + audio manager + effect layer). `GameEffects` listens to `bgio-effects` for `distributeCardsFromTile`, dispatches to the resource-distribution runner, which builds GSAP timelines and emits cues. Audio subscribes to cues and maps them to sounds. Board UI stays thin; tile flash can remain in `Board.js` for now.

**Tech Stack:** React, GSAP, Howler.js, bgio-effects, Tailwind, Vitest.

---

### Task 1: Add GSAP + Howler dependencies + public sound assets

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `public/sounds/woosh-card.mp3`
- Optional (if using sparkle later): `public/sounds/shimmer.mp3`

**Step 1: Add deps**

Run:
```bash
pnpm add gsap howler
```

**Step 2: Copy sound asset(s)**

Run:
```bash
mkdir -p public/sounds
cp sounds/woosh-card.mp3 public/sounds/woosh-card.mp3
# Optional for later sparkle cue
cp sounds/shimmer.mp3 public/sounds/shimmer.mp3
```

**Step 3: Sanity check build**

Run:
```bash
pnpm lint
```
Expected: Existing lint warnings only, no new errors.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml public/sounds/woosh-card.mp3
# add shimmer if copied
git commit -m "feat: add gsap/howler and public sound assets"
```

---

### Task 2: Add EffectBus (dedupe + tests)

**Files:**
- Create: `app/catana/effects/EffectBus.js`
- Create: `app/catana/__tests__/effects/EffectBus.test.js`

**Step 1: Write failing test**

```js
import { describe, expect, it, vi } from "vitest";
import { createEffectBus } from "../../effects/EffectBus";

describe("EffectBus", () => {
  it("delivers events to subscribers", () => {
    const bus = createEffectBus();
    const handler = vi.fn();
    bus.on("fx", handler);
    bus.emit({ type: "fx", payload: { ok: true } });
    expect(handler).toHaveBeenCalledWith({ type: "fx", payload: { ok: true } });
  });

  it("dedupes events by effectId within window", () => {
    const bus = createEffectBus({ dedupeWindowMs: 1000 });
    const handler = vi.fn();
    bus.on("fx", handler);
    bus.emit({ type: "fx", effectId: "same" });
    bus.emit({ type: "fx", effectId: "same" });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/EffectBus.test.js
```
Expected: FAIL (module not found).

**Step 3: Implement EffectBus**

```js
export function createEffectBus({ dedupeWindowMs = 500 } = {}) {
  const handlers = new Map();
  const recent = new Map();

  const on = (type, handler) => {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(handler);
    return () => handlers.get(type)?.delete(handler);
  };

  const emit = (event) => {
    const { type, effectId } = event;
    if (effectId) {
      const now = Date.now();
      const last = recent.get(effectId) ?? 0;
      if (now - last < dedupeWindowMs) return;
      recent.set(effectId, now);
    }
    handlers.get(type)?.forEach((fn) => fn(event));
  };

  return { on, emit };
}
```

**Step 4: Re-run test**

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/EffectBus.test.js
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/effects/EffectBus.js app/catana/__tests__/effects/EffectBus.test.js
git commit -m "feat: add effect bus with dedupe"
```

---

### Task 3: Add AudioManager + theme mapping (with tests)

**Files:**
- Create: `app/catana/effects/soundThemes.js`
- Create: `app/catana/effects/AudioManager.js`
- Create: `app/catana/__tests__/effects/AudioManager.test.js`

**Step 1: Write failing test**

```js
import { describe, expect, it, vi } from "vitest";
import { createEffectBus } from "../../effects/EffectBus";
import { createAudioManager } from "../../effects/AudioManager";

vi.mock("howler", () => ({
  Howl: vi.fn(() => ({ play: vi.fn() }))
}));

describe("AudioManager", () => {
  it("plays sound for cue mapping", () => {
    const bus = createEffectBus();
    const audio = createAudioManager({ bus, theme: {
      "resource:travel:start": { src: "/sounds/woosh-card.mp3", volume: 0.6 }
    }});
    bus.emit({ type: "cue", payload: { name: "resource:travel:start" } });
    expect(audio._debugLastPlay()).toBe("resource:travel:start");
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js
```
Expected: FAIL (module not found).

**Step 3: Implement sound theme + AudioManager**

```js
// soundThemes.js
export const DEFAULT_THEME = {
  "resource:travel:start": { src: "/sounds/woosh-card.mp3", volume: 0.6 }
};
```

```js
// AudioManager.js
import { Howl } from "howler";
import { DEFAULT_THEME } from "./soundThemes";

export function createAudioManager({ bus, theme = DEFAULT_THEME, settings = {} } = {}) {
  const howls = new Map();
  let unlocked = false;
  let lastPlay = null;

  const getHowl = (cueName) => {
    const entry = theme[cueName];
    if (!entry) return null;
    if (!howls.has(cueName)) {
      howls.set(cueName, new Howl({ src: [entry.src], volume: entry.volume ?? 1 }));
    }
    return howls.get(cueName);
  };

  const play = (cueName) => {
    if (settings.muted) return;
    if (!unlocked) return;
    const howl = getHowl(cueName);
    if (!howl) return;
    lastPlay = cueName;
    howl.play();
  };

  const unlock = () => { unlocked = true; };

  const unsubscribe = bus?.on("cue", (event) => {
    const cueName = event.payload?.name;
    if (cueName) play(cueName);
  });

  return {
    unlock,
    destroy: () => unsubscribe?.(),
    _debugLastPlay: () => lastPlay
  };
}
```

**Step 4: Re-run test**

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/effects/soundThemes.js app/catana/effects/AudioManager.js app/catana/__tests__/effects/AudioManager.test.js
git commit -m "feat: add audio manager with cue theme mapping"
```

---

### Task 4: Add shared board layout helper + pass board ref

**Files:**
- Create: `app/catana/utils/boardLayout.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/GameScreen.js`

**Step 1: Add layout helper**

```js
export function computeDefaultSize({ width, height }) {
  const numLevels = 6;
  const maxSizeThatRespectsHeight = (4 * height) / (3 * numLevels + 1) / 2;
  const correspondingWidth = Math.sqrt(3) * maxSizeThatRespectsHeight;
  if (numLevels * correspondingWidth < width) return maxSizeThatRespectsHeight;
  return width / numLevels / Math.sqrt(3);
}

export function getBoardLayout({ width, height }) {
  const containerHeight = height - 144 - 38 - 40;
  const containerWidth = width;
  const size = computeDefaultSize({ width: containerWidth, height: containerHeight });
  const center = [containerWidth / 2, containerHeight / 2];
  return { containerWidth, containerHeight, size, center };
}
```

**Step 2: Update Board.js to use helper + accept boardRef**

- Replace local `computeDefaultSize` with import from `boardLayout.js`.
- Add `boardRef` prop and attach to the root `div`:

```jsx
export function CatanBoard({ ..., boardRef }) { ... }
...
return (
  <div ref={boardRef}>
    ...
  </div>
);
```

**Step 3: Pass boardRef from GameScreen**

```jsx
const boardRef = useRef(null);
...
<CatanBoard boardRef={boardRef} ... />
```

**Step 4: Commit**

```bash
git add app/catana/utils/boardLayout.js app/catana/Board.js app/catana/GameScreen.js
git commit -m "refactor: share board layout helper and board ref"
```

---

### Task 5: Add EffectLayer + GameEffects wiring

**Files:**
- Create: `app/catana/effects/EffectLayer.js`
- Create: `app/catana/effects/GameEffects.js`
- Create: `app/catana/effects/registry.js`
- Modify: `app/catana/GameScreen.js`

**Step 1: EffectLayer (portal with ref)**

```jsx
import React, { forwardRef } from "react";
import ReactDOM from "react-dom";

export const EffectLayer = forwardRef(function EffectLayer(_, ref) {
  const node = (
    <div
      ref={ref}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000 }}
    />
  );
  return ReactDOM.createPortal(node, document.body);
});
```

**Step 2: registry.js**

```js
export function registerEffects({ bus, effects }) {
  const unsubscribes = [];
  if (effects.resourceDistribution) {
    unsubscribes.push(bus.on("resource:distribution", effects.resourceDistribution));
  }
  return () => unsubscribes.forEach((u) => u());
}
```

**Step 3: GameEffects.js (bus + audio + effect layer)**

```jsx
import { useEffect, useMemo, useRef } from "react";
import { useEffectListener } from "bgio-effects/react";
import { createEffectBus } from "./EffectBus";
import { createAudioManager } from "./AudioManager";
import { registerEffects } from "./registry";
import { EffectLayer } from "./EffectLayer";

export function GameEffects({ bgioProps, boardRef, effects }) {
  const bus = useMemo(() => createEffectBus(), []);
  const audio = useMemo(() => createAudioManager({ bus }), [bus]);
  const layerRef = useRef(null);

  useEffect(() => {
    const cleanup = registerEffects({ bus, effects });
    return () => cleanup();
  }, [bus, effects]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [audio]);

  useEffectListener("distributeCardsFromTile", (payload) => {
    bus.emit({ type: "resource:distribution", payload, effectId: payload?.effectId });
  }, [bgioProps?.G?.core?.turn]);

  return <EffectLayer ref={layerRef} />;
}
```

**Step 4: Render GameEffects in GameScreen**

```jsx
<GameEffects bgioProps={bgioProps} boardRef={boardRef} effects={...} />
```

(We will provide `effects` in Task 6.)

**Step 5: Commit**

```bash
git add app/catana/effects/EffectLayer.js app/catana/effects/registry.js app/catana/effects/GameEffects.js app/catana/GameScreen.js
git commit -m "feat: add effect layer and game effects wiring"
```

---

### Task 6: GSAP resource distribution runner + cue emission

**Files:**
- Create: `app/catana/effects/resourceDistribution.js`
- Create: `app/catana/__tests__/effects/resourceDistribution.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/Board.js`

**Step 1: Write failing test for cue registration**

```js
import { describe, expect, it, vi } from "vitest";
import { scheduleResourceCues } from "../../effects/resourceDistribution";

describe("resourceDistribution cues", () => {
  it("registers travel-start cue", () => {
    const calls = [];
    const tl = { call: (fn, _, label) => calls.push(label) };
    scheduleResourceCues(tl, () => {});
    expect(calls).toContain("travel");
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js
```
Expected: FAIL (module not found).

**Step 3: Implement resourceDistribution runner**

```js
import { gsap } from "gsap";
import { RESOURCE_ICON_SVGS } from "../game/types";
import { tilePixelVector } from "../utils/coordinates";

const CARD_CLASS = "rounded border-2 border-white p-2 drop-shadow-lg";

function createCardElement(resource) {
  const el = document.createElement("div");
  el.className = CARD_CLASS;
  el.style.position = "absolute";
  el.style.backgroundColor = getCardColor(resource);

  const img = document.createElement("img");
  img.src = RESOURCE_ICON_SVGS[resource];
  img.alt = "";
  el.appendChild(img);
  return el;
}

export function scheduleResourceCues(tl, emitCue) {
  tl.call(() => emitCue("resource:travel:start"), null, "travel");
}

export function createResourceDistributionRunner({ layerEl, getLayout, getBoardRect, emitCue }) {
  return function run(payload) {
    const cards = Array.isArray(payload) ? payload : payload.cards || [];
    if (!layerEl) return;

    const { size, center } = getLayout();
    const boardRect = getBoardRect();

    cards.forEach((card, index) => {
      const [centerX, centerY] = center;
      const [tileX, tileY] = tilePixelVector(card.coordinate, size, centerX, centerY);
      const startX = boardRect.left + tileX - (size * 0.25);
      const startY = boardRect.top + tileY - size;

      const targetEl = document.getElementById(`p${card.playerID}-${card.resource}`)
        || document.getElementById(`p${card.playerID}-resources`);
      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      const endX = targetRect.left;
      const endY = targetRect.top - 15;

      const el = createCardElement(card.resource);
      layerEl.appendChild(el);
      gsap.set(el, { x: startX, y: startY, opacity: 0, scale: 0.7 });

      const tl = gsap.timeline({
        onComplete: () => el.remove()
      });

      tl.to(el, { opacity: 1, scale: 1, duration: 0.15 })
        .addLabel("travel")
        .to(el, { x: endX, y: endY, duration: 0.6, ease: "power2.out" }, "travel");

      scheduleResourceCues(tl, emitCue);
      tl.delay(index * 0.5);
    });
  };
}
```

**Step 4: Wire effect runner into GameScreen + GameEffects**

- In `GameScreen.js`, build `effects` object and pass into `GameEffects`:

```js
import { createResourceDistributionRunner } from "./effects/resourceDistribution";
import { getBoardLayout } from "./utils/boardLayout";

const effects = useMemo(() => ({
  resourceDistribution: (event) => {
    const run = createResourceDistributionRunner({
      layerEl: effectLayerRef.current,
      getLayout: () => getBoardLayout({ width, height }),
      getBoardRect: () => boardRef.current?.getBoundingClientRect() ?? new DOMRect(),
      emitCue: (name) => bus.emit({ type: "cue", payload: { name } })
    });
    run(event.payload);
  }
}), [width, height, boardRef]);
```

(Implementation detail: pass `layerEl` + `bus` into `GameEffects`, so `GameEffects` can pass them to the runner without recreating on every event.)

**Step 5: Remove old card animation from Board.js**

- Remove `CardAnimContainer`, `useTransition`, and `ReactDOM` usage.
- Keep the tile flashing logic in `useEffectListener("distributeCardsFromTile")`, but remove the card animation side effects.

**Step 6: Re-run tests**

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js
```
Expected: PASS.

**Step 7: Commit**

```bash
git add app/catana/effects/resourceDistribution.js app/catana/__tests__/effects/resourceDistribution.test.js app/catana/Board.js app/catana/GameScreen.js
git commit -m "feat: gsap resource distribution effect with cue"
```

---

### Task 7: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add a short PROGRESS entry**

Example:
```
## Status (2026-01-16)
- Implemented GSAP-based resource distribution effect with cue-driven audio and effect bus wiring.
```

**Step 2: Add a NOTE about the new Effects system entry point**

Example:
```
- Effects system entry point: `app/catana/effects/GameEffects.js`, with GSAP runner in `app/catana/effects/resourceDistribution.js` and audio mapping in `app/catana/effects/AudioManager.js`.
```

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: log effects system entry points"
```

---

## Verification

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/EffectBus.test.js
pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js
pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js
pnpm lint
```

Expected: tests pass; lint only shows pre-existing warnings.

---

Plan complete and saved to `docs/plans/2026-01-16-effects-audio-v1-plan.md`.

Two execution options:

1) Subagent-Driven (this session) – I dispatch a fresh subagent per task, review between tasks, fast iteration

2) Parallel Session (separate) – Open a new session with executing-plans, batch execution with checkpoints

Which approach?
