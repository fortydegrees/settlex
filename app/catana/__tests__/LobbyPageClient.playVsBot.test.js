import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("LobbyPageClient play-vs-bot entrypoint", () => {
  it("exposes a Play Against Bot button and bot seat join payload", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("Play Against Bot");
    expect(source).toContain('route: "/api/matches/join"');
    expect(source).toContain('participantType: "bot"');
    expect(source).toContain('botKey: "puffer"');
    expect(source).toContain('avatarEmoji: "🤖"');
    expect(source).toContain("const playAgainstBot = async");
  });

  it("normalizes stored colors and uses canonical ids for bot seats", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("normalizePlayerColorId");
    expect(source).toContain('avatarColor: "sky"');
  });
});
