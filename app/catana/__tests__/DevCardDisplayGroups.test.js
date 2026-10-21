import { describe, it, expect } from "vitest";
import {
  getDevCardHandGroups,
  getPlayableDevCardGroups,
} from "../components/devCardDisplayUtils";

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

describe("getDevCardHandGroups", () => {
  it("includes victory points before playable development cards", () => {
    const groups = getDevCardHandGroups({
      cards: ["monopoly", "victoryPoint", "knight", "victoryPoint"],
      playableCountsByType: {
        knight: 1,
        monopoly: 1,
      },
    });

    expect(groups.map((group) => group.type)).toEqual([
      "victoryPoint",
      "knight",
      "monopoly",
    ]);
    expect(groups[0]).toMatchObject({
      type: "victoryPoint",
      count: 2,
      playableCount: 0,
      isPlayable: false,
    });
  });

  it("marks a grouped card playable only when it has playable copies", () => {
    const groups = getDevCardHandGroups({
      cards: ["knight", "knight", "yearOfPlenty"],
      playableCountsByType: {
        knight: 1,
        yearOfPlenty: 0,
      },
    });

    expect(groups.map((group) => [group.type, group.isPlayable])).toEqual([
      ["knight", true],
      ["yearOfPlenty", false],
    ]);
  });

  it("returns an empty hand for zero development cards", () => {
    expect(getDevCardHandGroups()).toEqual([]);
  });
});
