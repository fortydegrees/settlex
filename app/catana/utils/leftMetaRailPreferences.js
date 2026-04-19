export const LEFT_META_RAIL_DESKTOP_STORAGE_KEY =
  "catana:left-meta-rail:desktop";
export const LEFT_META_RAIL_DESKTOP_MIN_WIDTH = 250;
export const LEFT_META_RAIL_DESKTOP_DEFAULT_WIDTH = 350;
export const LEFT_META_RAIL_DESKTOP_MAX_WIDTH = 448;

const desktopPanelIds = new Set(["log", "chat"]);

const getDefaultStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

const normalizeOpenPanels = (nextPanels) => {
  if (!Array.isArray(nextPanels)) return ["log", "chat"];

  return Array.from(
    new Set(
      nextPanels.filter(
        (panelId) => typeof panelId === "string" && desktopPanelIds.has(panelId)
      )
    )
  );
};

export const clampLeftMetaRailDesktopPanelWidth = (
  panelWidth,
  { viewportWidth } = {}
) => {
  const numericWidth = Number(panelWidth);
  const viewportCap = Number.isFinite(viewportWidth)
    ? Math.max(LEFT_META_RAIL_DESKTOP_MIN_WIDTH, viewportWidth - 220)
    : LEFT_META_RAIL_DESKTOP_MAX_WIDTH;
  const maxWidth = Math.min(LEFT_META_RAIL_DESKTOP_MAX_WIDTH, viewportCap);

  if (!Number.isFinite(numericWidth)) {
    return Math.min(LEFT_META_RAIL_DESKTOP_DEFAULT_WIDTH, maxWidth);
  }

  return Math.max(
    LEFT_META_RAIL_DESKTOP_MIN_WIDTH,
    Math.min(maxWidth, Math.round(numericWidth))
  );
};

export const normalizeLeftMetaRailDesktopPrefs = (
  value,
  { initialOpenPanels = ["log", "chat"], viewportWidth } = {}
) => {
  const fallbackOpenPanels = normalizeOpenPanels(initialOpenPanels);
  const hasExplicitOpenPanels = Array.isArray(value?.openPanels);

  return {
    openPanels: hasExplicitOpenPanels
      ? normalizeOpenPanels(value.openPanels)
      : fallbackOpenPanels,
    panelWidth: clampLeftMetaRailDesktopPanelWidth(value?.panelWidth, {
      viewportWidth,
    }),
    panelHeights: {},
  };
};

export function readLeftMetaRailDesktopPrefs(
  storage = getDefaultStorage(),
  options
) {
  try {
    const raw = storage?.getItem?.(LEFT_META_RAIL_DESKTOP_STORAGE_KEY);
    if (!raw) {
      return normalizeLeftMetaRailDesktopPrefs(null, options);
    }

    return normalizeLeftMetaRailDesktopPrefs(JSON.parse(raw), options);
  } catch (error) {
    return normalizeLeftMetaRailDesktopPrefs(null, options);
  }
}

export function writeLeftMetaRailDesktopPrefs(
  storage = getDefaultStorage(),
  prefs,
  options
) {
  const normalized = normalizeLeftMetaRailDesktopPrefs(prefs, options);

  try {
    storage?.setItem?.(
      LEFT_META_RAIL_DESKTOP_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  } catch (error) {
    // ignore storage failures
  }

  return normalized;
}
