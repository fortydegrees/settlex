import { describe, expect, it, vi } from "vitest";
import { setCurrentPlayerStage } from "../moves/stageControl";

describe("stage control helpers", () => {
  it("sets the active current-player stage when setActivePlayers is available", () => {
    const setActivePlayers = vi.fn();

    setCurrentPlayerStage({ events: { setActivePlayers } }, "moveRobber");

    expect(setActivePlayers).toHaveBeenCalledWith({
      currentPlayer: "moveRobber",
      others: null
    });
  });

  it("falls back to setStage for simple boardgame.io stage contexts", () => {
    const setStage = vi.fn();

    setCurrentPlayerStage({ events: { setStage } }, "postRoll");

    expect(setStage).toHaveBeenCalledWith("postRoll");
  });
});
