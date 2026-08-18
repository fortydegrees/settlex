import { describe, expect, it } from "vitest";
import { shouldUseCityUpgradeReplacementAnimation } from "../../effects/placePiece";

describe("piece placement perspective", () => {
  it("uses the observational city-upgrade animation for opponents and spectators", () => {
    expect(
      shouldUseCityUpgradeReplacementAnimation({
        viewerPlayerId: "1",
        actorPlayerId: "0"
      })
    ).toBe(true);
    expect(
      shouldUseCityUpgradeReplacementAnimation({
        viewerPlayerId: null,
        actorPlayerId: "0"
      })
    ).toBe(true);
    expect(
      shouldUseCityUpgradeReplacementAnimation({
        viewerPlayerId: "0",
        actorPlayerId: "0"
      })
    ).toBe(false);
  });
});
