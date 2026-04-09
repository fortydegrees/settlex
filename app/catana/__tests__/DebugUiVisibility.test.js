import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameScreenPath = path.resolve(__dirname, "..", "GameScreen.js");
const leftMetaRailPath = path.resolve(
  __dirname,
  "..",
  "components",
  "LeftMetaRail.js"
);
const pagePath = path.resolve(__dirname, "..", "page.js");
const lobbyPagePath = path.resolve(
  __dirname,
  "..",
  "lobby",
  "LobbyPageClient.js"
);
const lobbyMatchClientPath = path.resolve(
  __dirname,
  "..",
  "lobby",
  "[matchID]",
  "MatchPageClient.js"
);

describe("debug UI visibility", () => {
  it("keeps the in-game debug panel in the extracted rail", () => {
    const gameScreen = fs.readFileSync(gameScreenPath, "utf8");
    expect(gameScreen).toContain("LeftMetaRail");
    expect(gameScreen).not.toContain("<DebugPanel");

    const leftMetaRail = fs.existsSync(leftMetaRailPath)
      ? fs.readFileSync(leftMetaRailPath, "utf8")
      : "";
    expect(leftMetaRail).toContain("DebugPanel");
    expect(leftMetaRail).toMatch(/NODE_ENV\s*!==\s*["']production["']/);
  });

  it("disables boardgame.io debug overlay in catana clients", () => {
    const page = fs.readFileSync(pagePath, "utf8");
    const lobbyMatchClient = fs.readFileSync(lobbyMatchClientPath, "utf8");

    expect(page).toContain('redirect("/")');
    expect(lobbyMatchClient).toMatch(/debug:\s*false/);
  });

  it("keeps the start-from-scenario entry dev-only", () => {
    const lobbyPage = fs.readFileSync(lobbyPagePath, "utf8");

    expect(lobbyPage).toContain("Start from scenario");
    expect(lobbyPage).toMatch(/NODE_ENV\s*!==\s*["']production["']/);
  });
});
