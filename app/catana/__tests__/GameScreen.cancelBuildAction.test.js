import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("GameScreen build-action cancel wiring", () => {
  it("adds a capture handler that uses shouldCancelBuildAction", () => {
    const gameScreenPath = fileURLToPath(
      new URL("../GameScreen.js", import.meta.url)
    );
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("const [buildPickup, setBuildPickup] = useState(null)");
    expect(source).toContain("setBuildPickup(null)");
    expect(source).toContain("onClickCapture");
    expect(source).toContain("shouldCancelBuildAction");
    expect(source).toContain('event.code === "Escape"');
    expect(source).toContain("data-action-circle");
  });
});
