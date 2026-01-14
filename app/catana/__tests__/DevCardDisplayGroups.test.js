import { describe, it, expect } from "vitest";
import { getPlayableDevCardGroups } from "../components/devCardDisplayUtils";

describe("getPlayableDevCardGroups", () => {
  it("orders dev card groups by fixed display order", () => {
    const groups = getPlayableDevCardGroups({
      cards: ["monopoly", "knight", "yearOfPlenty", "roadBuilding", "knight"],
      playableCountsByType: {
        knight: 1,
        yearOfPlenty: 1,
        roadBuilding: 1,
        monopoly: 1,
        victoryPoint: 0
      }
    });

    expect(groups.map((group) => group.type)).toEqual([
      "knight",
      "yearOfPlenty",
      "roadBuilding",
      "monopoly"
    ]);
  });

  it("marks only the topmost copies as playable", () => {
    const groups = getPlayableDevCardGroups({
      cards: ["knight", "knight", "knight"],
      playableCountsByType: {
        knight: 2,
        yearOfPlenty: 0,
        roadBuilding: 0,
        monopoly: 0,
        victoryPoint: 0
      }
    });

    expect(groups[0].cards.map((card) => card.isPlayable)).toEqual([
      false,
      true,
      true
    ]);
  });

  it("uses stacked layout widths for grouped cards", () => {
    const groups = getPlayableDevCardGroups({
      cards: ["knight", "knight", "knight"],
      playableCountsByType: {
        knight: 1,
        yearOfPlenty: 0,
        roadBuilding: 0,
        monopoly: 0,
        victoryPoint: 0
      },
      cardWidth: 52,
      stackOffset: 16
    });

    expect(groups[0].layout.width).toBeLessThan(52 * 3);
  });

  it("honors custom badge thresholds for grouped stacks", () => {
    const groups = getPlayableDevCardGroups({
      cards: ["knight", "knight", "knight"],
      playableCountsByType: {
        knight: 1,
        yearOfPlenty: 0,
        roadBuilding: 0,
        monopoly: 0,
        victoryPoint: 0
      },
      badgeMinCount: 4
    });

    expect(groups[0].layout.showBadge).toBe(false);
  });
});
