import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex UI recipes", () => {
  it("defines the shared button variants", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/Button.js"), "utf8");

    expect(source).toContain("primary");
    expect(source).toContain("pill");
    expect(source).toContain("ghost");
    expect(source).toContain("chip");
    expect(source).toContain("motion-reduce");
  });

  it("defines the shared panel and banner shells", () => {
    const panel = readFileSync(resolve(process.cwd(), "app/ui/Panel.js"), "utf8");
    const banner = readFileSync(resolve(process.cwd(), "app/ui/Banner.js"), "utf8");

    expect(panel).toContain("rounded-xl");
    expect(panel).toContain("bg-white/25");
    expect(panel).toContain("backdrop-blur-sm");
    expect(banner).toContain("neutral");
    expect(banner).toContain("danger");
    expect(banner).toContain("rose-500");
  });

  it("defines the shared input and select wrappers", () => {
    const input = readFileSync(resolve(process.cwd(), "app/ui/Input.js"), "utf8");
    const select = readFileSync(resolve(process.cwd(), "app/ui/Select.js"), "utf8");

    expect(input).toContain("bg-white/60");
    expect(input).toContain("focus-visible:ring-2");
    expect(select).toContain("bg-white/60");
    expect(select).toContain("focus-visible:ring-2");
  });
});
