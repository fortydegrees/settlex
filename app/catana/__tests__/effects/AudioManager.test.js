import { afterEach, describe, expect, it, vi } from "vitest";
import { Howl } from "howler";
import { createEffectBus } from "../../effects/EffectBus";
import { createAudioManager } from "../../effects/AudioManager";

vi.mock("howler", () => ({
  Howl: vi.fn(() => ({ play: vi.fn() }))
}));

describe("AudioManager", () => {
  const originalDocument = global.document;

  afterEach(() => {
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
});
