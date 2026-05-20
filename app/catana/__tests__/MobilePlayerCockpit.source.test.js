import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cockpitPath = path.resolve(
  __dirname,
  "..",
  "components",
  "MobilePlayerCockpit.js"
);

describe("MobilePlayerCockpit source", () => {
  it("composes the shared dock model, avatar, action dock, and primary CTA", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");

    expect(source).toContain("MobilePrimaryTurnButton");
    expect(source).toContain("useLocalPlayerDockModel");
    expect(source).toContain("MobileStatChip");
    expect(source).toContain("mobile-player-inventory");
    expect(source).toContain("DockCard");
  });

  it("puts a compact mobile feed trigger beside the contextual primary action", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");

    expect(source).toContain("onMobileMetaPanelOpen");
    expect(source).toContain("activeMobileMetaPanel");
    expect(source).toContain('data-mobile-command-row="true"');
    expect(source).toContain("MobileMetaFeedTrigger");
    expect(source).toContain('data-mobile-meta-feed-trigger="true"');
    expect(source).toContain('onOpen?.("log")');
    expect(source).toContain('onOpen?.("chat")');
    expect(source).toContain("mobile-command-row__feed-trigger");
    expect(source).toContain("mobile-command-row__status");
    expect(source).not.toContain("data-mobile-meta-button={panelId}");
    expect(source).not.toContain("grid-cols-[3.85rem_3.85rem_minmax(0,1fr)]");
  });

  it("places mobile action dock buttons above the local resource bar", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");
    const dockIndex = source.indexOf("{dynamicActions.filter(Boolean).map");
    const resourceBarIndex = source.indexOf("mobile-player-inventory");

    expect(dockIndex).toBeGreaterThan(-1);
    expect(resourceBarIndex).toBeGreaterThan(-1);
    expect(dockIndex).toBeLessThan(resourceBarIndex);
  });

  it("expands the inventory panel to reveal dev cards above the resource row", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");
    const inventoryIndex = source.indexOf("mobile-player-inventory");
    const expanderIndex = source.indexOf("data-mobile-devcard-expander");

    expect(inventoryIndex).toBeGreaterThan(-1);
    expect(expanderIndex).toBeGreaterThan(-1);
    expect(source).toContain("grid-rows-[1fr]");
    expect(source).toContain("grid-rows-[0fr]");
    expect(expanderIndex).toBeGreaterThan(inventoryIndex);
  });

  it("keeps resources, mobile dev cards, road, and army anchors in the compact inventory strip", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");

    expect(source).toContain('id={`p${player.id}-resources`}');
    expect(source).toContain('id={`p${player.id}-longest-road`}');
    expect(source).toContain('id={`p${player.id}-largest-army`}');
    expect(source).toContain("MobileDevCardButton");
    expect(source).toContain("MobileDevCardTray");
    expect(source).toContain("containerRef={devCardDisplayRef}");
  });

  it("opens mobile dev cards through a tray instead of the desktop embedded display", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");

    expect(source).toContain("isDevTrayOpen");
    expect(source).toContain("setIsDevTrayOpen");
    expect(source).toContain("handleMobileDevCardPlay");
    expect(source).not.toContain("embedded={true}");
  });
});
