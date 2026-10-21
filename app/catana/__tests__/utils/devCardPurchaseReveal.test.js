import {
  getDevCardRevealDurations,
  getVisibleDevCardsDuringReveal,
} from "../../utils/devCardPurchaseReveal";

describe("devCardPurchaseReveal helpers", () => {
  it("uses the slower staged reveal timings for normal motion", () => {
    expect(getDevCardRevealDurations()).toEqual({
      releasePop: 0.16,
      travelToCenter: 0.58,
      holdAfterTravel: 0.08,
      backReveal: 0.28,
      holdAfterBackReveal: 0.1,
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
