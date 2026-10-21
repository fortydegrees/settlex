import { describe, expect, it } from "vitest";
import { generateBoard } from "../utils/boardGenerator";

describe("editor initial board", () => {
  it("initializes every generated tile as an empty resource drop target", () => {
    const tiles = generateBoard();

    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.resource).toBe("Empty");
    }
  });
});
