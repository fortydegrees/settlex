import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Howl } from "howler";
import { createEffectBus } from "../../effects/EffectBus";
import { createAudioManager } from "../../effects/AudioManager";

const howlInstances = [];
const playLog = [];

vi.mock("howler", () => ({
  Howl: vi.fn((config) => {
    const listeners = new Map();
    const instance = {
      config,
      play: vi.fn(() => {
        const src = Array.isArray(config.src) ? config.src[0] : config.src;
        playLog.push(src);
        return 1;
      }),
      once: vi.fn((event, callback, soundId) => {
        const existing = listeners.get(event) ?? [];
        existing.push({ callback, soundId });
        listeners.set(event, existing);
      }),
      _trigger: (event, soundId = 1) => {
        const callbacks = listeners.get(event) ?? [];
        listeners.delete(event);
        callbacks.forEach((listener) => {
          if (listener.soundId == null || listener.soundId === soundId) {
            listener.callback();
          }
        });
      },
      rate: vi.fn(),
      volume: vi.fn()
    };
    howlInstances.push(instance);
    return instance;
  })
}));

describe("AudioManager", () => {
  const originalDocument = global.document;

  beforeEach(() => {
    howlInstances.length = 0;
    playLog.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.document = originalDocument;
  });

  it("plays sound for cue mapping", () => {
    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "resource:pop:start": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.6 }
      },
      settings: { muted: false }
    });
    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "resource:pop:start" } });
    expect(audio._debugLastPlay()).toBe("resource:pop:start");
  });

  it("skips cues when document is hidden unless allowed", () => {
    global.document = { hidden: true };
    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "resource:pop:start": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.6 }
      },
      settings: { muted: false }
    });
    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "resource:pop:start" } });
    expect(audio._debugLastPlay()).toBe(null);
  });

  it("plays cues that are allowed when document is hidden", () => {
    global.document = { hidden: true };
    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "turn:start": { src: "/sounds/shimmer.mp3", volume: 0.5, allowWhenHidden: true }
      },
      settings: { muted: false }
    });
    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "turn:start" } });
    expect(audio._debugLastPlay()).toBe("turn:start");
  });

  it("passes through audio format overrides when provided", () => {
    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "build:settlement": {
          src: "blob://audio",
          volume: 1,
          format: ["mp3"]
        }
      },
      settings: { muted: false }
    });
    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "build:settlement" } });
    expect(Howl).toHaveBeenCalledWith(
      expect.objectContaining({
        format: ["mp3"]
      })
    );
  });

  it("builds a cue plan with shake and throw timing for dice rolls", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "dice:roll": {
          leadIn: {
            variants: ["/sounds/dice-heavy/dice-shake-1.mp3"],
            durationMsBySrc: {
              "/sounds/dice-heavy/dice-shake-1.mp3": 334
            }
          },
          variants: [
            "/sounds/die-throw-1.mp3",
            "/sounds/die-throw-2.mp3"
          ],
          layers: 2,
          startDelayPortion: 0.25,
          impactLeadPortion: 0.5,
          layerDelayMs: [0, 30],
          durationMsBySrc: {
            "/sounds/die-throw-1.mp3": 398,
            "/sounds/die-throw-2.mp3": 515
          },
          randomize: {
            rate: [1, 1]
          }
        }
      },
      settings: { muted: false }
    });

    const plan = audio.planCue("dice:roll");

    expect(plan).toMatchObject({
      cueName: "dice:roll",
      mainStartMs: 334,
      totalDurationMs: 1236,
      leadIn: {
        src: "/sounds/dice-heavy/dice-shake-1.mp3",
        durationMs: 334
      }
    });
    expect(plan.layers).toEqual([
      expect.objectContaining({
        src: "/sounds/die-throw-1.mp3",
        delayMs: 299,
        timelineDelayMs: 100,
        durationMs: 398
      }),
      expect.objectContaining({
        src: "/sounds/die-throw-2.mp3",
        delayMs: 387,
        timelineDelayMs: 129,
        durationMs: 515
      })
    ]);
  });

  it("plays through variants without immediate repeats", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9);

    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "dice:roll": {
          variants: ["/sounds/dice_roll1.mp3", "/sounds/dice_roll2.mp3"],
          shuffle: true
        }
      },
      settings: { muted: false }
    });

    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });

    expect(playLog).toHaveLength(3);
    expect(playLog[0]).not.toBe(playLog[1]);
    expect(playLog[1]).not.toBe(playLog[2]);
  });

  it("layers two distinct variants for a single cue when requested", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.2);

    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "dice:roll": {
          variants: [
            "/sounds/die-throw-1.mp3",
            "/sounds/die-throw-2.mp3",
            "/sounds/die-throw-3.mp3",
            "/sounds/die-throw-4.mp3"
          ],
          shuffle: true,
          layers: 2
        }
      },
      settings: { muted: false }
    });

    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });

    expect(playLog).toHaveLength(2);
    expect(new Set(playLog).size).toBe(2);
  });

  it("plays a shake lead-in before the layered dice roll when configured", () => {
    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "dice:roll": {
          leadIn: {
            variants: [
              "/sounds/dice-shake-1.mp3",
              "/sounds/dice-shake-2.mp3",
              "/sounds/dice-shake-3.mp3"
            ]
          },
          variants: [
            "/sounds/die-throw-1.mp3",
            "/sounds/die-throw-2.mp3",
            "/sounds/die-throw-3.mp3",
            "/sounds/die-throw-4.mp3"
          ],
          layers: 2
        }
      },
      settings: { muted: false }
    });

    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });

    expect(playLog).toEqual(["/sounds/dice-shake-1.mp3"]);

    howlInstances[0]._trigger("end");

    expect(playLog).toEqual([
      "/sounds/dice-shake-1.mp3",
      "/sounds/die-throw-1.mp3",
      "/sounds/die-throw-2.mp3"
    ]);
  });

  it("can overlap the throw before the shake fully ends without forcing shake rate", () => {
    vi.useFakeTimers();

    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "dice:roll": {
          leadIn: {
            variants: ["/sounds/dice-shake-1.mp3"],
            durationMsBySrc: {
              "/sounds/dice-shake-1.mp3": 200
            },
            overlapMs: 20
          },
          variants: [
            "/sounds/die-throw-1.mp3",
            "/sounds/die-throw-2.mp3"
          ],
          layers: 2
        }
      },
      settings: { muted: false }
    });

    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });

    expect(playLog).toEqual(["/sounds/dice-shake-1.mp3"]);
    expect(howlInstances[0].rate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(179);
    expect(playLog).toEqual(["/sounds/dice-shake-1.mp3"]);

    vi.advanceTimersByTime(1);
    expect(playLog).toEqual([
      "/sounds/dice-shake-1.mp3",
      "/sounds/die-throw-1.mp3",
      "/sounds/die-throw-2.mp3"
    ]);
  });

  it("staggered layered variants when configured", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValueOnce(0.4);

    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "dice:roll": {
          variants: [
            "/sounds/die-throw-1.mp3",
            "/sounds/die-throw-2.mp3",
            "/sounds/die-throw-3.mp3",
            "/sounds/die-throw-4.mp3"
          ],
          layers: 2,
          layerDelayMs: [0, 30]
        }
      },
      settings: { muted: false }
    });

    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });

    expect(playLog).toHaveLength(1);
    vi.advanceTimersByTime(11);
    expect(playLog).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(playLog).toHaveLength(2);
  });

  it("applies per-play rate and volume randomization", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);

    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "dice:roll": {
          variants: ["/sounds/dice_roll1.mp3"],
          shuffle: true,
          volume: 0.5,
          randomize: {
            rate: [0.98, 1.02],
            volume: [0.9, 1.0]
          }
        }
      },
      settings: { muted: false }
    });

    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "dice:roll" } });

    const instance = howlInstances[0];
    expect(instance.rate).toHaveBeenCalledWith(1.0, 1);
    expect(instance.volume).toHaveBeenCalledWith(0.475, 1);
  });
});
