import { describe, expect, it } from "vitest";

import { getDoubleClickMode } from "./double-click.logic";

describe("getDoubleClickMode", () => {
  it("keeps existing non-toggle modes unchanged", () => {
    expect(getDoubleClickMode("zoomIn", 2, 1)).toBe("zoomIn");
    expect(getDoubleClickMode("zoomOut", 2, 1)).toBe("zoomOut");
    expect(getDoubleClickMode("reset", 2, 1)).toBe("reset");
  });

  it("zooms in when in toggle mode at or below initial scale", () => {
    expect(getDoubleClickMode("toggle", 1, 1)).toBe("zoomIn");
    expect(getDoubleClickMode("toggle", 0.8, 1)).toBe("zoomIn");
  });

  it("resets when in toggle mode and currently zoomed in", () => {
    expect(getDoubleClickMode("toggle", 1.1, 1)).toBe("reset");
  });

  it("uses epsilon to avoid resetting at floating point noise", () => {
    expect(getDoubleClickMode("toggle", 1.00000000005, 1)).toBe("zoomIn");
  });
});
