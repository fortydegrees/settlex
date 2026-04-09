import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

const readAppFile = (...segments) =>
  fs.readFileSync(path.join(appRoot, ...segments), "utf8");

describe("server origin wiring", () => {
  it("routes the lobby page through app-owned match APIs", () => {
    const contents = readAppFile("lobby", "LobbyPageClient.js");

    expect(contents).toContain('route: "/api/matches/open"');
    expect(contents).not.toContain('from "../utils/serverOrigins"');
    expect(contents).not.toContain("getLobbyServerOrigin");
    expect(contents).not.toContain('window.location.hostname}:8080');
  });

  it("routes the match page through same-origin app APIs and the shared game origin helper", () => {
    const contents = readAppFile("lobby", "[matchID]", "MatchPageClient.js");

    expect(contents).toContain('from "../../utils/serverOrigins"');
    expect(contents).toContain("getGameServerOrigin");
    expect(contents).toContain('route: `/api/matches/${matchID}`');
    expect(contents).toContain('route: "/api/matches/join"');
    expect(contents).not.toContain('window.location.hostname}:8080');
    expect(contents).not.toContain('window.location.hostname}:8000');
  });

  it("routes the legacy catana page through the shared origin helpers", () => {
    const contents = readAppFile("page.js");

    expect(contents).toContain('from "./utils/serverOrigins"');
    expect(contents).toContain("getLobbyServerOrigin()");
    expect(contents).toContain("getGameServerOrigin()");
    expect(contents).not.toContain("localhost:8000");
    expect(contents).not.toContain("localhost:8080");
  });
});
