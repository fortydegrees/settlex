import { describe, expect, it } from "vitest";
import {
  LEFT_META_RAIL_DESKTOP_DEFAULT_WIDTH,
  LEFT_META_RAIL_DESKTOP_MAX_WIDTH,
  LEFT_META_RAIL_DESKTOP_MIN_WIDTH,
  LEFT_META_RAIL_DESKTOP_STORAGE_KEY,
  clampLeftMetaRailDesktopPanelWidth,
  readLeftMetaRailDesktopPrefs,
  writeLeftMetaRailDesktopPrefs,
} from "../utils/leftMetaRailPreferences";

const createMemoryStorage = (initialState = {}) => {
  const store = new Map(Object.entries(initialState));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
};

describe("leftMetaRailPreferences", () => {
  it("clamps panel width to sane desktop bounds", () => {
    expect(clampLeftMetaRailDesktopPanelWidth(10)).toBe(
      LEFT_META_RAIL_DESKTOP_MIN_WIDTH
    );
    expect(clampLeftMetaRailDesktopPanelWidth(999)).toBe(
      LEFT_META_RAIL_DESKTOP_MAX_WIDTH
    );
    expect(clampLeftMetaRailDesktopPanelWidth(360)).toBe(360);
  });

  it("reads safe defaults when storage is empty or invalid", () => {
    expect(readLeftMetaRailDesktopPrefs(createMemoryStorage())).toEqual({
      openPanels: ["log", "chat"],
      panelWidth: LEFT_META_RAIL_DESKTOP_DEFAULT_WIDTH,
      panelHeights: {},
    });

    expect(
      readLeftMetaRailDesktopPrefs(
        createMemoryStorage({
          [LEFT_META_RAIL_DESKTOP_STORAGE_KEY]: "{not-json",
        })
      )
    ).toEqual({
      openPanels: ["log", "chat"],
      panelWidth: LEFT_META_RAIL_DESKTOP_DEFAULT_WIDTH,
      panelHeights: {},
    });
  });

  it("normalizes and persists shared desktop prefs", () => {
    const storage = createMemoryStorage();

    writeLeftMetaRailDesktopPrefs(storage, {
      openPanels: ["chat", "chat", "bogus"],
      panelWidth: 999,
      panelHeights: { log: 999, chat: 123 },
    });

    expect(readLeftMetaRailDesktopPrefs(storage)).toEqual({
      openPanels: ["chat"],
      panelWidth: LEFT_META_RAIL_DESKTOP_MAX_WIDTH,
      panelHeights: {},
    });
  });
});
