import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex UI recipes", () => {
  it("defines the shared button variants with stronger chrome", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/Button.js"), "utf8");

    expect(source).toContain("primary");
    expect(source).toContain("pill");
    expect(source).toContain("ghost");
    expect(source).toContain("chip");
    expect(source).toContain("rounded-2xl");
    expect(source).toContain("hover:-translate-y-0.5");
    expect(source).toContain("bg-[linear-gradient(180deg");
    expect(source).toContain("motion-reduce");
  });

  it("defines the shared panel and banner shells as layered glass surfaces", () => {
    const panel = readFileSync(resolve(process.cwd(), "app/ui/Panel.js"), "utf8");
    const banner = readFileSync(resolve(process.cwd(), "app/ui/Banner.js"), "utf8");

    expect(panel).toContain("rounded-[1.75rem]");
    expect(panel).toContain("backdrop-blur-xl");
    expect(panel).toContain("tracking-[0.22em]");
    expect(panel).toContain("h-2.5 w-2.5");
    expect(banner).toContain("neutral");
    expect(banner).toContain("danger");
    expect(banner).toContain("rose-500");
    expect(banner).toContain("rounded-[1.4rem]");
    expect(banner).toContain("backdrop-blur-xl");
  });

  it("defines the shared input and select wrappers with the new control silhouette", () => {
    const input = readFileSync(resolve(process.cwd(), "app/ui/Input.js"), "utf8");
    const select = readFileSync(resolve(process.cwd(), "app/ui/Select.js"), "utf8");

    expect(input).toContain("rounded-2xl");
    expect(input).toContain("backdrop-blur-md");
    expect(input).toContain("focus-visible:ring-sky-100");
    expect(select).toContain("rounded-2xl");
    expect(select).toContain("backdrop-blur-md");
    expect(select).toContain("focus-visible:ring-sky-100");
  });
});
