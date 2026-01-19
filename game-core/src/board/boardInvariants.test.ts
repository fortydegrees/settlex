import { describe, it, expect } from "vitest";
import { generateBoard } from "./generateBoard";
import { makeDeterministicRng } from "../testUtils";
import { ResourceType, TileTypes } from "../types";
import { resolveBoardConfig } from "./boardConfigs";
import { resolveBoardSpec } from "./boardSpecs";
import { buildSpiralOrder } from "./officialSpiral";

describe("board generation invariants", () => {
  const randomConfig = resolveBoardConfig("standard-random");
  const randomSpec = resolveBoardSpec(randomConfig.specId);

  it("is deterministic for a fixed seed", () => {
    const rng = makeDeterministicRng(123);
    const a = generateBoard(randomConfig, rng);
    const b = generateBoard(randomConfig, makeDeterministicRng(123));
    expect(a).toEqual(b);
  });

  it("matches resource counts and roll numbers from spec", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(1));
    const land = tiles.filter((tile) => tile.type === TileTypes.LAND);
    const resources = land.map((tile) => tile.tile.resource);
    const rollNumbers = land
      .filter((tile) => tile.tile.resource !== ResourceType.DESERT)
      .map((tile) => tile.tile.number as number);

    expect(resources.filter((r) => r === ResourceType.DESERT)).toHaveLength(1);
    expect(resources.filter((r) => r === ResourceType.BRICK)).toHaveLength(3);
    expect(resources.filter((r) => r === ResourceType.ORE)).toHaveLength(3);
    expect(resources.filter((r) => r === ResourceType.SHEEP)).toHaveLength(4);
    expect(resources.filter((r) => r === ResourceType.WOOD)).toHaveLength(4);
    expect(resources.filter((r) => r === ResourceType.WHEAT)).toHaveLength(4);
    expect(rollNumbers.sort((a, b) => a - b)).toEqual(
      randomSpec.rollNumbers().slice().sort((a: number, b: number) => a - b)
    );
  });

  it("creates the expected number of ports and preserves port coordinates", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(2));
    const ports = tiles.filter((tile) => tile.type === TileTypes.PORT);

    expect(ports).toHaveLength(randomSpec.ports.length);
    for (const port of randomSpec.ports) {
      const match = ports.find(
        (tile) => JSON.stringify(tile.coordinate) === JSON.stringify(port.coordinate)
      );
      expect(match).toBeTruthy();
    }
  });

  it("assigns 6 node ids and 6 edge node pairs per land tile", () => {
    const tiles = generateBoard(randomConfig, makeDeterministicRng(3));
    const land = tiles.filter((tile) => tile.type === TileTypes.LAND);

    for (const tile of land) {
      const nodes = Object.values(tile.tile.nodes ?? {});
      const edges = Object.values(tile.tile.edges ?? {});

      expect(nodes).toHaveLength(6);
      expect(edges).toHaveLength(6);
      for (const edge of edges) {
        expect(edge).toHaveLength(2);
        expect(edge[0]).not.toBeNull();
        expect(edge[1]).not.toBeNull();
      }
    }
  });

  it("places official numbers in spiral order", () => {
    const rng = makeDeterministicRng(42);
    const baseConfig = resolveBoardConfig("standard-official");
    const config = {
      ...baseConfig,
      generation: {
        ...baseConfig.generation,
        options: { official: { startCorner: "fixed" } }
      }
    };
    const resolvedSpec = resolveBoardSpec(config.specId);
    const tiles = generateBoard(config, rng);

    const spiral = buildSpiralOrder(resolvedSpec.radius, 0);
    const byCoord = new Map(tiles.map((t) => [t.coordinate.join(","), t]));
    const placed: number[] = [];

    for (const coord of spiral) {
      const tile = byCoord.get(coord.join(","));
      if (!tile || tile.tile.resource === ResourceType.DESERT) continue;
      placed.push(tile.tile.number);
    }

    expect(placed).toEqual(resolvedSpec.officialNumbers);
  });
});
