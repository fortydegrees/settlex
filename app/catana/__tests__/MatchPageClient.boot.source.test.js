import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("MatchPageClient live boot path", () => {
  it("hydrates live matches from server-provided credentials and match metadata", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain("initialCredentials");
    expect(source).toContain("initialLiveMatch");
    expect(source).toContain("useState(initialCredentials ?? null)");
    expect(source).toContain("normalizeMatch(initialLiveMatch)");
  });

  it("uses a board-shaped loading shell instead of the default text-only bgio placeholder", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain("LiveMatchLoadingShell");
    expect(source).toContain("loading: LiveMatchLoadingShell");
  });

  it("can enter a no-credential spectator client when all seats are already taken", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain("const isFullMatch");
    expect(source).toContain("const isSpectating");
    expect(source).toContain("setSpectatorMode(true)");
    expect(source).toContain("playerID={null}");
    expect(source).toContain("Spectate");
  });

  it("recovers an interrupted credentialed duel before mounting the game client", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );
    const recoveryIndex = source.indexOf("if (interruptedDuel)");
    const gameIndex = source.indexOf("if (credentials && playerID)");

    expect(source).toContain("isInterruptedCredentialedDuel");
    expect(source).toContain("Duel interrupted");
    expect(source).toContain("Return to lobby");
    expect(source).toContain("Look again");
    expect(source).toContain('intent: "matchmaking_cancel"');
    expect(source).toContain('error?.code === "MATCH_FOUND"');
    expect(recoveryIndex).toBeGreaterThan(-1);
    expect(recoveryIndex).toBeLessThan(gameIndex);
  });

  it("never retargets stored credentials to a newly open opponent seat", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );
    const seatSelection = source.slice(
      source.indexOf("useEffect(() => {", source.indexOf("const interruptedDuel")),
      source.indexOf("const joinSeat")
    );

    expect(seatSelection).toContain("if (credentials) return");
    expect(seatSelection).toContain("[credentials, playerID, openSeats, spectatorMode]");
  });
});
