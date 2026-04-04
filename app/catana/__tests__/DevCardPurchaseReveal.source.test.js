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

  it("animates from card back to the bought card face explicitly", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("const backFaceRef = useRef(null)");
    expect(source).toContain("const frontFaceRef = useRef(null)");
    expect(source).toContain("gsap.set(backFaceNode");
    expect(source).toContain("gsap.set(frontFaceNode");
    expect(source).toContain("timeline.to(backFaceNode");
    expect(source).toContain("timeline.to(frontFaceNode");
  });
});
