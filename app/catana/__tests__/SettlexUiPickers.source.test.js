import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex picker primitives", () => {
  it("defines IconButton as a shared icon-only control over the shared button language", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/IconButton.js"), "utf8");

    expect(source).toContain('from "./Button"');
    expect(source).toContain("rounded-full");
    expect(source).toContain("aria-label");
    expect(source).toContain("secondary");
  });

  it("defines SwatchPicker as a reusable grid color selector while preserving the existing swatch feel", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/SwatchPicker.js"), "utf8");

    expect(source).toContain("grid w-fit grid-cols-4 place-items-center");
    expect(source).toContain("gap-x-6 gap-y-5");
    expect(source).toContain("Choose ${label} player color");
    expect(source).toContain("aria-pressed");
    expect(source).toContain("h-11 w-11");
    expect(source).toContain("focus-visible:ring-2");
    expect(source).toContain("ring-offset-sky-300/80");
    expect(source).toContain("scale-[1.08]");
  });

  it("defines Popover on Base UI with shared floating chrome", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/Popover.js"), "utf8");

    expect(source).toContain("@base-ui/react/popover");
    expect(source).toContain("focus-visible:ring-2");
    expect(source).toContain("rounded-[1.35rem]");
    expect(source).toContain("border-white/34");
    expect(source).toContain("backdrop-blur-xl");
    expect(source).toContain("data-[starting-style]:opacity-0");
    expect(source).toContain("motion-reduce:transition-none");
  });
});
