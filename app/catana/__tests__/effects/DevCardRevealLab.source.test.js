import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Dev card reveal lab source", () => {
  it("wires the real dock card, reveal actor, and dev-card destination shell together", () => {
    const source = read("../../dev/effects/DevCardRevealLab.jsx");
    expect(source).toContain("DockCard");
    expect(source).toContain("DevCardPurchaseReveal");
    expect(source).toContain("DevCardDisplay");
    expect(source).toContain("preLaunchDelayMs");
    expect(source).toContain("Replay Reveal");
  });
});
