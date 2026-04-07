import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("MatchPageClient bot fill control", () => {
  it("exposes a control to fill open seats with puffer bots", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain("Fill Open Seats With Bots");
    expect(source).toContain('route: "/api/matches/join"');
    expect(source).toContain('participantType: "bot"');
    expect(source).toContain('botKey: "puffer"');
    expect(source).toContain('avatarEmoji: "🤖"');
    expect(source).toContain("fillOpenSeatsWithBots");
  });

  it("passes fetched match metadata into the board client for player identity fallbacks", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain("matchMetadata");
    expect(source).toMatch(/matchMetadata=\{match\?\.players \?\? \[\]\}/);
  });
});
