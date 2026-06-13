import { afterEach, describe, expect, it, vi } from "vitest";
import { createEffectBus } from "../../effects/EffectBus";

afterEach(() => {
  vi.useRealTimers();
});

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

  it("drops stale effect IDs from the dedupe cache", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00.000Z"));

    const bus = createEffectBus({ dedupeWindowMs: 1000 });
    bus.emit({ type: "fx", effectId: "old" });

    vi.setSystemTime(new Date("2026-06-13T12:00:01.001Z"));
    bus.emit({ type: "fx", effectId: "new" });

    expect(bus._debugRecentSize()).toBe(1);
  });
});
