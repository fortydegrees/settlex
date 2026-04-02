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
      /const startedAt = Date\.now\(\);[\s\S]*?setSearchState\(\{\s+matchID: null,\s+playerID: null,\s+startedAt,\s+\}\);[\s\S]*?const data = await apiRequest/
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
});
