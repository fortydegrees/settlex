import { describe, it, expect, vi } from "vitest";
import { generateBoard } from "./generateBoard";
import { BalancedBoard } from "./generateBalancedBoard";
import { makeDeterministicRng } from "../testUtils";
import { ResourceType, TileTypes } from "../types";
import { resolveBoardConfig } from "./boardConfigs";
import { resolveBoardSpec } from "./boardSpecs";
import { buildSpiralOrder } from "./officialSpiral";
import type { BoardTile } from "../core/topology";

describe("board generation invariants", () => {
  const randomConfig = resolveBoardConfig("standard-random");
  const balancedConfig = resolveBoardConfig("standard-balanced");
  const randomSpec = resolveBoardSpec(randomConfig.specId);

  it("is deterministic for a fixed seed", () => {
    const rng = makeDeterministicRng(123);
    const a = generateBoard(randomConfig, rng);
    const b = generateBoard(randomConfig, makeDeterministicRng(123));
    expect(a).toEqual(b);
  });

  it("does not log balanced generation diagnostics by default", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      generateBoard(balancedConfig, makeDeterministicRng(124));
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  it("can opt into balanced generation diagnostics", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const balanced = new BalancedBoard(
      {
        desertPlacement: "Random",
        resourceDistribution: 1,
        numberDistribution: 1,
        logGenerationStats: true
      },
      makeDeterministicRng(125)
    );

    try {
      balanced.generateBoard(randomSpec);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("num boards generated:"));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Target score:"));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Board score:"));
    } finally {
      logSpy.mockRestore();
    }
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

  it("places the standard official config numbers in spiral order", () => {
    const rng = makeDeterministicRng(42);
    const baseConfig = resolveBoardConfig("standard-official");
    const config = {
      ...baseConfig,
      generation: {
        ...baseConfig.generation,
        options: { official: { startCorner: "fixed" as const } }
      }
    };
    const resolvedSpec = resolveBoardSpec(config.specId);
    const tiles = generateBoard(config, rng);

    const spiral = buildSpiralOrder(resolvedSpec.radius, 0);
    const byCoord = new Map<string, BoardTile>(
      tiles.map((t) => [t.coordinate.join(","), t])
    );
    const placed: number[] = [];

    for (const coord of spiral) {
      const tile = byCoord.get(coord.join(","));
      if (!tile || tile.tile.resource === ResourceType.DESERT) continue;
      placed.push(tile.tile.number);
    }

    expect(placed).toEqual(resolvedSpec.officialNumbers);
  });
});
