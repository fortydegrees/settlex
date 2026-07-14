import { describe, expect, it } from "vitest";
import { BOARD_CONFIGS, resolveBoardConfig } from "./boardConfigs";

describe("board config registry", () => {
  it("contains only deterministic runtime configurations", () => {
    expect(Object.keys(BOARD_CONFIGS).sort()).toEqual([
      "standard-official-spiral",
      "standard-random"
    ]);
  });

  it("resolves the explicit official spiral configuration", () => {
    expect(resolveBoardConfig("standard-official-spiral")).toMatchObject({
      specId: "standard-4p",
      generation: {
        terrain: "random",
        numbers: "official",
        ports: "random"
      }
    });
  });
});
