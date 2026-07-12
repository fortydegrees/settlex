import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { canonicalBoardHash, hashBoard, transformTiles } from "../analysis/symmetry.mjs";

describe("board symmetry identity", () => {
  it("deduplicates all twelve rotations and reflections", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 9 }).tiles;
    const canonical = canonicalBoardHash(tiles);
    for (let index = 0; index < 12; index += 1) {
      expect(canonicalBoardHash(transformTiles(tiles, index))).toBe(canonical);
    }
  });

  it("keeps raw orientation hashes distinct", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 9 }).tiles;
    expect(hashBoard(transformTiles(tiles, 1))).not.toBe(hashBoard(tiles));
  });

  it("keeps wiring identity in raw hashes but not content-canonical hashes", () => {
    const tiles = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 9 }).tiles;
    const rewired = structuredClone(tiles);
    rewired[0].tile.id += 1_000;
    expect(hashBoard(rewired)).not.toBe(hashBoard(tiles));
    expect(canonicalBoardHash(rewired)).toBe(canonicalBoardHash(tiles));
  });
});
