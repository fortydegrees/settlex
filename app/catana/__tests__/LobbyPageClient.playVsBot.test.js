import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("LobbyPageClient play-vs-bot entrypoint", () => {
  it("exposes a Play Against Bot button backed by atomic server setup", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("Play Against Bot");
    expect(source).toContain("const playAgainstBot = async");
    expect(source).toContain('modeId: "duel"');
    expect(source).toContain('opponentType: "bot"');

    const botFlow = source.slice(
      source.indexOf("const playAgainstBot = async"),
      source.indexOf("const cancelChallengeInvite")
    );
    expect(botFlow).not.toContain('route: "/api/matches/join"');
  });

  it("normalizes stored player colors while bot identity stays server-owned", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("normalizePlayerColorId");
    expect(source).not.toContain("BOT_NAME_PREFIX");
  });
});
