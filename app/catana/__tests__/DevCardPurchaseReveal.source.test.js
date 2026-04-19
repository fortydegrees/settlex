import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, "..", "DevCardPurchaseReveal.js");

describe("DevCardPurchaseReveal source", () => {
  it("defaults live reveals to the 3D flip while allowing midpoint comparison in the lab", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain('flipVariant = "3d"');
    expect(source).toContain('const isMidpointFlip = flipVariant === "midpoint"');
    expect(source).toContain("setMidpointCardSrc(revealCardSrc)");
  });

  it("starts the detached reveal actor slightly before the dock preload fully releases", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("autoAlpha: 0");
    expect(source).toContain("ACTOR_HANDOFF_LEAD_MS");
    expect(source).toContain("const timelineDelayMs = Math.max(");
    expect(source).toContain("(reveal.launchDelayMs ?? 0) - ACTOR_HANDOFF_LEAD_MS");
    expect(source).toContain('const travelHandoffOffset = "<+0.02"');
  });

  it("uses a React-owned two-face 3D card flip instead of a midpoint art swap", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("const card3dRef = useRef(null)");
    expect(source).toContain("const cardBackFaceRef = useRef(null)");
    expect(source).toContain("const cardFrontFaceRef = useRef(null)");
    expect(source).toContain(
      "const revealCardSrc = DEV_CARD_FACE_SVGS[reveal?.cardType] ?? DEV_CARD_BACK_SVG"
    );
    expect(source).toContain("transformStyle: \"preserve-3d\"");
    expect(source).toContain("backfaceVisibility: \"hidden\"");
    expect(source).toContain("src={DEV_CARD_BACK_SVG}");
    expect(source).toContain("src={revealCardSrc}");
    expect(source).toContain("rotationY: 180");
    expect(source).not.toContain("src={displayedCardSrc}");
    expect(source).not.toContain("setDisplayedCardSrc(revealCardSrc)");
  });

  it("spawns the detached actor closer to dock-emblem size before it grows into center travel", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("scale: 0.46");
    expect(source).toContain("scale: 0.92");
  });
});
