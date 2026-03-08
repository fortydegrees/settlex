import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameScreenPath = path.resolve(__dirname, "..", "GameScreen.js");
const pagePath = path.resolve(__dirname, "..", "page.js");
const lobbyMatchClientPath = path.resolve(
  __dirname,
  "..",
  "lobby",
  "[matchID]",
  "MatchPageClient.js"
);

describe("debug UI visibility", () => {
  it("does not render the in-game debug panel", () => {
    const contents = fs.readFileSync(gameScreenPath, "utf8");
    expect(contents).not.toContain("<DebugPanel");
    expect(contents).not.toMatch(/import\s+\{\s*DebugPanel\s*\}/);
  });

  it("disables boardgame.io debug overlay in catana clients", () => {
    const page = fs.readFileSync(pagePath, "utf8");
    const lobbyMatchClient = fs.readFileSync(lobbyMatchClientPath, "utf8");

    expect(page).toMatch(/debug:\s*false/);
    expect(lobbyMatchClient).toMatch(/debug:\s*false/);
  });
});
