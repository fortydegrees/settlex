import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const readAppFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

describe("public branding and legacy route wiring", () => {
  it("uses Settlehex for the visible app shell and account copy", () => {
    const layoutSource = readAppFile("app", "layout.js");
    const accountSource = readAppFile("app", "account", "page.js");
    const lobbySource = readAppFile("app", "catana", "lobby", "LobbyPageClient.js");

    expect(layoutSource).toContain("title: 'Settlehex'");
    expect(accountSource).toContain("Settlehex account");
    expect(accountSource).not.toContain("Settlex account");
    expect(lobbySource).toContain("Settlehex");
    expect(lobbySource).not.toContain("\n            Catana\n");
  });

  it("removes public /catana links and catana-named reconnect copy", () => {
    const matchPageSource = readAppFile(
      "app",
      "catana",
      "lobby",
      "[matchID]",
      "MatchPageClient.js"
    );
    const gameScreenSource = readAppFile("app", "catana", "GameScreen.js");
    const bannerSource = readAppFile(
      "app",
      "catana",
      "components",
      "GlobalReconnectBanner.js"
    );

    expect(matchPageSource).not.toContain('href="/catana"');
    expect(matchPageSource).not.toContain("/catana");
    expect(gameScreenSource).not.toContain('window.location.href = "/catana"');
    expect(bannerSource).not.toContain("latest Catana match");
  });

  it("redirects the legacy /catana route back to the root lobby", () => {
    const legacyPageSource = readAppFile("app", "catana", "page.js");

    expect(legacyPageSource).toContain('from "next/navigation"');
    expect(legacyPageSource).toContain('redirect("/")');
  });
});
