export const DEFAULT_THEME_ID = "classic";
export const CATANA_THEME_STORAGE_KEY = "catana:themeId";

const PALETTE_TILE_FILE_NAMES = Object.freeze([
  "tile_ore.svg",
  "tile_grain.svg",
  "tile_wool.svg",
  "tile_lumber.svg",
  "tile_brick.svg",
]);

const PALETTE_RESOURCE_ICON_FILE_NAMES = Object.freeze([
  "icon_wood.svg",
  "icon_brick.svg",
  "icon_sheep.svg",
  "icon_wheat.svg",
  "icon_ore.svg",
]);

const PLAYER_PIECE_COLOR_IDS = Object.freeze([
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "pink",
  "cyan",
  "amber",
]);

const EMOJI_TEST_SETTLEMENT_PNG = "/test_designs/settlement_red.png";

const createPaletteAssetOverrides = (optionFolder, { includeResourceIcons = false } = {}) =>
  Object.freeze(
    Object.fromEntries(
      [
        ...PALETTE_TILE_FILE_NAMES,
        ...(includeResourceIcons ? PALETTE_RESOURCE_ICON_FILE_NAMES : []),
      ].map((fileName) => [
        fileName,
        `/svgs/palette-themes/${optionFolder}/${fileName}`,
      ])
    )
  );

const createResourceIconAssetOverrides = (optionFolder) =>
  Object.freeze(
    Object.fromEntries(
      PALETTE_RESOURCE_ICON_FILE_NAMES.map((fileName) => [
        fileName,
        `/svgs/palette-themes/${optionFolder}/${fileName}`,
      ])
    )
  );

const createTileAssetOverrides = (optionFolder) =>
  Object.freeze(
    Object.fromEntries(
      PALETTE_TILE_FILE_NAMES.map((fileName) => [
        fileName,
        `/svgs/palette-themes/${optionFolder}/${fileName}`,
      ])
    )
  );

const createSettlementTestAssetOverrides = () =>
  Object.freeze(
    Object.fromEntries(
      PLAYER_PIECE_COLOR_IDS.map((colorId) => [
        `settlement_${colorId}.svg`,
        EMOJI_TEST_SETTLEMENT_PNG,
      ])
    )
  );

export const CATANA_THEMES = Object.freeze({
  classic: {
    id: "classic",
    label: "Classic",
    assetBase: "/svgs",
  },
  "palette-b": {
    id: "palette-b",
    label: "Palette B",
    assetBase: "/svgs",
    assetOverrides: createPaletteAssetOverrides("option-b", {
      includeResourceIcons: true,
    }),
  },
  emoji: {
    id: "emoji",
    label: "Emoji",
    assetBase: "/svgs",
    disableBackgroundFallback: true,
    assetOverrides: Object.freeze({
      ...createTileAssetOverrides("emoji"),
      "tile_desert.svg": "/svgs/palette-themes/emoji/tile_desert.svg",
      ...createResourceIconAssetOverrides("emoji"),
      // Temporary design-test override so all settlement colors render from one PNG mockup.
      ...createSettlementTestAssetOverrides(),
    }),
  },
});

export const RESOURCE_ICON_FILES_BY_RESOURCE = Object.freeze({
  Wood: "icon_wood.svg",
  Brick: "icon_brick.svg",
  Sheep: "icon_sheep.svg",
  Wheat: "icon_wheat.svg",
  Ore: "icon_ore.svg",
});

export const TILE_FILES_BY_RESOURCE = Object.freeze({
  Wood: "tile_lumber.svg",
  Brick: "tile_brick.svg",
  Sheep: "tile_wool.svg",
  Wheat: "tile_grain.svg",
  Ore: "tile_ore.svg",
  Desert: "tile_desert.svg",
  Empty: "tile_empty.svg",
});

const normalizeFileName = (fileName = "") => String(fileName).replace(/^\/+/, "");
const RASTER_ASSET_PATH_RE = /\.(png|jpe?g|webp|gif)(?:$|\?)/i;

export function resolveThemeId(themeId) {
  if (themeId && CATANA_THEMES[themeId]) {
    return themeId;
  }
  return DEFAULT_THEME_ID;
}

export function getThemeAssetBase(themeId) {
  return CATANA_THEMES[resolveThemeId(themeId)]?.assetBase ?? CATANA_THEMES[DEFAULT_THEME_ID].assetBase;
}

export function getThemedSvgPath(themeId, fileName) {
  const resolvedThemeId = resolveThemeId(themeId);
  const normalized = normalizeFileName(fileName);
  const theme = CATANA_THEMES[resolvedThemeId] ?? CATANA_THEMES[DEFAULT_THEME_ID];
  const overridePath = theme.assetOverrides?.[normalized];
  if (overridePath) {
    return overridePath;
  }
  return `${theme.assetBase}/${normalized}`;
}

export function isRasterAssetPath(path) {
  return RASTER_ASSET_PATH_RE.test(String(path ?? ""));
}

export function getClassicSvgPath(fileName) {
  return getThemedSvgPath(DEFAULT_THEME_ID, fileName);
}

export function getBoardUnderlayPath(themeId) {
  return getThemedSvgPath(themeId, "board_underlay_standard.svg");
}

export function getBackgroundImageWithFallback(themeId, fileName) {
  const resolvedThemeId = resolveThemeId(themeId);
  const theme = CATANA_THEMES[resolvedThemeId] ?? CATANA_THEMES[DEFAULT_THEME_ID];
  const themedPath = getThemedSvgPath(themeId, fileName);
  const classicPath = getClassicSvgPath(fileName);
  if (theme.disableBackgroundFallback || themedPath === classicPath) {
    return `url('${themedPath}')`;
  }
  return `url('${themedPath}'), url('${classicPath}')`;
}

export function handleThemeImageError(event, fallbackSrc) {
  const target = event?.currentTarget;
  if (!target || !fallbackSrc) return;
  if (target.dataset?.themeFallbackApplied === "true") return;

  target.dataset.themeFallbackApplied = "true";
  target.src = fallbackSrc;
}

export function getResourceIconFile(resource) {
  return RESOURCE_ICON_FILES_BY_RESOURCE[resource] ?? null;
}

export function getResourceIconPath(themeId, resource) {
  const resolvedThemeId = resolveThemeId(themeId);
  if (resolvedThemeId === "emoji" && resource === "Desert") {
    return "/svgs/palette-themes/emoji/icon_desert.svg";
  }
  const fileName = getResourceIconFile(resource);
  return fileName ? getThemedSvgPath(themeId, fileName) : null;
}

export function getClassicResourceIconPath(resource) {
  const fileName = getResourceIconFile(resource);
  return fileName ? getClassicSvgPath(fileName) : null;
}

export function getTileFile(resource) {
  return TILE_FILES_BY_RESOURCE[resource] ?? TILE_FILES_BY_RESOURCE.Empty;
}

export function getTilePath(themeId, resource) {
  return getThemedSvgPath(themeId, getTileFile(resource));
}

export function getThemeOptions() {
  return Object.values(CATANA_THEMES);
}
