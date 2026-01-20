import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen audio mute", () => {
  it("adds a top-left mute toggle with persistent storage", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/Howler\.mute/);
    expect(contents).toContain("catana:audioMuted");
    expect(contents).toContain("Mute audio");
    expect(contents).toContain("left-4");
    expect(contents).toContain("top-4");
  });
});
