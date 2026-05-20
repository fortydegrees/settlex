import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const drawerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "MobileMetaDrawer.js"
);

const readDrawerSource = () =>
  fs.existsSync(drawerPath) ? fs.readFileSync(drawerPath, "utf8") : "";

describe("MobileMetaDrawer source", () => {
  it("wraps the mobile feed in a Vaul bottom drawer", () => {
    const source = readDrawerSource();

    expect(source).toContain('import { Drawer } from "vaul"');
    expect(source).toContain("Drawer.Root");
    expect(source).toContain("open={Boolean(activePanel)}");
    expect(source).toContain("onOpenChange={handleOpenChange}");
    expect(source).toContain('direction="bottom"');
    expect(source).toContain("dismissible={true}");
    expect(source).toContain("modal={false}");
    expect(source).toContain("noBodyStyles={true}");
    expect(source).toContain("preserveBoardPointerDown");
    expect(source).toContain("onPointerDownOutside={preserveBoardPointerDown}");
    expect(source).toContain("Drawer.Portal");
    expect(source).toContain("Drawer.Content");
    expect(source).toContain("Drawer.Handle");
    expect(source).toContain('data-meta-mobile-drawer="true"');
    expect(source).not.toContain("Drawer.Overlay");
    expect(source).not.toContain("Drawer.Close");
    expect(source).not.toContain("Close game feed");
  });

  it("keeps Log and Chat as tabs inside the drawer surface", () => {
    const source = readDrawerSource();

    expect(source).toContain('role="tablist"');
    expect(source).toContain("data-meta-mobile-drawer-tab={panel.id}");
    expect(source).toContain("data-meta-mobile-drawer-panel={selectedPanel.id}");
    expect(source).toContain("setActivePanel(panel.id)");
  });
});
