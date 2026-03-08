import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tilePath = path.resolve(__dirname, "..", "Tile.js");

describe("Catana tile icon sizing", () => {
  it("applies an emoji-only tile icon scale multiplier", () => {
    const contents = fs.readFileSync(tilePath, "utf8");
    expect(contents).toMatch(/const EMOJI_TILE_ICON_SCALE_MULTIPLIER = 0\.85;/);
    expect(contents).toMatch(/const EMOJI_TILE_ICON_TOP_MULTIPLIER = 1\.16;/);
    expect(contents).toMatch(
      /const tileIconScale =\s*themeId === "emoji"\s*\?\s*TILE_ICON_SCALE \* EMOJI_TILE_ICON_SCALE_MULTIPLIER\s*:\s*TILE_ICON_SCALE;/
    );
    expect(contents).toMatch(
      /const tileIconTop =\s*themeId === "emoji"\s*\?\s*size \* TILE_ICON_TOP_FACTOR \* EMOJI_TILE_ICON_TOP_MULTIPLIER\s*:\s*size \* TILE_ICON_TOP_FACTOR;/
    );
    expect(contents).toMatch(/top:\s*tileIconTop,/);
    expect(contents).toMatch(/width:\s*size \* tileIconScale,/);
    expect(contents).toMatch(/height:\s*size \* tileIconScale,/);
  });
});
