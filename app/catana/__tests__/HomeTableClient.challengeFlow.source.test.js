import fs from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (filePath) =>
  fs.readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("home table challenge and busy feedback", () => {
  it("routes created friend challenges to the canonical game URL", () => {
    const source = read("app/catana/lobby/useLobbyHomeActions.js");

    expect(source).toContain("activeActionId");
    expect(source).toContain('setActiveActionId("friend")');
    expect(source).toContain("router.push(`/g/${created.matchID}`)");
    expect(source).not.toContain("setChallengeState({");
  });

  it("shows inline bot startup feedback instead of a separate loading modal", () => {
    const source = read("app/catana/home/HomeTableClient.js");

    expect(source).toContain("activeActionId");
    expect(source).toContain("isActive");
    expect(source).toContain("animate-spin");
    expect(source).toContain("Starting...");
  });

  it("keeps the matchmaking cancel action visible while searching", () => {
    const source = read("app/catana/home/HomeTableClient.js");

    expect(source).toContain(
      "disabled={isMatchFound || isPufferTransitionPending}"
    );
    expect(source).toContain('{isMatchFound ? "Loading board..." : "Cancel"}');
    expect(source).not.toContain("{canCancel ? (");
  });
});
