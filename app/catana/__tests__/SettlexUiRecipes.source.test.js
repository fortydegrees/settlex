import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex UI recipes", () => {
  it("defines a semantic shared button family with motion-accent chrome", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/Button.js"), "utf8");

    expect(source).toContain("primary");
    expect(source).toContain("secondary");
    expect(source).toContain("accent");
    expect(source).toContain("subtle");
    expect(source).toContain("xl");
    expect(source).toContain('pill: "secondary"');
    expect(source).toContain('chip: "subtle"');
    expect(source).toContain("ghost");
    expect(source).toContain("rounded-[1.2rem]");
    expect(source).toContain("hover:-translate-y-0.5");
    expect(source).toContain("bg-[linear-gradient(180deg");
    expect(source).toContain("settlex-ui-cta-shimmer");
    expect(source).toContain("sheen = false");
    expect(source).not.toContain("resolvedVariant === \"accent\"");
    expect(source).toContain("motion-reduce");
  });

  it("defines the shared panel and banner shells as calmer motion-accent glass surfaces", () => {
    const panel = readFileSync(resolve(process.cwd(), "app/ui/Panel.js"), "utf8");
    const banner = readFileSync(resolve(process.cwd(), "app/ui/Banner.js"), "utf8");

    expect(panel).toContain("rounded-[1.6rem]");
    expect(panel).toContain("backdrop-blur-xl");
    expect(panel).toContain("border-white/34");
    expect(panel).toContain("tracking-[0.22em]");
    expect(banner).toContain("neutral");
    expect(banner).toContain("danger");
    expect(banner).toContain("rose-500");
    expect(banner).toContain("rounded-[1.2rem]");
    expect(banner).toContain("shadow-[0_18px_34px_-26px");
    expect(banner).toContain("mt-[0.2rem]");
  });

  it("defines the shared input and select wrappers with the motion-accent control silhouette", () => {
    const input = readFileSync(resolve(process.cwd(), "app/ui/Input.js"), "utf8");
    const select = readFileSync(resolve(process.cwd(), "app/ui/Select.js"), "utf8");

    expect(input).toContain("rounded-[1.1rem]");
    expect(input).toContain("shadow-[0_14px_26px");
    expect(input).toContain("focus:ring-sky-100");
    expect(select).toContain("rounded-[1.1rem]");
    expect(select).toContain("shadow-[0_14px_26px");
    expect(select).toContain("focus:ring-sky-100");
  });
});
