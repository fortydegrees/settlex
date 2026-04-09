import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ChallengePageClient source", () => {
  it("uses the app-owned challenge and account routes", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/challenge/[matchID]/ChallengePageClient.js"),
      "utf8"
    );

    expect(source).toContain('route: "/api/account/me"');
    expect(source).toContain('route: `/api/challenges/${matchID}`');
    expect(source).toContain('route: `/api/challenges/${matchID}/accept`');
    expect(source).toContain('route: "/api/account/guest"');
    expect(source).toContain("IdentityModal");
  });
});
