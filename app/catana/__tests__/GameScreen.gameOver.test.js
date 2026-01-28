import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen game over", () => {
  it("checks for game over state", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toContain("gameOverState");
    expect(contents).toContain("GameOverModal");
    expect(contents).toContain("Results");
  });
});
