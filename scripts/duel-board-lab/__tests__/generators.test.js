import { describe, expect, it } from "vitest";
import { ResourceType, TileTypes } from "@settlex/game-core";
import {
  BOARD_FAMILIES,
  generateCandidate
} from "../generators/generateCandidate.mjs";

const landSignature = (candidate) =>
  candidate.tiles
    .filter((tile) => tile.type === TileTypes.LAND)
    .map((tile) => [tile.coordinate, tile.tile.resource, tile.tile.number]);

describe("duel board candidate generators", () => {
  for (const family of Object.values(BOARD_FAMILIES)) {
    it(`${family} is deterministic for a fixed seed`, () => {
      const first = generateCandidate({ family, seed: 42 });
      const second = generateCandidate({ family, seed: 42 });
      expect(landSignature(first)).toEqual(landSignature(second));
      expect(first.generatorVersion).toMatch(/-v1$/);
    });

    it(`${family} preserves standard counts`, () => {
      const candidate = generateCandidate({ family, seed: 7 });
      const land = candidate.tiles.filter((tile) => tile.type === TileTypes.LAND);
      const ports = candidate.tiles.filter((tile) => tile.type === TileTypes.PORT);
      expect(land).toHaveLength(19);
      expect(ports).toHaveLength(9);
      expect(
        land.filter((tile) => tile.tile.resource === ResourceType.DESERT)
      ).toHaveLength(1);
      expect(land.filter((tile) => tile.tile.number != null)).toHaveLength(18);
    });
  }

  it("rejects unknown families and non-integer seeds", () => {
    expect(() => generateCandidate({ family: "unknown", seed: 1 })).toThrow(
      "Unknown board family"
    );
    expect(() =>
      generateCandidate({
        family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
        seed: 1.5
      })
    ).toThrow("seed must be an integer");
  });
});
