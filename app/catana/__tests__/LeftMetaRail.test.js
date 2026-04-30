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

    expect(contents).toContain("panels.map((panel) =>");
    expect(contents).toContain("restorePanel");
    expect(contents).toContain("data-meta-feed-toggle");
    expect(contents).toContain("data-meta-feed-tooltip");
    expect(contents).toContain("data-meta-sidebar-button");
    expect(contents).toContain("desktopFeedCollapsedSizeClassName");
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
});
