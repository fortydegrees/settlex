import { describe, it, expect } from "vitest";
import { spec } from "../spec";
import { generateBoard } from "./generateBoard";
import { makeDeterministicRng } from "../testUtils";
import { ResourceType, TileTypes } from "../types";

describe("board generation invariants", () => {
  it("is deterministic for a fixed seed", () => {
    const rng = makeDeterministicRng(123);
    const a = generateBoard(spec, rng);
    const b = generateBoard(spec, makeDeterministicRng(123));
    expect(a).toEqual(b);
  });

  it("matches resource counts and roll numbers from spec", () => {
    const tiles = generateBoard(spec, makeDeterministicRng(1));
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
      spec.rollNumbers().slice().sort((a: number, b: number) => a - b)
    );
  });
});
