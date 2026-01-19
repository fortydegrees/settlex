import { describe, expect, it } from "vitest";
import { createEmptyState, ResourceType } from "@settlex/game-core";
import { autoDiscard, buyDevCard } from "../Moves";

const makeContext = (overrides = {}) => {
  const core = createEmptyState(["0", "1"]);
  return {
    G: {
      core,
      gameLog: [],
      gameLogSeq: 0
    },
    ctx: {
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" },
      numPlayers: 2,
      turn: 1
    },
    playerID: "0",
    random: { Number: () => 0.4, Shuffle: (arr) => arr },
    log: { setMetadata: () => {} },
    events: {
      endStage: () => {},
      setActivePlayers: () => {}
    },
    ...overrides
  };
};

describe("game log moves", () => {
  it("redacts dev card buy", () => {
    const context = makeContext();
    context.G.core.playerStateById["0"].resources = [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];

    buyDevCard.move(context);

    expect(context.G.gameLog).toHaveLength(1);
    const entry = context.G.gameLog[0];
    expect(entry.type).toBe("dev:buy");
    expect(entry.data?.cardType).toBeUndefined();
  });

  it("autoDiscard prepends forced entry", () => {
    const context = makeContext({
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "robberDiscard" },
        numPlayers: 2,
        turn: 1
      }
    });
    context.G.core.turn.pendingDiscards = ["0"];
    context.G.core.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.BRICK,
      ResourceType.BRICK
    ];

    autoDiscard.move(context);

    expect(context.G.gameLog[0].type).toBe("forced:discardSelection");
    expect(context.G.gameLog[1].type).toBe("discard");
    expect(context.G.gameLog[1].forced).toBe(true);
  });
});
