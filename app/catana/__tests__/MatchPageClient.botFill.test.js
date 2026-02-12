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
    expect(source).toContain('bot: "puffer"');
    expect(source).toContain("fillOpenSeatsWithBots");
  });
});
