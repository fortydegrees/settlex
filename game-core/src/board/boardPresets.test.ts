import { describe, it, expect } from "vitest";
import { resolveBoardPreset } from "./boardPresets";

describe("board presets", () => {
  it("resolves the standard-random preset", () => {
    const preset = resolveBoardPreset("standard-random");
    expect(preset.map).toBe("hexagon");
    expect(preset.radius).toBe(2);
  });
});
