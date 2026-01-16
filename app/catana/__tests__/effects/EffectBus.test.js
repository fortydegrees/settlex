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
