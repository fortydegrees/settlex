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
    expect(source).toContain('bot: "puffer"');
    expect(source).toContain('emoji: "🤖"');
    expect(source).toContain("const playAgainstBot = async");
  });
});
