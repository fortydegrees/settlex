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
    expect(source).toContain("mobile-command-row__timer");
    expect(source).toContain("MobileCommandTimerBox");
    expect(source).toContain('data-mobile-command-timer="true"');
    expect(source).toContain("timerText");
    expect(source).toContain("showStatusTimer");
    expect(source).toContain("isLowTimerAlertActive");
    expect(source).toContain("grid-cols-[5.75rem_minmax(0,1fr)_4rem]");
    expect(source).toContain("min-[400px]:grid-cols-[6.25rem_minmax(0,1fr)_4rem]");
    expect(source).toContain('const displayTimerText = hasTimerText ? timerText : "--:--";');
    expect(source).toContain("max-[380px]:h-[3.25rem]");
    expect(source).toContain("MiniDiceFace");
    expect(source).toContain("passiveCommandDice");
    expect(source).toContain("gameStatus?.title");
    expect(source).toContain("Rolled ${passiveCommandDice[0]} and ${passiveCommandDice[1]}");
    expect(source).toContain("effectsBus");
    expect(source).toContain("emitHaptic");
    expect(source).toContain("onHaptic");
    expect(source).toContain('name: "ui:action:press"');
    expect(source).toContain('name: "ui:tray:toggle"');
    expect(source).toContain('statusType !== "thinking"');
    expect(source).toContain("whitespace-normal");
    expect(source).toContain("[display:-webkit-box]");
    expect(source).toContain("[-webkit-line-clamp:2]");
    expect(source).not.toContain("data-mobile-meta-button={panelId}");
    expect(source).not.toContain("grid-cols-[3.85rem_3.85rem_minmax(0,1fr)]");
  });

  it("keeps passive command status text quieter than primary actions", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");
    const statusClassName = source.match(
      /className="([^"]*mobile-command-row__status[^"]*)"/
    )?.[1];

    expect(statusClassName).toContain("font-semibold");
    expect(statusClassName).not.toContain("font-extrabold");
  });

  it("places mobile action dock buttons above the local resource bar", () => {
    const source = fs.readFileSync(cockpitPath, "utf8");
    const dockIndex = source.indexOf("{mobileActions.filter(Boolean).map");
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
    expect(source).toContain('data-mobile-inventory-tone={isOverLimit ? "danger" : "default"}');
    expect(source).toContain('data-mobile-avatar-tone={isOverLimit ? "danger" : "default"}');
    expect(source).toContain("ring-rose-300");
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
