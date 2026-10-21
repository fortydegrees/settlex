import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("game-server matchmaking credentials", () => {
  it("uses the validated requested credential generator for lobby joins", () => {
    const source = readFileSync(resolve(process.cwd(), "server/server.js"), "utf8");

    expect(source).toContain("generateMatchPlayerCredentials");
    expect(source).toMatch(
      /Server\(\{[\s\S]*generateCredentials:\s*\(context\)\s*=>[\s\S]*generateMatchPlayerCredentials/
    );
  });
});
