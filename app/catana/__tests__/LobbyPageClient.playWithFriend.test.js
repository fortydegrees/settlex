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
    expect(source).toContain("modeId=duel");
    expect(source).toContain('route: `/api/challenges/${challengeState.matchID}/cancel`');
    expect(source).toContain("writePendingFriendChallenge");
    expect(source).toContain("restorePendingFriendChallenge");
    expect(source).toContain("clearPendingFriendChallenge");
  });

  it("renders the waiting modal through the shared dialog + field primitives", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/FriendChallengeModal.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Dialog"');
    expect(source).toContain('from "../../ui/Input"');
    expect(source).toContain('from "../../ui/Button"');
    expect(source).toContain("Waiting for friend to join");
    expect(source).toContain("Close & cancel invite");
    expect(source).toContain("Invite Link");
    expect(source).toContain('maxWidthClassName="max-w-lg"');
    expect(source).toContain('aria-label={copied ? "Link copied" : "Copy invite link"}');
    expect(source).toContain("hover:translate-y-0");
    expect(source).toContain('className="inline-flex items-center justify-center"');
    expect(source).not.toContain('from "../../ui/Panel"');
    expect(source).not.toContain("fixed inset-0 z-40");
  });
});
