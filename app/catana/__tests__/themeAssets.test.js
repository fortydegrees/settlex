import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  CATANA_THEMES,
  DEFAULT_THEME_ID,
  getThemeAssetBase,
  getThemedSvgPath,
  getClassicSvgPath,
  getBoardUnderlayPath,
  getBackgroundImageWithFallback,
  getPortIconPath,
  getResourceIconPath,
  resolveThemeId,
} from "../theme/themes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicSvgDir = path.resolve(__dirname, "..", "..", "..", "public", "svgs");
const PIECE_TYPES = ["road", "settlement", "city"];
const PIECE_COLORS = [
  "red",
  "sky",
  "green",
  "teal",
  "orange",
  "magenta",
  "purple",
  "maroon",
  "olive",
  "brown",
  "royal",
  "violet",
  "lime",
  "coral",
  "lavender",
  "tan",
  "black",
  "white",
  "silver",
  "gold",
];

describe("Catana theme assets", () => {
  it("exposes classic, palette-b, and emoji themes", () => {
    expect(CATANA_THEMES.classic.assetBase).toBe("/svgs");
    expect(CATANA_THEMES["palette-b"].id).toBe("palette-b");
    expect(CATANA_THEMES.emoji.id).toBe("emoji");
    expect(DEFAULT_THEME_ID).toBe("emoji");
  });

  it("resolves unknown theme ids to default", () => {
    expect(resolveThemeId("palette-b")).toBe("palette-b");
    expect(resolveThemeId("unknown")).toBe("emoji");
  });

  it("builds themed svg paths and keeps classic compatibility redirects for retired base assets", () => {
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
    expect(getClassicSvgPath("tile_ore.svg")).toBe(
      "/svgs/palette-themes/emoji/tile_ore.svg"
    );
    expect(getClassicSvgPath("icon_ore.svg")).toBe(
      "/svgs/palette-themes/emoji/icon_ore.svg"
    );
    expect(getClassicSvgPath("icon_robber.svg")).toBe("/svgs/icon_robber.svg");
  });

  it("supports emoji theme tile and icon overrides without special-casing piece svg paths", () => {
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
    expect(getThemedSvgPath("emoji", "pieces/settlement_red.svg")).toBe(
      "/svgs/pieces/settlement_red.svg"
    );
    expect(getThemedSvgPath("emoji", "pieces/settlement_green.svg")).toBe(
      "/svgs/pieces/settlement_green.svg"
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

  it("resolves dedicated port icon assets separately from tile resource icons", () => {
    expect(getPortIconPath("emoji", "Ore")).toBe(
      "/svgs/palette-themes/emoji/port_icon_ore.svg"
    );
    expect(getPortIconPath("emoji", "Any")).toBe(
      "/svgs/palette-themes/emoji/port_icon_any.svg"
    );
    expect(getPortIconPath("classic", "Ore")).toBe(
      "/svgs/palette-themes/emoji/icon_ore.svg"
    );
  });

  it("builds CSS background fallback with themed first and compatibility second", () => {
    expect(getBackgroundImageWithFallback("palette-b", "tile_ore.svg")).toBe(
      "url('/svgs/palette-themes/option-b/tile_ore.svg'), url('/svgs/palette-themes/emoji/tile_ore.svg')"
    );
    expect(getBackgroundImageWithFallback("classic", "tile_ore.svg")).toBe(
      "url('/svgs/palette-themes/emoji/tile_ore.svg')"
    );
    expect(getBackgroundImageWithFallback("emoji", "tile_ore.svg")).toBe(
      "url('/svgs/palette-themes/emoji/tile_ore.svg')"
    );
  });

  it("keeps the compatibility asset targets on disk", () => {
    [
      "board_underlay_standard.svg",
      "tile_empty.svg",
      "port_icon_any.svg",
      "palette-themes/emoji/tile_desert.svg",
      "palette-themes/emoji/tile_ore.svg",
      "palette-themes/emoji/tile_grain.svg",
      "palette-themes/emoji/tile_wool.svg",
      "palette-themes/emoji/tile_lumber.svg",
      "palette-themes/emoji/tile_brick.svg",
      "palette-themes/emoji/icon_brick.svg",
      "palette-themes/emoji/icon_wood.svg",
      "palette-themes/emoji/icon_sheep.svg",
      "palette-themes/emoji/icon_wheat.svg",
      "palette-themes/emoji/icon_ore.svg",
    ].forEach((fileName) => {
      expect(fs.existsSync(path.join(publicSvgDir, fileName)), fileName).toBe(true);
    });
  });

  it("keeps every local player piece asset under the nested pieces directory", () => {
    PIECE_TYPES.flatMap((pieceType) =>
      PIECE_COLORS.map((colorId) => `pieces/${pieceType}_${colorId}.svg`)
    ).forEach((fileName) => {
      expect(fs.existsSync(path.join(publicSvgDir, fileName)), fileName).toBe(true);
    });
  });
});
