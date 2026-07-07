import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("GlobalReconnectBanner wiring", () => {
  it("mounts the reconnect banner from the root layout", () => {
    const source = readFileSync(resolve(process.cwd(), "app/layout.js"), "utf8");

    expect(source).toContain("GlobalReconnectBanner");
  });

  it("renders the approved reconnect copy and route target", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/components/GlobalReconnectBanner.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Button"');
    expect(source).toContain("StatusBanner");
    expect(source).toContain("overlay");
    expect(source).toContain("You're already in a game");
    expect(source).toContain("Rejoin match");
    expect(source).toContain("Dismiss");
    expect(source).toContain("resolveReconnectBannerCandidate");
    expect(source).toContain("max-w-2xl");
    expect(source).not.toContain("fixed inset-x-0 top-3");
    expect(source).not.toContain("rounded-full px-3 py-2");
  });
});
