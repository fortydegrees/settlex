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
      /const startedAt = Date\.now\(\);[\s\S]*?setSearchState\(\{\s+matchID: null,\s+playerID: null,\s+startedAt,\s+phase: "searching",\s+\}\);[\s\S]*?route: "\/api\/matches\/open"/
    );
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
