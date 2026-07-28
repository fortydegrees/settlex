import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AnimatedCount,
  getAnimatedCountDirection,
} from "../components/AnimatedCount";

describe("AnimatedCount", () => {
  it("derives slide direction from the comparable numeric value", () => {
    expect(getAnimatedCountDirection(2, 3)).toBe("increase");
    expect(getAnimatedCountDirection(3, 2)).toBe("decrease");
    expect(getAnimatedCountDirection(3, 3)).toBe("steady");
  });

  it("renders an accessible stable numeric shell", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AnimatedCount, {
        value: "3 (+1)",
        motionValue: 4,
        className: "vp-badge",
      })
    );

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain('aria-label="3 (+1)"');
    expect(markup).toContain("animated-count");
    expect(markup).toContain("vp-badge");
    expect(markup).toContain("3 (+1)");
  });
});
