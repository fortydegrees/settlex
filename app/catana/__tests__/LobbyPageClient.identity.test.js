import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("LobbyPageClient identity modal", () => {
  it("allows the expanded player-color swatch set to wrap", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("flex flex-wrap justify-center gap-2");
  });

  it("renders swatches from the picker-specific color order", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("PLAYER_COLOR_PICKER_OPTIONS.map((c) => (");
  });
});
