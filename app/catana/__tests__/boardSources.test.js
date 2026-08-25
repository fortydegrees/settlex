import { describe, expect, it } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import { BOARD_SOURCE_IDS } from "../../../lib/shared/catanaGameModes.js";
import { DUEL_FAIR_BOARD_CATALOG } from "../gameSetup/catalogs/duelFairOfficialV1.generated.js";
import {
  materializeBoardSource,
  materializeCustomBoard,
  resolveBoardSource,
  selectCatalogEntry
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

  it("projects only V2 port attachments onto the pinned native contract", () => {
    const standard = materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
      rng: () => 0
    });
    const settleGraph = materializeBoardSource({
      boardSourceId: BOARD_SOURCE_IDS.SETTLEGRAPH_V2_NATIVE_V1,
      rng: () => 0
    });

    expect(settleGraph.boardSourceId).toBe("settlegraph-v2-native-v1");
    expect(settleGraph.tiles.filter(({ type }) => type === "Land"))
      .toEqual(standard.tiles.filter(({ type }) => type === "Land"));
    expect(settleGraph.tiles.filter(({ type }) => type === "Port").map(({ tile }) => tile.resource))
      .toEqual(standard.tiles.filter(({ type }) => type === "Port").map(({ tile }) => tile.resource));
    expect(settleGraph.tiles.filter(({ type }) => type === "Port").map(({ coordinate, tile }) => ({
      coordinate,
      direction: tile.direction,
      nodes: tile.nodes
    }))).toEqual([
      { coordinate: [1, 2, -3], direction: "NORTHEAST", nodes: [35, 36] },
      { coordinate: [2, 1, -3], direction: "NORTHWEST", nodes: [46, 52] },
      { coordinate: [3, -1, -2], direction: "NORTHEAST", nodes: [50, 51] },
      { coordinate: [3, -3, 0], direction: "EAST", nodes: [48, 49] },
      { coordinate: [1, -3, 2], direction: "SOUTHEAST", nodes: [40, 26] },
      { coordinate: [-1, -2, 3], direction: "SOUTHWEST", nodes: [16, 28] },
      { coordinate: [-2, -1, 3], direction: "SOUTHEAST", nodes: [2, 3] },
      { coordinate: [-3, 1, 2], direction: "SOUTHWEST", nodes: [5, 8] },
      { coordinate: [-3, 3, 0], direction: "WEST", nodes: [12, 13] }
    ]);
    expect(settleGraph.boardProvenance).toMatchObject({
      sourceKind: "catalog",
      catalogId: "duel-fair-official-v1",
      seed: DUEL_FAIR_BOARD_CATALOG.seeds[0],
      projectionId: "settlegraph-v2-native-ports-v1"
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

  it("rejects an empty catalog before selecting an entry", () => {
    expect(() => selectCatalogEntry({ randomValue: 0, seeds: [] })).toThrow(
      "catalog seeds must not be empty"
    );
  });

  it.each([1.5, Number.NaN, "47", undefined])(
    "rejects invalid catalog seed %s",
    (seed) => {
      expect(() => selectCatalogEntry({ randomValue: 0, seeds: [seed] }))
        .toThrow("catalog seed must be an integer");
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
