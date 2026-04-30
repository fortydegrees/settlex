import { describe, expect, it } from "vitest";
import { getPieceSvgFile, getPieceSvgPath } from "../theme/pieceAssets.js";

describe("pieceAssets", () => {
  it("builds nested piece filenames", () => {
    expect(getPieceSvgFile("road", "gold")).toBe("pieces/road_gold.svg");
    expect(getPieceSvgFile("road", "blue")).toBe("pieces/road_royal.svg");
    expect(getPieceSvgFile("road", "olive")).toBe("pieces/road_lime.svg");
    expect(getPieceSvgFile("settlement", "cyan")).toBe(
      "pieces/settlement_teal.svg"
    );
    expect(getPieceSvgFile("city", "amber")).toBe("pieces/city_gold.svg");
  });

  it("builds public svg paths", () => {
    expect(getPieceSvgPath("settlement", "silver")).toBe(
      "/svgs/pieces/settlement_silver.svg"
    );
  });
});
