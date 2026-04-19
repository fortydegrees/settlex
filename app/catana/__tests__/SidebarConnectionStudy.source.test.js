import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sidebarConnectionPath = path.resolve(
  process.cwd(),
  "app/catana/dev/sidebar-connection/SidebarConnectionClient.js"
);

describe("sidebar connection study source", () => {
  it("keeps the new variant as a single side-tab shell rather than a shoulder blob", () => {
    const source = fs.readFileSync(sidebarConnectionPath, "utf8");

    expect(source).toContain("buildSideTabUnifiedShellPath");
    expect(source).toContain("SIDE_TAB_PANEL_LEFT");
    expect(source).toContain("SIDE_TAB_BUTTON_OPEN_TOP");
    expect(source).toContain("SideTabConnectedRow");
    expect(source).not.toContain("buildShoulderUnifiedShellPath");
  });

  it("keeps side-tab button metrics aligned with the taper button and locks the clicked button", () => {
    const source = fs.readFileSync(sidebarConnectionPath, "utf8");

    expect(source).toContain("const SIDE_TAB_BUTTON_STACK_GAP = 16;");
    expect(source).toContain("const SIDE_TAB_OPEN_PANEL_GAP = 20;");
    expect(source).toContain("const SIDE_TAB_PANEL_OPEN_LIFT = 12;");
    expect(source).toContain("const SIDE_TAB_PANEL_GAP = 12;");
    expect(source).toContain(
      "const SIDE_TAB_PANEL_LEFT = BUTTON_SIZE + SIDE_TAB_PANEL_GAP;"
    );
    expect(source).toContain("const SIDE_TAB_HEADER_HEIGHT = 33;");
    expect(source).toContain(
      "SIDE_TAB_HEADER_HEIGHT + SIDE_TAB_PANEL_OPEN_LIFT"
    );
    expect(source).toContain("const SIDE_TAB_BUTTON_CLOSED_TOP = 0;");
    expect(source).toContain(
      "const SIDE_TAB_HEADER_SEAM_Y = SIDE_TAB_PANEL_TOP + SIDE_TAB_HEADER_HEIGHT;"
    );
    expect(source).toContain(
      "const SIDE_TAB_BUTTON_OPEN_TOP = SIDE_TAB_BUTTON_CLOSED_TOP;"
    );
    expect(source).toContain("const topJoinY = SIDE_TAB_HEADER_SEAM_Y;");
    expect(source).not.toContain(
      "const SIDE_TAB_BUTTON_OPEN_TOP = SIDE_TAB_PANEL_TOP + SIDE_TAB_HEADER_HEIGHT;"
    );
    expect(source).toContain('top: `${SIDE_TAB_BUTTON_CLOSED_TOP}px`');
    expect(source).toContain("const buttonShellOpacity = interpolateStops");
    expect(source).not.toContain("const hitButtonTop = isOpen");
    expect(source).not.toContain("const closedButtonOpacity = interpolateStops");
    expect(source).not.toContain("const activeButtonOpacity = interpolateStops");
    expect(source).not.toContain("const buttonY = lerp");
    expect(source).not.toContain("transform: buttonTransform");
    expect(source).not.toContain("const scale = lerp(1, 1.02");
  });

  it("keeps side-tab dock buttons compact unless consecutive panels are open", () => {
    const source = fs.readFileSync(sidebarConnectionPath, "utf8");

    expect(source).toContain("function getSideTabRowHeight");
    expect(source).toContain("nextIsOpen");
    expect(source).toContain("isOpen && nextIsOpen");
    expect(source).toContain(
      "return panel.height + SIDE_TAB_OPEN_PANEL_GAP;"
    );
    expect(source).not.toContain(
      "return SIDE_TAB_PANEL_TOP + panel.height + SIDE_TAB_OPEN_PANEL_GAP;"
    );
    expect(source).toContain("return BUTTON_SIZE + SIDE_TAB_BUTTON_STACK_GAP;");
    expect(source).toContain("ring-white/45");
    expect(source).toContain('stroke="rgba(255,255,255,0.45)"');
  });

  it("uses calmer GSAP easing for the mockup motion instead of spring physics", () => {
    const source = fs.readFileSync(sidebarConnectionPath, "utf8");

    expect(source).toContain('import { gsap } from "gsap";');
    expect(source).toContain("function useGsapDockMotion");
    expect(source).toContain('ease: "power3.out"');
    expect(source).toContain("duration: reduceMotion ? 0 : 0.22");
    expect(source).toContain('overwrite: "auto"');
    expect(source).toContain('"prefers-reduced-motion: reduce"');
    expect(source).not.toContain("@react-spring/web");
    expect(source).not.toContain("useSpring");
    expect(source).not.toContain("<animated.");
  });

  it("clips side-tab panel content to the same rounded shell corners", () => {
    const source = fs.readFileSync(sidebarConnectionPath, "utf8");

    expect(source).toContain(
      "const sideTabPanelClip = `inset(0 round ${SIDE_TAB_PANEL_RADIUS}px)`;"
    );
    expect(source).toContain("clipPath: sideTabPanelClip");
    expect(source).toContain("borderRadius: `${SIDE_TAB_PANEL_RADIUS}px`");
    expect(source).toContain("WebkitClipPath: sideTabPanelClip");
  });
});
