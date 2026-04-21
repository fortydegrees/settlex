import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("StatusBanner component", () => {
  it("routes through the shared Settlex banner recipe", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/components/StatusBanner.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Banner"');
    expect(source).toContain("export function StatusBanner");
  });
});
