import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("LobbyPageClient matchmaking feedback", () => {
  it("shows matchmaking feedback immediately when Play is pressed", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toMatch(
      /const startedAt = Date\.now\(\);[\s\S]*?setSearchState\(\{\s+matchID: null,\s+playerID: null,\s+startedAt,\s+phase: "searching",\s+\}\);[\s\S]*?route: "\/api\/matches\/open\?modeId=duel"/
    );
  });

  it("filters only the Play queue by duel mode", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );
    const refreshSource = source.slice(
      source.indexOf("const refreshMatches = useCallback"),
      source.indexOf("const fetchSavedScenarios")
    );
    const playSource = source.slice(
      source.indexOf("const play = async"),
      source.indexOf("const createFriendChallenge")
    );

    expect(refreshSource).toContain('route: "/api/matches/open"');
    expect(refreshSource).not.toContain("modeId=duel");
    expect(playSource).toContain('route: "/api/matches/open?modeId=duel"');
  });

  it("only enables polling and cancel once the search has a real joined seat", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain(
      "if (!searchState?.matchID || searchState.playerID == null) return;"
    );
    expect(source).toContain("{onCancel && (");
  });

  it("keeps the matchmaking modal mounted while routing into a found match", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).not.toMatch(/setSearchState\(null\);\s*router\.push\(/);
    expect(source).toMatch(
      /setSearchState\(\(current\) =>[\s\S]*phase:\s*"matchFound"[\s\S]*\);\s*router\.push\(/
    );
  });
});
