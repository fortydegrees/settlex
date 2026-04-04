import {
  buildDevCardCounts,
  findBoughtDevCardType,
} from "../../utils/devCardPurchaseReveal";

describe("devCardPurchaseReveal helpers", () => {
  it("builds card counts by type", () => {
    expect(
      buildDevCardCounts(["knight", "victoryPoint", "knight"])
    ).toEqual({
      knight: 2,
      victoryPoint: 1,
    });
  });

  it("returns the newly added dev card when counts increase", () => {
    expect(
      findBoughtDevCardType({
        beforeCards: ["knight", "victoryPoint"],
        afterCards: ["knight", "victoryPoint", "roadBuilding"],
      })
    ).toBe("roadBuilding");
  });

  it("handles duplicate existing card types", () => {
    expect(
      findBoughtDevCardType({
        beforeCards: ["knight", "knight"],
        afterCards: ["knight", "knight", "knight"],
      })
    ).toBe("knight");
  });

  it("returns null when no local card was added", () => {
    expect(
      findBoughtDevCardType({
        beforeCards: ["knight"],
        afterCards: ["knight"],
      })
    ).toBeNull();
  });
});
