import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PLAYER_COLOR_OPTIONS } from "../theme/playerColors";

describe("LobbyPageClient identity modal", () => {
  it("allows the expanded player-color swatch set to wrap", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("flex flex-wrap justify-center gap-2");
  });

  it("does not offer olive in the username swatch source", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("PLAYER_COLOR_OPTIONS.map((c) => (");
    expect(PLAYER_COLOR_OPTIONS.map((entry) => entry.id)).not.toContain("olive");
  });
});
