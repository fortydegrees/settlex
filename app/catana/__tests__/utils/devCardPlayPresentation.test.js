import { describe, expect, it } from "vitest";
import {
  createKnightDisplayOverride,
  releaseKnightDisplayOverride,
  removeKnightDisplayOverride,
  upsertKnightDisplayOverride
} from "../../utils/devCardPlayPresentation";

const payload = {
  playerId: "0",
  cardType: "knight",
  previousKnightsPlayed: 2,
  nextKnightsPlayed: 3,
  previousLargestArmyOwnerId: null,
  nextLargestArmyOwnerId: "0"
};

describe("dev card play presentation helpers", () => {
  it("freezes Knight display at the pre-play values", () => {
    expect(createKnightDisplayOverride(payload)).toEqual({
      playerId: "0",
      knightsPlayed: 2,
      largestArmyOwnerId: null
    });
  });

  it("can describe the canonical post-play values", () => {
    expect(releaseKnightDisplayOverride(payload)).toEqual({
      playerId: "0",
      knightsPlayed: 3,
      largestArmyOwnerId: "0"
    });
  });

  it("upserts and removes overrides by player id", () => {
    const upserted = upsertKnightDisplayOverride({}, createKnightDisplayOverride(payload));
    expect(upserted["0"].knightsPlayed).toBe(2);
    expect(removeKnightDisplayOverride(upserted, "0")).toEqual({});
  });
});
