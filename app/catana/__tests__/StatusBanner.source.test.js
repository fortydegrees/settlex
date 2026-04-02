import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("StatusBanner component", () => {
  it("defines a shared glass banner shell with danger and neutral variants", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/components/StatusBanner.js"),
      "utf8"
    );

    expect(source).toContain("bg-white/80");
    expect(source).toContain("rounded-2xl");
    expect(source).toContain("backdrop-blur-md");
    expect(source).toContain("danger");
    expect(source).toContain("neutral");
    expect(source).toContain("rose-500");
  });
});
