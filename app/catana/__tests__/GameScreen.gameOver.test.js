import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");
const displayModelPath = path.resolve(
  __dirname,
  "..",
  "utils",
  "gameScreenDisplayModel.js"
);

describe("GameScreen game over", () => {
  it("checks for game over state", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    const displayModelContents = fs.readFileSync(displayModelPath, "utf8");

    expect(contents).toContain("gameOverState");
    expect(contents).toContain("buildGameScreenDisplayModel");
    expect(contents).toContain("GameOverModal");
    expect(contents).toContain("Results");
    expect(displayModelContents).toContain("Disconnect Forfeit");
    expect(displayModelContents).toContain("Resignation");
  });

  it("tracks winner confetti outside the modal so reopening results does not replay it", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("winnerConfettiSeenRef");
    expect(contents).toContain("winnerConfettiSeenRef.current = false");
    expect(contents).toContain("shouldFireConfetti={isWinner && !winnerConfettiSeenRef.current}");
    expect(contents).toContain("onConfettiFired={() => {\n              winnerConfettiSeenRef.current = true;\n            }}");
  });

  it("wires a shared resign confirm dialog", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toContain("ResignConfirmDialog");
    expect(contents).toContain("moves.resign");
    expect(contents).toContain(
      '<div className="fixed right-4 top-4 z-40" data-allow-interaction="true">'
    );
    expect(contents).not.toContain(
      '<GlassPillButton\n          className="fixed right-4 top-4 z-40"'
    );
    expect(contents).not.toContain("window.confirm");
  });

  it("guards live-only flows when rendering archived replay state", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("const isReplay = bgioProps.isReplay === true");
    expect(contents).toContain("if (isReplay) return;");
    expect(contents).toContain("!isReplay && !isGameOver && !!player");
    expect(contents).toContain("{!isReplay && (");
  });
});
