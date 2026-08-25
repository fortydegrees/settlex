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

const SETTLEGRAPH_V2_PORT_PROJECTION_ID = "settlegraph-v2-native-ports-v1";

const SETTLEGRAPH_V2_PORT_LAYOUT = Object.freeze([
  Object.freeze({ coordinate: [1, 2, -3], direction: "NORTHEAST", nodes: [35, 36] }),
  Object.freeze({ coordinate: [2, 1, -3], direction: "NORTHWEST", nodes: [46, 52] }),
  Object.freeze({ coordinate: [3, -1, -2], direction: "NORTHEAST", nodes: [50, 51] }),
  Object.freeze({ coordinate: [3, -3, 0], direction: "EAST", nodes: [48, 49] }),
  Object.freeze({ coordinate: [1, -3, 2], direction: "SOUTHEAST", nodes: [40, 26] }),
  Object.freeze({ coordinate: [-1, -2, 3], direction: "SOUTHWEST", nodes: [16, 28] }),
  Object.freeze({ coordinate: [-2, -1, 3], direction: "SOUTHEAST", nodes: [2, 3] }),
  Object.freeze({ coordinate: [-3, 1, 2], direction: "SOUTHWEST", nodes: [5, 8] }),
  Object.freeze({ coordinate: [-3, 3, 0], direction: "WEST", nodes: [12, 13] })
]);

const projectSettleGraphV2Ports = (tiles) => {
  const ports = tiles.filter(({ type }) => type === "Port");
  if (ports.length !== SETTLEGRAPH_V2_PORT_LAYOUT.length) {
    throw new Error(
      `SettleGraph V2 requires ${SETTLEGRAPH_V2_PORT_LAYOUT.length} ports; received ${ports.length}`
    );
  }
  let portIndex = 0;
  return tiles.map((entry) => {
    if (entry.type !== "Port") return entry;
    const layout = SETTLEGRAPH_V2_PORT_LAYOUT[portIndex];
    portIndex += 1;
    return {
      ...entry,
      coordinate: [...layout.coordinate],
      tile: {
        ...entry.tile,
        direction: layout.direction,
        nodes: [...layout.nodes]
      }
    };
  });
};

export const BOARD_SOURCES = Object.freeze({
  [BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1]: Object.freeze({
    id: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1,
    kind: "catalog",
    boardConfigId: DUEL_FAIR_BOARD_CATALOG.boardConfigId,
    boardConfig: resolveBoardConfig(DUEL_FAIR_BOARD_CATALOG.boardConfigId),
    catalog: DUEL_FAIR_BOARD_CATALOG
  }),
  [BOARD_SOURCE_IDS.SETTLEGRAPH_V2_NATIVE_V1]: Object.freeze({
    id: BOARD_SOURCE_IDS.SETTLEGRAPH_V2_NATIVE_V1,
    kind: "catalog-projection",
    boardConfigId: DUEL_FAIR_BOARD_CATALOG.boardConfigId,
    boardConfig: resolveBoardConfig(DUEL_FAIR_BOARD_CATALOG.boardConfigId),
    catalog: DUEL_FAIR_BOARD_CATALOG,
    projectionId: SETTLEGRAPH_V2_PORT_PROJECTION_ID
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

  if (source.kind === "catalog" || source.kind === "catalog-projection") {
    const { index, seed } = selectCatalogEntry({
      randomValue: rng(),
      seeds: source.catalog.seeds
    });
    const provenance = {
      sourceKind: "catalog",
      catalogId: source.catalog.id,
      catalogRank: index + 1,
      seed,
      generatorFamily: source.catalog.generatorFamily,
      generatorVersion: source.catalog.generatorVersion,
      evaluatorVersion: source.catalog.evaluatorVersion,
      evaluatorIdentity: source.catalog.evaluatorIdentity
    };
    const generatedTiles = generateBoard(source.boardConfig, makeDeterministicRng(seed));
    return {
      boardSourceId: source.id,
      boardConfigId: source.boardConfigId,
      boardProvenance: Object.freeze(
        source.projectionId
          ? { ...provenance, projectionId: source.projectionId }
          : provenance
      ),
      tiles: source.projectionId
        ? projectSettleGraphV2Ports(generatedTiles)
        : generatedTiles
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
