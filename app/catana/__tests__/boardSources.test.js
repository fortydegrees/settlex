import { describe, expect, it } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import { BOARD_SOURCE_IDS } from "../../../lib/shared/catanaGameModes.js";
import { DUEL_FAIR_BOARD_CATALOG } from "../gameSetup/catalogs/duelFairOfficialV1.generated.js";
import {
  materializeBoardSource,
  materializeCustomBoard,
  resolveBoardSource
} from "../gameSetup/boardSources.js";

describe("Catana board sources", () => {
  it("materialises the first catalog entry at the lower boundary", () => {
    const result = materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
      rng: () => 0
    });

    expect(result.boardConfigId).toBe("standard-official-spiral");
    expect(result.boardProvenance).toEqual({
      sourceKind: "catalog",
      catalogId: "duel-fair-official-v1",
      catalogRank: 1,
      seed: DUEL_FAIR_BOARD_CATALOG.seeds[0],
      generatorFamily: "official-spiral",
      generatorVersion: "official-spiral-v1",
      evaluatorVersion: "duel-fair-v3",
      evaluatorIdentity: DUEL_FAIR_BOARD_CATALOG.evaluatorIdentity
    });
  });

  it("materialises the last catalog entry below the upper boundary", () => {
    const result = materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
      rng: () => 1 - Number.EPSILON
    });

    expect(result.boardProvenance).toMatchObject({
      catalogRank: DUEL_FAIR_BOARD_CATALOG.seeds.length,
      seed: DUEL_FAIR_BOARD_CATALOG.seeds.at(-1)
    });
  });

  it.each([-0.01, 1, Number.NaN])(
    "rejects invalid catalog random value %s",
    (randomValue) => {
      expect(() => materializeBoardSource({
        boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
        rng: () => randomValue
      })).toThrow("catalog random value");
    }
  );

  it("materialises generated official boards deterministically", () => {
    const generate = () => materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1,
      rng: makeDeterministicRng(42)
    });
    const first = generate();
    const second = generate();

    expect(first.tiles).toEqual(second.tiles);
    expect(first.boardConfigId).toBe("standard-official-spiral");
    expect(first.boardProvenance).toEqual({
      sourceKind: "generated",
      generatorFamily: "official-spiral",
      generatorVersion: "official-spiral-v1"
    });
  });

  it("rejects unknown sources", () => {
    expect(() => resolveBoardSource("missing-source")).toThrow(
      "Unknown board source: missing-source"
    );
  });

  it("materialises explicit custom configs without pretending they are catalogued", () => {
    const result = materializeCustomBoard({
      boardConfig: resolveBoardSource(
        BOARD_SOURCE_IDS.GENERATED_RANDOM_V1
      ).boardConfig,
      rng: makeDeterministicRng(9)
    });

    expect(result).toMatchObject({
      boardSourceId: "custom",
      boardConfigId: "custom",
      boardProvenance: { sourceKind: "custom" }
    });
  });
});
