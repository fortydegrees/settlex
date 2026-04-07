import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("effects lab registry", () => {
  it("includes resource distribution entry", () => {
    const source = read("../../dev/effects/registry.js");
    expect(source).toContain('id: "resource-distribution"');
    expect(source).toContain('label: "Resource Distribution"');
    expect(source).toContain("supportsAudio: true");
  });

  it("includes a dev card reveal entry for motion tuning", () => {
    const source = read("../../dev/effects/registry.js");
    expect(source).toContain('id: "dev-card-reveal"');
    expect(source).toContain('label: "Dev Card Reveal"');
    expect(source).toContain("component: DevCardRevealLab");
    expect(source).toContain("supportsAudio: false");
  });
});
