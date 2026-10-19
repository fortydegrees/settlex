import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("GlobalReconnectBanner wiring", () => {
  it("mounts the reconnect banner from the root layout", () => {
    const source = readFileSync(resolve(process.cwd(), "app/layout.js"), "utf8");

    expect(source).toContain("GlobalReconnectBanner");
  });
});
