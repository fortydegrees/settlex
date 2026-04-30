import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AnimatedCount,
  getAnimatedCountDirection,
} from "../components/AnimatedCount";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.resolve(
  __dirname,
  "..",
  "components",
  "AnimatedCount.css"
);
const sourcePath = path.resolve(
  __dirname,
  "..",
  "components",
  "AnimatedCount.js"
);

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

  it("keeps motion local and disabled under reduced motion", () => {
    const contents = fs.readFileSync(cssPath, "utf8");
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(contents).toContain("@media (prefers-reduced-motion: reduce)");
    expect(contents).toContain("animation: none");
    expect(contents).toContain("font-variant-numeric: tabular-nums");
    expect(source).toContain("ANIMATION_CLEAR_MS");
    expect(source).toContain("window.setTimeout");
  });
});
