import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readCatanaFile = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");

const extractCssBlock = (contents, marker) => {
  const markerIndex = contents.indexOf(marker);
  if (markerIndex < 0) return "";

  const openingBraceIndex = contents.indexOf("{", markerIndex);
  if (openingBraceIndex < 0) return "";

  let depth = 0;
  for (let index = openingBraceIndex; index < contents.length; index += 1) {
    if (contents[index] === "{") depth += 1;
    if (contents[index] === "}") depth -= 1;
    if (depth === 0) return contents.slice(markerIndex, index + 1);
  }

  return "";
};

describe("Catana HUD motion performance", () => {
  it("keeps the placement-node pulse on compositor-friendly properties", () => {
    const contents = readCatanaFile("Board.css");
    const keyframes = extractCssBlock(contents, "@keyframes board-pulse");
    const pulseRule = extractCssBlock(contents, ".animation-pulse");

    expect(keyframes).not.toBe("");
    expect(keyframes).toContain("transform:");
    expect(keyframes).not.toMatch(
      /(?:box-shadow|text-shadow|filter|width|height|top|left|margin|padding)\s*:/
    );
    expect(pulseRule).not.toBe("");
    expect(pulseRule).toContain("will-change: transform");
  });

  it("keeps the active-avatar pulse on compositor-friendly properties", () => {
    const contents = readCatanaFile("components/PlayerAvatarStats.css");
    const keyframes = extractCssBlock(
      contents,
      "@keyframes avatar-active-glow-pulse"
    );
    const glowLayer = extractCssBlock(
      contents,
      ".avatar-active-glow::before"
    );

    expect(keyframes).not.toBe("");
    expect(keyframes).toContain("transform:");
    expect(keyframes).toContain("opacity:");
    expect(keyframes).not.toMatch(
      /(?:box-shadow|text-shadow|filter|width|height|top|left|margin|padding)\s*:/
    );
    expect(glowLayer).toContain("box-shadow:");
    expect(glowLayer).toContain("will-change: transform, opacity");
  });

  it("does not permanently invalidate the action dock contents", () => {
    const contents = readCatanaFile("components/ActionsDock/dockStyles.css");

    expect(contents).not.toContain("will-change: contents");
  });
});
