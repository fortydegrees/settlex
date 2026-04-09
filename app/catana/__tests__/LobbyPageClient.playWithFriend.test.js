import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("LobbyPageClient play-with-friend flow", () => {
  it("adds the friend challenge button and app-owned challenge routes", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("Play a Friend");
    expect(source).toContain('route: "/api/challenges/create"');
    expect(source).toContain('route: "/api/matches/open"');
    expect(source).toContain('route: `/api/challenges/${challengeState.matchID}/cancel`');
  });

  it("renders the waiting modal copy and cancel affordances", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/FriendChallengeModal.js"),
      "utf8"
    );

    expect(source).toContain("Waiting for friend to join");
    expect(source).toContain("Close & cancel invite");
  });
});
