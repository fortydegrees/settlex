import {
  buildDevCardCounts,
  findBoughtDevCardType,
  getDevCardRevealDurations,
  getHiddenDevCardType,
  removeDevCardFromHand,
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

  it("uses the slower staged reveal timings for normal motion", () => {
    expect(getDevCardRevealDurations()).toEqual({
      travelToCenter: 0.42,
      holdAfterTravel: 0.16,
      backReveal: 0.2,
      holdAfterBackReveal: 0.16,
      flip: 0.32,
      holdOnFace: 0.46,
      travelToHand: 0.6,
    });
  });

  it("hides the bought dev card from the hand while a pending reveal resolves", () => {
    expect(
      getHiddenDevCardType({
        pendingReveal: {
          playerId: "0",
          beforeCards: ["knight"],
        },
        playerId: "0",
        playerDevCards: ["knight", "monopoly"],
      })
    ).toBe("monopoly");
  });

  it("keeps hiding the bought dev card while the active reveal is still running", () => {
    expect(
      getHiddenDevCardType({
        activeReveal: {
          playerId: "0",
          cardType: "roadBuilding",
        },
        playerId: "0",
        playerDevCards: ["roadBuilding", "knight"],
      })
    ).toBe("roadBuilding");
  });

  it("removes only one matching dev card from the visible hand", () => {
    expect(
      removeDevCardFromHand(["knight", "roadBuilding", "knight"], "knight")
    ).toEqual(["roadBuilding", "knight"]);
  });
});
