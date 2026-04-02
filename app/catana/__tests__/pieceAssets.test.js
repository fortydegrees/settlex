import { describe, expect, it } from "vitest";
import { getPieceSvgFile, getPieceSvgPath } from "../theme/pieceAssets.js";

describe("pieceAssets", () => {
  it("builds nested piece filenames", () => {
    expect(getPieceSvgFile("road", "cyan")).toBe("pieces/road_cyan.svg");
    expect(getPieceSvgFile("city", "amber")).toBe("pieces/city_amber.svg");
  });

  it("builds public svg paths", () => {
    expect(getPieceSvgPath("settlement", "purple")).toBe(
      "/svgs/pieces/settlement_purple.svg"
    );
  });
});
