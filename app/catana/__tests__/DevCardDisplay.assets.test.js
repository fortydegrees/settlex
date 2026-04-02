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
  it("uses the current development-card folder SVG names", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain('knight: "/svgs/cards/development/knight.svg"');
    expect(contents).toContain('victoryPoint: "/svgs/cards/development/victory_point.svg"');
    expect(contents).toContain('roadBuilding: "/svgs/cards/development/roadbuilding.svg"');
    expect(contents).toContain('yearOfPlenty: "/svgs/cards/development/year_of_plenty.svg"');
    expect(contents).toContain('monopoly: "/svgs/cards/development/monopoly.svg"');
  });

  it("points only at front-card SVGs that exist on disk", () => {
    [
      "cards/development/knight.svg",
      "cards/development/victory_point.svg",
      "cards/development/roadbuilding.svg",
      "cards/development/year_of_plenty.svg",
      "cards/development/monopoly.svg",
    ].forEach((fileName) => {
      expect(fs.existsSync(path.join(publicSvgDir, fileName)), fileName).toBe(true);
    });
  });
});
