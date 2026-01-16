import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("GameEffects", () => {
  it("wires distributeCardsFromTile to resource distribution events", () => {
    const path = fileURLToPath(
      new URL("../../effects/GameEffects.js", import.meta.url)
    );
    const source = fs.readFileSync(path, "utf8");
    expect(source).toContain("useEffectListener");
    expect(source).toContain("distributeCardsFromTile");
    expect(source).toContain("resource:distribution");
  });
});
