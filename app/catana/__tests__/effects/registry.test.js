import { describe, expect, it, vi } from "vitest";
import { registerEffects } from "../../effects/registry";

describe("registerEffects", () => {
  it("registers resource distribution handler and cleans up", () => {
    const unsubscribe = vi.fn();
    const bus = { on: vi.fn(() => unsubscribe) };
    const handler = vi.fn();

    const cleanup = registerEffects({
      bus,
      effects: { resourceDistribution: handler }
    });

    expect(bus.on).toHaveBeenCalledWith("resource:distribution", handler);
    cleanup();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("registers piece placement handler and cleans up", () => {
    const unsubscribe = vi.fn();
    const bus = { on: vi.fn(() => unsubscribe) };
    const handler = vi.fn();

    const cleanup = registerEffects({
      bus,
      effects: { piecePlacement: handler }
    });

    expect(bus.on).toHaveBeenCalledWith("build:place", handler);
    cleanup();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("registers dev card reveal handler and cleans up", () => {
    const unsubscribe = vi.fn();
    const bus = { on: vi.fn(() => unsubscribe) };
    const handler = vi.fn();

    const cleanup = registerEffects({
      bus,
      effects: { devCardReveal: handler }
    });

    expect(bus.on).toHaveBeenCalledWith("devcard:reveal", handler);
    cleanup();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
