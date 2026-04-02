import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("reconnect banner persistence wiring", () => {
  it("writes the last active match from lobby join flows", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("writeLastActiveMatch");
  });

  it("writes the last active match when resuming a seated match page", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain("writeLastActiveMatch");
  });

  it("clears the saved match from GameScreen when the match ends", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/GameScreen.js"),
      "utf8"
    );

    expect(source).toContain("clearLastActiveMatch");
  });
});
