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

  it("prefills the identity modal with a generated username and submits its source", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/IdentityModal.js"),
      "utf8"
    );

    expect(source).toContain("initialName || suggestedIdentity.name");
    expect(source).toContain("usernameSource");
    expect(source).toContain("name.trim() === suggestedIdentity.name");
    expect(source).toContain('"generated"');
    expect(source).toContain('"custom"');
  });

  it("exposes an account entry modal contract for homepage auth and play username entry", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/useLobbyHomeActions.js"),
      "utf8"
    );

    expect(source).toContain("entryModal");
    expect(source).toContain("openSignIn");
    expect(source).toContain("switchEntryToAuth");
    expect(source).toContain("openPlayUsername");
    expect(source).toContain("openSaveProfile");
    expect(source).toContain("closeEntryModal");
    expect(source).toContain("handlePlayUsernameSubmit");
    expect(source).toContain("handleAuthEmailSignIn");
    expect(source).toContain("handleAuthEmailSignUp");
    expect(source).toContain("continueAsGuest");
  });

  it("builds account entry from existing Settlex primitives with username-first play copy", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/AccountEntryModal.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Dialog"');
    expect(source).toContain('from "../../ui/Button"');
    expect(source).toContain('from "../../ui/Input"');
    expect(source).toContain('from "../../ui/Popover"');
    expect(source).toContain('from "../../ui/SwatchPicker"');
    expect(source).toContain("Choose a username to play online");
    expect(source).toContain("This creates a guest profile on this browser.");
    expect(source).toContain("Play online as");
    expect(source).toContain("Sign in instead");
    expect(source).toContain("onAvatarPreviewClick");
    expect(source).not.toContain("shadcn");
  });

  it("routes online and friend play through username-first entry while preserving silent bot play", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/useLobbyHomeActions.js"),
      "utf8"
    );

    expect(source).toContain('intent: "online"');
    expect(source).toContain('intent: "friend"');
    expect(source).toContain("requirePlayIdentity");
    expect(source).toContain("playOnline: () => requirePlayIdentity");
    expect(source).toContain("playFriend: () => requirePlayIdentity");
    expect(source).toContain("playBot: playAgainstBot");
    expect(source).toContain("ensureGeneratedGuestAccount");
  });

  it("lets bot play create a generated guest account without opening the identity modal", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("ensureGeneratedGuestAccount");
    expect(source).toContain('usernameSource: "generated"');
    expect(source).toContain("onClick={playAgainstBot}");
    expect(source).not.toContain("onClick={() => requireIdentity(playAgainstBot)}");
  });

  it("keeps friend challenges behind the explicit identity gate", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );
    const friendActionBlock =
      source.match(
        /const createFriendChallenge = async \(\) => \{[\s\S]*?const playAgainstBot = async/
      )?.[0] ?? "";

    expect(source).toContain("onClick={() => requireIdentity(createFriendChallenge)}");
    expect(friendActionBlock).toContain("ensureAccountSession");
    expect(friendActionBlock).not.toContain("ensureGeneratedGuestAccount");
  });
});
