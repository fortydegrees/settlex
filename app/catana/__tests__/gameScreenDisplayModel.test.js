import { describe, expect, it } from "vitest";
import { createEmptyState } from "@settlex/game-core";
import {
  buildGameScreenDisplayModel,
  getGameOverReasonCopy
} from "../utils/gameScreenDisplayModel";

describe("gameScreenDisplayModel", () => {
  it("merges player identity and derives screen-facing player models", () => {
    const core = createEmptyState(["0", "1", "2"]);
    core.buildingsByNodeId = {
      1: { ownerId: "0", type: "city" },
      2: { ownerId: "1", type: "settlement" },
      3: { ownerId: "2", type: "settlement" }
    };
    core.playerStateById["1"].devCards = ["victoryPoint"];
    core.awards.largestArmyOwnerId = "1";

    const model = buildGameScreenDisplayModel({
      core,
      playerID: "0",
      gameOverState: {
        winnerId: "0",
        reason: "Disconnect Forfeit"
      },
      isGameOver: true,
      matchData: [
        {
          id: "0",
          name: " Dana Prime ",
          data: { color: "green" }
        },
        {
          id: "2",
          name: "   ",
          data: { emoji: "fox", color: "orange" }
        }
      ],
      matchMetadata: [
        {
          id: "0",
          name: "[Bot] Dana",
          data: { emoji: "bot", color: "red" }
        },
        {
          id: "1",
          name: "Eli",
          data: { color: "royal" }
        }
      ]
    });

    expect(model.nameMap).toEqual({
      0: "Dana Prime",
      1: "Eli",
      2: "Player 2"
    });
    expect(model.emojiMap).toEqual({
      0: "bot",
      2: "fox"
    });
    expect(model.colorMap).toEqual({
      0: "green",
      1: "royal",
      2: "orange"
    });
    expect(model.seatPlayerIds).toEqual(["0", "1", "2"]);
    expect(model.player).toMatchObject({
      id: "0",
      color: "green",
      name: "Dana Prime",
      emoji: "bot"
    });
    expect(model.winnerName).toBe("Dana Prime");
    expect(model.isWinner).toBe(true);
    expect(model.winnerVP).toBe(2);
    expect(model.gameOverReasonText).toBe("Disconnect Forfeit");
    expect(model.postgameSummary).toEqual([
      { label: "Winner", value: "Dana Prime" },
      { label: "Reason", value: "Disconnect Forfeit" },
      { label: "Final VP", value: "2" }
    ]);
    expect(
      model.scoreboard.map(({ id, vp, isWinner }) => ({ id, vp, isWinner }))
    ).toEqual([
      { id: "1", vp: 4, isWinner: false },
      { id: "0", vp: 2, isWinner: true },
      { id: "2", vp: 1, isWinner: false }
    ]);
    expect(model.logPlayerMap["1"]).toEqual({
      name: "Eli",
      emoji: null,
      color: "royal"
    });
  });

  it("keeps game-over reason and summary formatting centralized", () => {
    expect(getGameOverReasonCopy()).toBe("Victory Points");
    expect(getGameOverReasonCopy("victoryPoints")).toBe("Victory Points");
    expect(getGameOverReasonCopy("AFK Forfeit")).toBe("AFK Forfeit");
    expect(getGameOverReasonCopy("custom")).toBe("custom");

    const model = buildGameScreenDisplayModel({
      core: createEmptyState(["0"]),
      playerID: "0",
      gameOverState: null,
      isGameOver: false,
      matchData: [],
      matchMetadata: []
    });

    expect(model.postgameSummary).toEqual([]);
    expect(model.winnerName).toBe("Unknown");
    expect(model.winnerVP).toBeNull();
  });
});
