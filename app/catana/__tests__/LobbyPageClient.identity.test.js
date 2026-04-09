import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  PLAYER_COLOR_OPTIONS,
  PLAYER_COLOR_PICKER_OPTIONS
} from "../theme/playerColors";

describe("LobbyPageClient identity modal", () => {
  it("allows the expanded player-color swatch set to wrap", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/IdentityModal.js"),
      "utf8"
    );

    expect(source).toContain("flex flex-wrap justify-center gap-2");
  });

  it("renders swatches from the picker-specific color order without olive", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/IdentityModal.js"),
      "utf8"
    );

    expect(source).toContain("PLAYER_COLOR_PICKER_OPTIONS.map((c) => (");
    expect(PLAYER_COLOR_OPTIONS.map((entry) => entry.id)).not.toContain("olive");
    expect(PLAYER_COLOR_PICKER_OPTIONS.map((entry) => entry.id)).not.toContain("olive");
  });

  it("uses the shared storage helpers in the lobby client", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("readStoredPlayerIdentity(window.localStorage)");
    expect(source).toContain("writeStoredPlayerIdentity(window.localStorage");
  });
});
