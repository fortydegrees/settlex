import { describe, expect, it } from "vitest";
import {
  generateBoard,
  makeDeterministicRng,
  resolveBoardConfig
} from "@settlex/game-core";
import { DUEL_FAIR_BOARD_CATALOG } from "../gameSetup/catalogs/duelFairOfficialV1.generated";
import {
  generateDuelFairBoard,
  selectDuelFairBoard
} from "../gameSetup/duelFairBoardCatalog";

describe("duel fair runtime catalog", () => {
  it("selects the first ranked board at the lower random boundary", () => {
    expect(selectDuelFairBoard(0)).toEqual({
      catalogId: "duel-fair-official-v1",
      rank: 1,
      seed: DUEL_FAIR_BOARD_CATALOG.seeds[0],
      generatorFamily: "official-spiral",
      generatorVersion: "official-spiral-v1",
      evaluatorVersion: "duel-fair-v3",
      evaluatorIdentity: DUEL_FAIR_BOARD_CATALOG.evaluatorIdentity
    });
  });

  it("selects the last ranked board below the upper random boundary", () => {
    const selection = selectDuelFairBoard(1 - Number.EPSILON);

    expect(selection.rank).toBe(1000);
    expect(selection.seed).toBe(DUEL_FAIR_BOARD_CATALOG.seeds.at(-1));
  });

  it.each([-0.01, 1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid random value %s",
    (randomValue) => {
      expect(() => selectDuelFairBoard(randomValue)).toThrow("randomValue");
    }
  );

  it("regenerates the selected official board deterministically", () => {
    const selection = selectDuelFairBoard(0.5);

    expect(generateDuelFairBoard(selection)).toEqual(
      generateBoard(
        resolveBoardConfig("standard-official-spiral"),
        makeDeterministicRng(selection.seed)
      )
    );
    expect(generateDuelFairBoard(selection)).toEqual(generateDuelFairBoard(selection));
  });
});
