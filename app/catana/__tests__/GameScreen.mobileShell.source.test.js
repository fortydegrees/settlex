import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gameScreenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen mobile shell source", () => {
  it("switches the local action HUD to the mobile cockpit on phone widths", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("MobilePlayerCockpit");
    expect(source).toContain("isPhoneLayout");
    expect(source).toContain("catana-game-screen");
    expect(source).toContain("width > 0 && width < 640");
    expect(source).toContain("const boardLayoutReservedHeight = isPhoneLayout ? 0 : undefined");
    expect(source).toContain("isPhoneLayout ? (");
  });

  it("coordinates mobile log/chat bottom-sheet state between the cockpit and meta rail", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("mobileMetaPanel");
    expect(source).toContain("setMobileMetaPanel");
    expect(source).toContain("mobileActivePanel={mobileMetaPanel}");
    expect(source).toContain("onMobileActivePanelChange={setMobileMetaPanel}");
    expect(source).toContain("activeMobileMetaPanel={mobileMetaPanel}");
    expect(source).toContain("onMobileMetaPanelOpen={setMobileMetaPanel}");
    expect(source).toContain('pointerEvents: mobileMetaPanel ? "auto" : undefined');
  });

  it("uses compact mobile top chrome around the opponent strip", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("MobileMatchMenu");
    expect(source).not.toContain("showMobileTopTurnContext");
    expect(source).not.toContain("<MobileTurnContextStrip");
    expect(source).toContain("hidden sm:flex");
    expect(source).toContain("fixed right-3 top-3 z-40 sm:hidden");
    expect(source).toContain("canResign={!isReplay && !isGameOver && !!player}");
    expect(source).toContain("onResign={handleResign}");
    expect(source).toContain("top-11 z-30 flex flex-col items-center gap-2 px-14");
    expect(source).toContain("compact={isPhoneLayout}");
  });

  it("scopes native mobile tap-highlight suppression to the game screen", () => {
    const globalsPath = path.resolve(__dirname, "..", "..", "globals.css");
    const source = fs.readFileSync(gameScreenPath, "utf8");
    const globals = fs.readFileSync(globalsPath, "utf8");

    expect(source).toContain("catana-game-screen");
    expect(globals).toContain(".catana-game-screen button");
    expect(globals).toContain("-webkit-tap-highlight-color: transparent");
  });
});
