import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = process.cwd();

const readAppFile = (...segments) =>
  fs.readFileSync(path.join(appRoot, ...segments), "utf8");

describe("server origin wiring", () => {
  it("routes the match page through same-origin app APIs and the shared game origin helper", () => {
    const contents = readAppFile("app/_features/matches/room/MatchPageClient.js");

    expect(contents).toContain("getGameServerOrigin");
    expect(contents).toContain('route: `/api/matches/${matchID}`');
    expect(contents).toContain('route: "/api/matches/join"');
    expect(contents).not.toContain('window.location.hostname}:8080');
    expect(contents).not.toContain('window.location.hostname}:8000');
  });

  it("redirects the legacy catana page back to the root lobby", () => {
    const contents = readAppFile("app/catana/page.js");

    expect(contents).toContain('from "next/navigation"');
    expect(contents).toContain('redirect("/")');
  });
});
