import { describe, it, expect } from "vitest";
import {
  CATANA_THEMES,
  DEFAULT_THEME_ID,
  getThemeAssetBase,
  getThemedSvgPath,
  getClassicSvgPath,
  getBoardUnderlayPath,
  getBackgroundImageWithFallback,
  getResourceIconPath,
  isRasterAssetPath,
  resolveThemeId,
} from "../theme/themes";

describe("Catana theme assets", () => {
  it("exposes classic, palette-b, and emoji themes", () => {
    expect(CATANA_THEMES.classic.assetBase).toBe("/svgs");
    expect(CATANA_THEMES["palette-b"].id).toBe("palette-b");
    expect(CATANA_THEMES.emoji.id).toBe("emoji");
    expect(DEFAULT_THEME_ID).toBe("classic");
  });

  it("resolves unknown theme ids to default", () => {
    expect(resolveThemeId("palette-b")).toBe("palette-b");
    expect(resolveThemeId("unknown")).toBe("classic");
  });

  it("builds themed and classic svg paths", () => {
    expect(getThemeAssetBase("palette-b")).toBe("/svgs");
    expect(getThemedSvgPath("palette-b", "tile_ore.svg")).toBe(
      "/svgs/palette-themes/option-b/tile_ore.svg"
    );
    expect(getThemedSvgPath("palette-b", "icon_ore.svg")).toBe(
      "/svgs/palette-themes/option-b/icon_ore.svg"
    );
    expect(getThemedSvgPath("palette-b", "icon_robber.svg")).toBe(
      "/svgs/icon_robber.svg"
    );
    expect(getClassicSvgPath("tile_ore.svg")).toBe("/svgs/tile_ore.svg");
  });

  it("supports emoji theme tile and icon overrides", () => {
    expect(getThemeAssetBase("emoji")).toBe("/svgs");
    expect(getThemedSvgPath("emoji", "tile_ore.svg")).toBe(
      "/svgs/palette-themes/emoji/tile_ore.svg"
    );
    expect(getThemedSvgPath("emoji", "tile_desert.svg")).toBe(
      "/svgs/palette-themes/emoji/tile_desert.svg"
    );
    expect(getThemedSvgPath("emoji", "icon_ore.svg")).toBe(
      "/svgs/palette-themes/emoji/icon_ore.svg"
    );
    expect(getThemedSvgPath("emoji", "icon_robber.svg")).toBe(
      "/svgs/icon_robber.svg"
    );
    expect(getThemedSvgPath("emoji", "settlement_red.svg")).toBe(
      "/test_designs/settlement_red.png"
    );
    expect(getThemedSvgPath("emoji", "settlement_green.svg")).toBe(
      "/test_designs/settlement_red.png"
    );
  });

  it("resolves the generated board underlay asset for all current themes", () => {
    expect(getBoardUnderlayPath("classic")).toBe("/svgs/board_underlay_standard.svg");
    expect(getBoardUnderlayPath("palette-b")).toBe("/svgs/board_underlay_standard.svg");
    expect(getBoardUnderlayPath("emoji")).toBe("/svgs/board_underlay_standard.svg");
  });

  it("uses a desert icon overlay only for emoji theme", () => {
    expect(getResourceIconPath("emoji", "Desert")).toBe(
      "/svgs/palette-themes/emoji/icon_desert.svg"
    );
    expect(getResourceIconPath("classic", "Desert")).toBeNull();
  });

  it("builds CSS background fallback with themed first and classic second", () => {
    expect(getBackgroundImageWithFallback("palette-b", "tile_ore.svg")).toBe(
      "url('/svgs/palette-themes/option-b/tile_ore.svg'), url('/svgs/tile_ore.svg')"
    );
    expect(getBackgroundImageWithFallback("classic", "tile_ore.svg")).toBe(
      "url('/svgs/tile_ore.svg')"
    );
    expect(getBackgroundImageWithFallback("emoji", "tile_ore.svg")).toBe(
      "url('/svgs/palette-themes/emoji/tile_ore.svg')"
    );
  });

  it("detects raster asset paths for temporary png prototypes", () => {
    expect(isRasterAssetPath("/test_designs/settlement_red.png")).toBe(true);
    expect(isRasterAssetPath("/svgs/settlement_red.svg")).toBe(false);
  });
});
