import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Howl } from "howler";
import { createEffectBus } from "../../effects/EffectBus";
import { createAudioManager } from "../../effects/AudioManager";

const howlInstances = [];
const playLog = [];

vi.mock("howler", () => ({
  Howl: vi.fn((config) => {
    const instance = {
      config,
      play: vi.fn(() => {
        const src = Array.isArray(config.src) ? config.src[0] : config.src;
        playLog.push(src);
        return 1;
      }),
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
