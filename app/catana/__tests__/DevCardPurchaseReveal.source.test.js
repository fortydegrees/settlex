import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, "..", "DevCardPurchaseReveal.js");

describe("DevCardPurchaseReveal source", () => {
  it("keeps the detached reveal actor hidden until the dock preload releases", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("autoAlpha: 0");
    expect(source).toContain("timeline.set(actorNode, { autoAlpha: 1 })");
  });

  it("swaps the visible card art at flip midpoint without fighting React rerenders", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("const cardFaceRef = useRef(null)");
    expect(source).toContain("const [displayedCardSrc, setDisplayedCardSrc] = useState(DEV_CARD_BACK_SVG)");
    expect(source).toContain(
      "const revealCardSrc = DEV_CARD_FACE_SVGS[reveal.cardType] ?? DEV_CARD_BACK_SVG"
    );
    expect(source).toContain("src={displayedCardSrc}");
    expect(source).toContain("setDisplayedCardSrc(revealCardSrc)");
  });
});
