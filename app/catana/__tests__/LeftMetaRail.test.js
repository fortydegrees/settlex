import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const leftMetaRailPath = path.resolve(
  __dirname,
  "..",
  "components",
  "LeftMetaRail.js"
);

describe("LeftMetaRail", () => {
  it("renders desktop as a low-chrome feed lane with independent frames", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain("DesktopFeedFrame");
    expect(contents).toContain("isRestoreButton");
    expect(contents).toContain("data-meta-feed-dock");
    expect(contents).toContain("data-meta-feed-frame");
    expect(contents).toContain("data-meta-feed-frame-state");
    expect(contents).toContain("data-meta-feed-panel");
    expect(contents).toContain("data-meta-feed-minimize");
    expect(contents).toContain("data-meta-feed-toggle");
    expect(contents).toContain("transition-[width,height,opacity,transform,border-radius]");
    expect(contents).not.toContain("DesktopUtilityDockRow");
    expect(contents).not.toContain("RailTabBridge");
    expect(contents).not.toContain("DockedMetaPanel");
    expect(contents).not.toContain("data-meta-utility-rail");
    expect(contents).not.toContain("data-meta-side-tab");
    expect(contents).not.toContain("data-meta-feed-tab");
    expect(contents).not.toContain("getSideTabLayoutMetrics");
    expect(contents).not.toContain('import { gsap } from "gsap"');
  });

  it("defaults desktop to both support panels open", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain('const defaultDesktopOpenPanels = ["log", "chat"];');
    expect(contents).toContain("initialOpenPanels = defaultDesktopOpenPanels");
    expect(contents).toContain("openPanels.includes(panel.id)");
  });

  it("keeps restore pills when desktop panels are minimized", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain(".map(({ panel, top, height, transform }) =>");
    expect(contents).toContain("restorePanel");
    expect(contents).toContain("data-meta-feed-toggle");
    expect(contents).toContain("data-meta-feed-tooltip");
    expect(contents).toContain("data-meta-sidebar-button");
    expect(contents).toContain('const desktopFeedCollapsedSizeClassName = "h-full w-14"');
    expect(contents).toContain("flex shrink-0 items-center justify-between");
    expect(contents).not.toContain("data-meta-docked-panel-stack");
  });

  it("keeps Game Log and Chat in the desktop feed order", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");
    const gameLogIndex = contents.indexOf('id: "log"');
    const chatIndex = contents.indexOf('id: "chat"');

    expect(gameLogIndex).toBeGreaterThan(-1);
    expect(chatIndex).toBeGreaterThan(-1);
    expect(gameLogIndex).toBeLessThan(chatIndex);
    expect(contents).toContain('side: "left"');
    expect(contents).not.toContain('side: "right"');
  });

  it("anchors Game Log upward while keeping the rail fixed", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain(
      "desktopFeedCollapsedHeight} + ${desktopFeedStackGap} + ${currentChatHeight}"
    );
    expect(contents).toContain("const isLogOpenBodyPhase =");
    expect(contents).toContain("const [chatFramePhase, setChatFramePhase] = useState");
    expect(contents).toContain("const handleChatFramePhaseChange = useCallback");
    expect(contents).toContain("const isChatOpenBodyPhase =");
    expect(contents).toContain(
      "calc(${desktopFeedCollapsedHeight} - ${desktopFeedLogOpenHeight})"
    );
    expect(contents).toContain(
      'logFramePhase === "opening-body" || logFramePhase === "open"'
    );
    expect(contents).toContain('const isLogOpenBodyPhase =');
    expect(contents).toContain("top: currentLogTop");
    expect(contents).toContain(
      "top: `calc(${desktopFeedCollapsedHeight} + ${desktopFeedStackGap})`"
    );
    expect(contents).not.toContain("shellShift");
  });

  it("keeps log frame phase updates scoped to the log panel", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain("const handleLogFramePhaseChange = useCallback");
    expect(contents).toContain('if (panelId !== "log") return;');
    expect(contents).toContain("setLogFramePhase(nextPhase);");
    expect(contents).toContain("setChatFramePhase(nextPhase);");
    expect(contents).not.toContain("onPhaseChange: setLogFramePhase");
    expect(contents).toContain('phase === "opening-width" || phase === "closing-body"');
    expect(contents).toContain('return desktopFeedCollapsedSizeClassName;');
    expect(contents).toContain('const desktopFeedHeaderSizeClassName = "h-full w-full"');
  });

  it("uses a Vaul-backed bottom drawer instead of the old floating edge rail", () => {
    const contents = fs.readFileSync(leftMetaRailPath, "utf8");

    expect(contents).toContain('import { MobileMetaDrawer } from "./MobileMetaDrawer"');
    expect(contents).toContain("mobileActivePanel");
    expect(contents).toContain("onMobileActivePanelChange");
    expect(contents).toContain("MobileMetaDrawer");
    expect(contents).not.toContain("data-meta-mobile-rail");
    expect(contents).not.toContain("data-meta-mobile-sheet");
    expect(contents).not.toContain("fixed left-3 bottom-[18.75rem]");
  });
});
