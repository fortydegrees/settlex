import { describe, expect, it } from "vitest";
import { EFFECTS_LAB_REGISTRY } from "../../dev/effects/registry";

describe("effects lab registry", () => {
  it("includes resource distribution entry", () => {
    const entry = EFFECTS_LAB_REGISTRY.find(
      (item) => item.id === "resource-distribution"
    );
    expect(entry).toBeTruthy();
    expect(entry.label).toBe("Resource Distribution");
    expect(entry.supportsAudio).toBe(true);
  });
});
