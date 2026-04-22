import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  PLAYER_COLOR_OPTIONS,
  PLAYER_COLOR_PICKER_OPTIONS
} from "../theme/playerColors";

describe("LobbyPageClient identity modal", () => {
  it("routes the identity modal through the shared standard-ui layer while keeping the swatch row wrapped", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/IdentityModal.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Dialog"');
    expect(source).toContain('from "../../ui/Input"');
    expect(source).toContain('from "../../ui/Button"');
    expect(source).toContain('from "../../ui/IconButton"');
    expect(source).toContain('from "../../ui/SwatchPicker"');
    expect(source).toContain('from "../../ui/Popover"');
    expect(source).toContain("options={PLAYER_COLOR_PICKER_OPTIONS}");
    expect(source).not.toContain('document.addEventListener("mousedown"');
  });

  it("preserves the picker-specific color order without olive", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/IdentityModal.js"),
      "utf8"
    );

    expect(source).toContain("PLAYER_COLOR_PICKER_OPTIONS");
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
