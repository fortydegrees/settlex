import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readAppFile = (...parts) =>
  fs.readFileSync(path.resolve(__dirname, "..", ...parts), "utf8");

describe("Home demo board source", () => {
  it("has a committed piece layer for demo-owned final state", () => {
    const source = readAppFile("homeDemo", "HomeDemoPieceLayer.js");
    expect(source).toContain("export function HomeDemoPieceLayer");
    expect(source).toContain("roadsByEdgeId");
    expect(source).toContain("buildingsByNodeId");
    expect(source).toContain("<Edge");
    expect(source).toContain("<Node");
  });

  it("renders a board-only home demo surface without game moves", () => {
    const source = readAppFile("homeDemo", "HomeDemoBoard.js");
    expect(source).toContain("export function HomeDemoBoard");
    expect(source).toContain("<BoardUnderlay");
    expect(source).toContain("<BoardPortChannels");
    expect(source).toContain("<Tile");
    expect(source).toContain("<Port");
    expect(source).toContain("<HomeDemoPieceLayer");
    expect(source).not.toContain("moves.");
    expect(source).not.toContain("EffectsBoardWrapper");
  });

  it("hides fallback-sized board geometry until the real viewport is measured", () => {
    const homeSource = readAppFile("homeDemo", "HomeDemoBoard.js");
    const boardSource = readAppFile("Board.js");

    expect(homeSource).toContain("isMeasured");
    expect(homeSource).toContain("useBrowserLayoutEffect");
    expect(homeSource).toContain('visibility: isMeasured ? "visible" : "hidden"');
    expect(boardSource).toContain("isMeasured");
    expect(boardSource).toContain('visibility: isMeasured ? "visible" : "hidden"');
  });

  it("renders a static homepage board poster while the measured board hydrates", () => {
    const homeTableSource = readAppFile("home", "HomeTableClient.js");
    const posterSource = readAppFile("homeDemo", "HomeDemoBoardPoster.js");

    expect(homeTableSource).toContain("HomeDemoBoardPoster");
    expect(homeTableSource).toContain("isBoardMeasured");
    expect(homeTableSource).toContain("onBoardMeasuredChange");
    expect(homeTableSource).toContain("hidden={isBoardMeasured}");
    expect(posterSource).toContain("export function HomeDemoBoardPoster");
    expect(posterSource).toContain("HOME_DEMO_BOARD_PRESET");
    expect(posterSource).toContain("board_underlay_standard.svg");
    expect(posterSource).not.toContain("bgio-effects");
    expect(posterSource).not.toContain("useWindowSize");
  });

  it("keeps the static homepage board poster visually aligned with live board details", () => {
    const posterSource = readAppFile("homeDemo", "HomeDemoBoardPoster.js");
    const posterCssSource = readAppFile("homeDemo", "HomeDemoBoardPoster.module.css");

    expect(posterSource).toContain("getNodeDelta");
    expect(posterSource).toContain("getPosterConnectorBarStyle");
    expect(posterSource).toContain("CONNECTOR_MIN_THICKNESS");
    expect(posterSource).toContain("PosterPortChannels");
    expect(posterCssSource).toContain(".portConnector");
    expect(posterCssSource).toContain("width: calc(var(--home-poster-size) / 1.75)");
    expect(posterCssSource).toContain("height: calc(var(--home-poster-size) / 1.75)");
    expect(posterCssSource).toContain("margin-top: calc(var(--home-poster-size) / 1.66)");
    expect(posterCssSource).toContain("border-radius: 0.125rem");
    expect(posterCssSource).toContain("@media (min-width: 760px) and (min-height: 818px)");
    expect(posterCssSource).toContain("border-radius: 0.375rem");
    expect(posterCssSource).toContain("margin-top: calc(var(--home-poster-size) * 0.25)");
    expect(posterCssSource).toContain("font-size: calc(var(--home-poster-size) * 0.4)");
    expect(posterCssSource).toContain("font-size: calc(var(--home-poster-size) * 0.18)");
    expect(posterCssSource).toContain("drop-shadow(0 4px 3px");
    expect(posterCssSource).toContain("font-weight: 700");
    expect(posterCssSource).toContain("transform: translate(-110%, -50%)");
    expect(posterSource).toContain("robberShadow");
    expect(posterCssSource).toContain(".robberShadow");
    expect(posterCssSource).toContain("left: 62%");
    expect(posterCssSource).toContain("top: 68%");
    expect(posterCssSource).toContain("width: 82%");
    expect(posterCssSource).toContain("height: 30%");
    expect(posterCssSource).toContain("filter: blur(4px)");
  });

  it("bridges homepage demo events through the existing placement effect stack", () => {
    const source = readAppFile("homeDemo", "HomeDemoEffectBridge.js");
    expect(source).toContain("export function HomeDemoEffectBridge");
    expect(source).toContain("createPiecePlacementRunner");
    expect(source).toContain("GameEffects");
    expect(source).toContain("build:place");
    expect(source).toContain("applyHomeDemoEvent");
    expect(source).toContain("audioSettings={audioSettings}");
  });

  it("scopes slower homepage placement tuning to scene-start drops only", () => {
    const source = readAppFile("homeDemo", "HomeDemoEffectBridge.js");

    expect(source).toContain("function getHomeDemoPlacementTuning(event)");
    expect(source).toContain("event?.setupPhase");
    expect(source).not.toContain('scene?.id === "opening-table"');
    expect(source).toContain("function getPayloadForEvent(event)");
    expect(source).toContain("const tuning = getHomeDemoPlacementTuning(event);");
    expect(source).toContain("...(tuning ? { tuning } : {})");
    expect(source).toContain("getHomeDemoPlacementDurationMs(event)");
    expect(source).toContain("getHomeDemoPlacementStartFrom(event)");
    expect(source).toContain("...(startFrom ? { startFrom } : {})");
  });

  it("animates scene setup pieces before each scene's normal events", () => {
    const source = readAppFile("homeDemo", "HomeDemoEffectBridge.js");

    expect(source).toContain("getHomeDemoSceneSetupEvents");
    expect(source).toContain("onPieceStateChange(createHomeDemoPieceState())");
    expect(source).toContain("const setupEvents = getHomeDemoSceneSetupEvents(scene);");
    expect(source).toContain("const setupDurationMs = getHomeDemoSetupDurationMs");
    expect(source).toContain("setupEvents.forEach((event) =>");
    expect(source).toContain("setupDurationMs + event.atMs");
    expect(source).not.toContain(
      "onPieceStateChange(createHomeDemoPieceState(scene.initialPieces));"
    );
  });

  it("wires the home table client to the demo board without sandbox game state", () => {
    const source = readAppFile("home", "HomeTableClient.js");
    expect(source).toContain("HomeDemoBoard");
    expect(source).toContain("HomeDemoEffectBridge");
    expect(source).toContain("HOME_DEMO_AUDIO_SETTINGS");
    expect(source).toContain("muted: true");
    expect(source).not.toContain("boardgame.io/react");
    expect(source).not.toContain("EffectsBoardWrapper");
    expect(source).not.toContain("createSandboxGame");
    expect(source).not.toContain("new_dev_game.json");
  });

  it("promotes the home table client to the root homepage with real lobby entrypoints", () => {
    const rootSource = readAppFile("..", "page.js");
    const source = readAppFile("home", "HomeTableClient.js");

    expect(rootSource).toContain('import { headers } from "next/headers";');
    expect(rootSource).toContain("getSessionAccount");
    expect(rootSource).toContain("getInitialHomeAccount");
    expect(rootSource).toContain(
      'import { HomeTableClient } from "./catana/home/HomeTableClient";'
    );
    expect(rootSource).toContain("<HomeTableClient initialAccount={initialAccount} />");
    expect(source).toContain("initialAccount");
    expect(source).toContain("useLobbyHomeActions({ initialAccount })");
    expect(source).toContain("useLobbyHomeActions");
    expect(source).toContain("isBoardLayoutReady");
    expect(source).toContain("useBrowserLayoutEffect");
    expect(source).toContain("AccountEntryModal");
    expect(source).toContain("IdentityModal");
    expect(source).toContain("FriendChallengeModal");
    expect(source).not.toContain("Prototype state only");
  });

  it("keeps logged-out account chrome as a sign-in trigger instead of an auth menu or avatar", () => {
    const source = readAppFile("home", "HomeTableClient.js");

    expect(source).toContain("if (!hasIdentity)");
    expect(source).toContain('aria-label="Sign in"');
    expect(source).toContain("onOpenSignIn");
    expect(source).toContain("Sign in");
    expect(source).not.toContain('triggerAriaLabel="Open sign in menu"');
    expect(source).not.toContain("Continue with Email");
    expect(source).not.toContain("Continue as guest");
    expect(source).not.toContain("Set player profile");
    expect(source).not.toContain("Choose username");
  });

  it("renders the shared account entry modal for auth and play username entry", () => {
    const source = readAppFile("home", "HomeTableClient.js");

    expect(source).toContain('import { AccountEntryModal } from "../lobby/AccountEntryModal";');
    expect(source).toContain("<AccountEntryModal");
    expect(source).toContain("mode={lobby.entryModal.mode}");
    expect(source).toContain("intent={lobby.entryModal.intent}");
    expect(source).toContain("onSwitchToAuth={lobby.actions.switchEntryToAuth}");
    expect(source).toContain("onPlayUsernameSubmit={lobby.overlays.handlePlayUsernameSubmit}");
    expect(source).toContain("onEmailSignIn={lobby.overlays.handleAuthEmailSignIn}");
    expect(source).toContain("onEmailSignUp={lobby.overlays.handleAuthEmailSignUp}");
    expect(source).toContain("onContinueAsGuest={lobby.actions.continueAsGuest}");
  });

  it("loads auth options so unavailable social providers are not shown locally", () => {
    const source = readAppFile("lobby", "useLobbyHomeActions.js");

    expect(source).toContain("initialAccount");
    expect(source).toContain("getAccountIdentity");
    expect(source).toContain("applyAccountIdentity(initialAccount)");
    expect(source).toContain('route: "/api/auth/options"');
    expect(source).toContain("setAuthOptions");
    expect(source).toContain("socialProviders");
  });

  it("keeps signed-in account chrome content-sized with a standard account menu", () => {
    const source = readAppFile("home", "HomeTableClient.js");

    expect(source).toContain("Signed in as");
    expect(source).toContain("ChevronDownIcon");
    expect(source).toContain("Sign out");
    expect(source).toContain("onSignOut");
    expect(source).toContain("actions.signOut");
    expect(source).not.toContain("sm:min-w-[9.8rem]");
    expect(source).not.toContain("rounded-[0.86rem] bg-gradient-to-br");
  });

  it("signs out homepage identity through the server session before clearing local state", () => {
    const source = readAppFile("lobby", "useLobbyHomeActions.js");

    expect(source).toContain('route: "/api/account/logout"');
    expect(source).toContain("writeStoredPlayerIdentity(window.localStorage, {})");
    expect(source).toContain("clearPendingFriendChallenge(window.localStorage)");
    expect(source).toContain("clearLastActiveMatch(window.localStorage)");
  });

  it("renders homepage errors through the shared status overlay layer", () => {
    const source = readAppFile("home", "HomeTableClient.js");

    expect(source).toContain('import { StatusBanner } from "../components/StatusBanner";');
    expect(source).toContain("<StatusBanner");
    expect(source).toContain("overlay");
    expect(source).toContain('overlayClassName="top-[5.25rem] sm:top-[6.25rem]"');
    expect(source).not.toContain("absolute inset-x-3 top-[5.25rem] z-50");
  });
});
