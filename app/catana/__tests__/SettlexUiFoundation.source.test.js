import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex UI foundation", () => {
  it("adds the Base UI dependency and isolated app root", () => {
    const pkg = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "app/layout.js"), "utf8");

    expect(pkg).toContain('"@base-ui/react"');
    expect(layout).toContain("settlex-ui-root");
    expect(layout).toContain("GlobalReconnectBanner");
  });

  it("defines shared UI tokens and dialog motion hooks in globals", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(css).toContain("--settlex-ui-radius-panel");
    expect(css).toContain("--settlex-ui-duration-fast");
    expect(css).toContain("--settlex-ui-duration-dialog");
    expect(css).toContain("--settlex-ui-z-dialog");
    expect(css).toContain("--settlex-ui-z-popover");
    expect(css).toContain("--settlex-ui-z-tooltip");
    expect(css).toContain("--settlex-ui-z-status");
    expect(css).toContain(".settlex-ui-root");
    expect(css).toContain("isolation: isolate");
    expect(css).toContain(".settlex-ui-layer-dialog");
    expect(css).toContain(".settlex-ui-layer-status");
    expect(css).toContain(".settlex-ui-dialog-backdrop");
    expect(css).toContain(".settlex-ui-dialog-popup");
  });
});
