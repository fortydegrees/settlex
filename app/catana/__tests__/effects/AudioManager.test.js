import { describe, expect, it, vi } from "vitest";
import { createEffectBus } from "../../effects/EffectBus";
import { createAudioManager } from "../../effects/AudioManager";

vi.mock("howler", () => ({
  Howl: vi.fn(() => ({ play: vi.fn() }))
}));

describe("AudioManager", () => {
  it("plays sound for cue mapping", () => {
    const bus = createEffectBus();
    const audio = createAudioManager({
      bus,
      theme: {
        "resource:travel:start": { src: "/sounds/woosh-card.mp3", volume: 0.6 }
      },
      settings: { muted: false }
    });
    audio.unlock();
    bus.emit({ type: "cue", payload: { name: "resource:travel:start" } });
    expect(audio._debugLastPlay()).toBe("resource:travel:start");
  });
});
