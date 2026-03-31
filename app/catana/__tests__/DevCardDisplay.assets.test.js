import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "DevCardDisplay.js"
);
const publicSvgDir = path.resolve(__dirname, "..", "..", "..", "public", "svgs");

describe("DevCardDisplay asset wiring", () => {
  it("uses the current top-level Catana front-card SVG names", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain('knight: "/svgs/card_devcard_knight.svg"');
    expect(contents).toContain('victoryPoint: "/svgs/victory_point.svg"');
    expect(contents).toContain('roadBuilding: "/svgs/roadbuilding.svg"');
    expect(contents).toContain('yearOfPlenty: "/svgs/year_of_plenty.svg"');
    expect(contents).toContain('monopoly: "/svgs/monopoly.svg"');
  });

  it("points only at front-card SVGs that exist on disk", () => {
    [
      "card_devcard_knight.svg",
      "victory_point.svg",
      "roadbuilding.svg",
      "year_of_plenty.svg",
      "monopoly.svg",
    ].forEach((fileName) => {
      expect(fs.existsSync(path.join(publicSvgDir, fileName)), fileName).toBe(true);
    });
  });
});
