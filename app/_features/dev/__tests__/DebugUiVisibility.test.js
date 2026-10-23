import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameScreenPath = path.resolve(process.cwd(), "app/_features/game/GameScreen.js");
const leftMetaRailPath = path.resolve(process.cwd(), "app/_features/game/feed/LeftMetaRail.jsx");
const pagePath = path.resolve(process.cwd(), "app/catana/page.js");
const lobbyMatchClientPath = path.resolve(process.cwd(), "app/_features/matches/room/MatchPageClient.js");

describe("debug UI visibility", () => {
  it("does not render the in-game debug panel in SettleHex clients", () => {
    const gameScreen = fs.readFileSync(gameScreenPath, "utf8");
    expect(gameScreen).toContain("LeftMetaRail");
    expect(gameScreen).not.toContain("<DebugPanel");

    const leftMetaRail = fs.readFileSync(leftMetaRailPath, "utf8");
    expect(leftMetaRail).not.toContain("DebugPanel");
    expect(leftMetaRail).not.toMatch(/NODE_ENV\s*!==\s*["']production["']/);
  });

  it("disables boardgame.io debug overlay in settlehex clients", () => {
    const page = fs.readFileSync(pagePath, "utf8");
    const lobbyMatchClient = fs.readFileSync(lobbyMatchClientPath, "utf8");

    expect(page).toContain('redirect("/")');
    expect(lobbyMatchClient).toMatch(/debug:\s*false/);
  });
});
