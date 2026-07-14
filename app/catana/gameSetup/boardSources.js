import {
  generateBoard,
  makeDeterministicRng,
  resolveBoardConfig
} from "@settlex/game-core";
import { BOARD_SOURCE_IDS } from "../../../lib/shared/catanaGameModes.js";
import { DUEL_FAIR_BOARD_CATALOG } from "./catalogs/duelFairOfficialV1.generated.js";

const createGeneratedSource = ({ id, boardConfigId, generatorFamily, generatorVersion }) =>
  Object.freeze({
    id,
    kind: "generated",
    boardConfigId,
    boardConfig: resolveBoardConfig(boardConfigId),
    generatorFamily,
    generatorVersion
  });

export const BOARD_SOURCES = Object.freeze({
  [BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1]: Object.freeze({
    id: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
    kind: "catalog",
    boardConfigId: DUEL_FAIR_BOARD_CATALOG.boardConfigId,
    boardConfig: resolveBoardConfig(DUEL_FAIR_BOARD_CATALOG.boardConfigId),
    catalog: DUEL_FAIR_BOARD_CATALOG
  }),
  [BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1]: createGeneratedSource({
    id: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1,
    boardConfigId: "standard-official-spiral",
    generatorFamily: "official-spiral",
    generatorVersion: "official-spiral-v1"
  }),
  [BOARD_SOURCE_IDS.GENERATED_RANDOM_V1]: createGeneratedSource({
    id: BOARD_SOURCE_IDS.GENERATED_RANDOM_V1,
    boardConfigId: "standard-random",
    generatorFamily: "freeform-random",
    generatorVersion: "freeform-random-v1"
  })
});

export const resolveBoardSource = (id) => {
  const source = BOARD_SOURCES[id];
  if (!source) throw new Error(`Unknown board source: ${id}`);
  return source;
};

const assertRng = (rng) => {
  if (typeof rng !== "function") throw new Error("rng must be a function");
};

const selectCatalogIndex = (randomValue, size) => {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error(
      "catalog random value must be finite from 0 up to, but not including, 1"
    );
  }
  return Math.floor(randomValue * size);
};

export const selectCatalogEntry = ({ randomValue, seeds }) => {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error("catalog seeds must not be empty");
  }
  const index = selectCatalogIndex(randomValue, seeds.length);
  const seed = seeds[index];
  if (!Number.isInteger(seed)) {
    throw new Error("catalog seed must be an integer");
  }
  return { index, seed };
};

export const materializeBoardSource = ({ boardSourceId, rng }) => {
  assertRng(rng);
  const source = resolveBoardSource(boardSourceId);

  if (source.kind === "catalog") {
    const { index, seed } = selectCatalogEntry({
      randomValue: rng(),
      seeds: source.catalog.seeds
    });
    return {
      boardSourceId: source.id,
      boardConfigId: source.boardConfigId,
      boardProvenance: Object.freeze({
        sourceKind: "catalog",
        catalogId: source.catalog.id,
        catalogRank: index + 1,
        seed,
        generatorFamily: source.catalog.generatorFamily,
        generatorVersion: source.catalog.generatorVersion,
        evaluatorVersion: source.catalog.evaluatorVersion,
        evaluatorIdentity: source.catalog.evaluatorIdentity
      }),
      tiles: generateBoard(source.boardConfig, makeDeterministicRng(seed))
    };
  }

  return {
    boardSourceId: source.id,
    boardConfigId: source.boardConfigId,
    boardProvenance: Object.freeze({
      sourceKind: "generated",
      generatorFamily: source.generatorFamily,
      generatorVersion: source.generatorVersion
    }),
    tiles: generateBoard(source.boardConfig, rng)
  };
};

export const materializeCustomBoard = ({ boardConfig, rng }) => {
  assertRng(rng);
  if (boardConfig == null || typeof boardConfig !== "object") {
    throw new Error("boardConfig must be an object");
  }
  return {
    boardSourceId: "custom",
    boardConfigId: "custom",
    boardProvenance: Object.freeze({ sourceKind: "custom" }),
    tiles: generateBoard(boardConfig, rng)
  };
};
