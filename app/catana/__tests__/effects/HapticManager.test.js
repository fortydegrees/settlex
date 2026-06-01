import { describe, expect, it, vi } from "vitest";
import { createEffectBus } from "../../effects/EffectBus";
import { createHapticManager } from "../../effects/HapticManager";

const createEnvironment = ({
  vibrate = vi.fn(() => true),
  hidden = false,
  coarsePointer = true,
  reducedMotion = false,
  maxTouchPoints = 1,
  now = () => 1000
} = {}) => ({
  getNavigator: () => ({
    maxTouchPoints,
    vibrate
  }),
  getWindow: () => ({
    matchMedia: (query) => ({
      matches:
        query === "(pointer: coarse)" ? coarsePointer :
        query === "(prefers-reduced-motion: reduce)" ? reducedMotion :
        false
    })
  }),
  isHidden: () => hidden,
  now
});

describe("HapticManager", () => {
  it("plays mapped cue haptics after unlock", () => {
    const vibrate = vi.fn(() => true);
    const bus = createEffectBus();
    const haptics = createHapticManager({
      bus,
      theme: {
        "turn:start": { pattern: 12 }
      },
      environment: createEnvironment({ vibrate })
    });

    haptics.unlock();
    bus.emit({ type: "cue", payload: { name: "turn:start" } });

    expect(vibrate).toHaveBeenCalledWith(12);
    expect(haptics._debugLastPlay()).toBe("turn:start");
  });

  it("skips hidden-tab haptics unless the entry allows hidden playback", () => {
    const vibrate = vi.fn(() => true);
    const bus = createEffectBus();
    const haptics = createHapticManager({
      bus,
      theme: {
        "turn:start": { pattern: 10 },
        "game:win": { pattern: [10, 40, 18], allowWhenHidden: true }
      },
      environment: createEnvironment({ vibrate, hidden: true })
    });

    haptics.unlock();
    bus.emit({ type: "cue", payload: { name: "turn:start" } });
    bus.emit({ type: "cue", payload: { name: "game:win" } });

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([10, 40, 18]);
  });

  it("throttles repeated haptic names", () => {
    const vibrate = vi.fn(() => true);
    const bus = createEffectBus();
    let currentNow = 1000;
    const haptics = createHapticManager({
      bus,
      theme: {
        "ui:tap": { pattern: 8, minIntervalMs: 100 }
      },
      environment: createEnvironment({
        vibrate,
        now: () => currentNow
      })
    });

    haptics.unlock();
    bus.emit({ type: "haptic", payload: { name: "ui:tap" } });
    currentNow += 50;
    bus.emit({ type: "haptic", payload: { name: "ui:tap" } });
    currentNow += 50;
    bus.emit({ type: "haptic", payload: { name: "ui:tap" } });

    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it("can delay cue haptics against an audio cue plan", () => {
    vi.useFakeTimers();
    const vibrate = vi.fn(() => true);
    const bus = createEffectBus();
    const haptics = createHapticManager({
      bus,
      theme: {
        "dice:roll": { pattern: [8, 24, 14], planDelay: "firstLayer", minIntervalMs: 0 }
      },
      environment: createEnvironment({ vibrate })
    });

    haptics.unlock();
    bus.emit({
      type: "cue",
      payload: {
        name: "dice:roll",
        plan: {
          mainStartMs: 120,
          layers: [{ delayMs: 220 }, { delayMs: 260 }]
        }
      }
    });

    expect(vibrate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(339);
    expect(vibrate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(vibrate).toHaveBeenCalledWith([8, 24, 14]);
    haptics.destroy();
    vi.useRealTimers();
  });
});
