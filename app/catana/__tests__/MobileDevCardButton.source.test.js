import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getMobileDevCardButtonState } from "../components/devCardDisplayUtils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "MobileDevCardButton.js"
);

describe("MobileDevCardButton source", () => {
  it("renders no visible control for zero dev cards unless a reveal anchor is forced", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("totalCount === 0 && !forceMount");
    expect(source).toContain("data-mobile-devcard-reveal-anchor");
    expect(source).toContain("opacity-0");
  });

  it("exposes the player dev-card destination id and suppresses mobile long-press context menus", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("`p${playerId}-devcards`");
    expect(source).toContain("onContextMenu={(event) => event.preventDefault()}");
    expect(source).toContain("data-mobile-devcard-button");
  });

  it("keeps the visible affordance as cards instead of a framed count badge control", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("const showStack = totalCount > 1");
    expect(source).toContain("src={DEV_CARD_BACK_SVG}");
    expect(source).not.toContain("bg-lime-400");
    expect(source).not.toContain("{totalCount}</span>");
  });

  it("turns into a collapse handle while the expanded tray is open", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("data-mobile-devcard-collapse-handle");
    expect(source).toContain("!isOpen ? (");
    expect(source).toContain('aria-expanded={isOpen}');
  });
});

describe("getMobileDevCardButtonState", () => {
  it("counts total cards and playable cards separately", () => {
    expect(
      getMobileDevCardButtonState({
        cards: ["victoryPoint", "knight", "knight"],
        playableCountsByType: { knight: 1 },
      })
    ).toMatchObject({
      totalCount: 3,
      playableCount: 1,
      hasPlayableCards: true,
      previewType: "knight",
    });
  });

  it("falls back to a nonplayable preview when no cards can be played", () => {
    expect(
      getMobileDevCardButtonState({
        cards: ["victoryPoint"],
        playableCountsByType: {},
      })
    ).toMatchObject({
      totalCount: 1,
      playableCount: 0,
      hasPlayableCards: false,
      previewType: "victoryPoint",
    });
  });
});
