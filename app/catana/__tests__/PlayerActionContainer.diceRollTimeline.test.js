import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("PlayerActionContainer dice roll timeline wiring", () => {
  it("subscribes to the shared dice roll timeline bus event", () => {
    const path = fileURLToPath(
      new URL("../components/PlayerActionContainer.js", import.meta.url)
    );
    const source = fs.readFileSync(path, "utf8");
    expect(source).toContain("effectsBus");
    expect(source).toContain("dice:roll:timeline");
    expect(source).toContain("buildDiceAnimationPair");
  });
});
