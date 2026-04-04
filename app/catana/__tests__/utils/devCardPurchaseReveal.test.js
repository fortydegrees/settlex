import {
  buildDevCardCounts,
  findBoughtDevCardType,
  getDevCardRevealDurations,
  getVisibleDevCardsDuringReveal,
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
      releasePop: 0.16,
      travelToCenter: 0.58,
      holdAfterTravel: 0.26,
      backReveal: 0.28,
      holdAfterBackReveal: 0.22,
      flip: 0.42,
      holdOnFace: 0.5,
      travelToHand: 0.6,
    });
  });

  it("keeps the visible hand on the pre-purchase snapshot while a pending reveal resolves", () => {
    expect(
      getVisibleDevCardsDuringReveal({
        pendingReveal: {
          playerId: "0",
          beforeCards: ["knight"],
        },
        playerId: "0",
        playerDevCards: ["knight", "monopoly"],
      })
    ).toEqual(["knight"]);
  });

  it("keeps the visible hand on the pre-purchase snapshot while the active reveal is still running", () => {
    expect(
      getVisibleDevCardsDuringReveal({
        activeReveal: {
          playerId: "0",
          beforeCards: ["roadBuilding"],
        },
        playerId: "0",
        playerDevCards: ["roadBuilding", "knight"],
      })
    ).toEqual(["roadBuilding"]);
  });
});
