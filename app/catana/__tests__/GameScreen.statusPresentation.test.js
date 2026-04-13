import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen status presentation source", () => {
  it("passes viewer context into the shared game-status resolver", () => {
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("viewerPlayerId: playerID");
    expect(source).toContain("playerMap: nameMap");
    expect(source).toMatch(/getGameStatus\(core, bgioProps\.ctx, \{/);
  });

  it("composes timer visibility from the status helper", () => {
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("shouldShowGameStatusTimer");
    expect(source).toContain("showTimer:");
  });

  it("passes replay and game-over visibility into the turn controls", () => {
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("showTurnControls={!isReplay && !isGameOver}");
  });
});
