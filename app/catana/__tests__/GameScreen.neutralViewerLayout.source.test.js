import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gameScreenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen neutral viewer layout source", () => {
  it("partitions neutral opponents and renders a public bottom player box", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("getOpponentHudLayout");
    expect(source).toContain("isNeutralViewer: playerID == null");
    expect(source).toContain("bottomOpponent");
    expect(source).toContain('data-neutral-viewer-bottom-player="true"');
    expect(source).toContain("<OpponentPlayerBox");
  });
});
