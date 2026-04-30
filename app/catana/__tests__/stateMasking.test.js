import { describe, it, expect } from "vitest";
import { Catan } from "../Game.js";

describe("Catan.playerView (state masking)", () => {
  const makeG = () => ({
    core: {
      devDeck: ["knight", "knight", "victoryPoint"],
      playerStateById: {
        "0": {
          resources: ["Wood", "Brick", "Ore"],
          devCards: ["knight"],
          devCardsBoughtThisTurn: ["roadBuilding"],
          victoryPoints: 2,
          roadsRemaining: 13,
        },
        "1": {
          resources: ["Sheep", "Wheat"],
          devCards: ["monopoly", "yearOfPlenty"],
          devCardsBoughtThisTurn: [],
          victoryPoints: 3,
          roadsRemaining: 12,
        },
      },
    },
    tiles: [],
    diceRoll: [3, 4],
    diceState: {
      mode: "balanced",
      cardsLeft: 35,
      deck: [{ totalDice: 7, dicePairs: [[3, 4]], recentlyRolledCount: 0 }],
      recentTotals: [7],
      sevensRolledByPlayer: { "0": 1, "1": 0 },
      sevenStreak: { playerId: "0", streakCount: 1 },
    },
  });

  it("player 0 sees their own full resources and devCards", () => {
    const G = makeG();
    const ctx = { gameover: undefined };
    const result = Catan.playerView({ G, ctx, playerID: "0" });

    // Player 0 sees their own full data
    expect(result.core.playerStateById["0"].resources).toEqual(["Wood", "Brick", "Ore"]);
    expect(result.core.playerStateById["0"].devCards).toEqual(["knight"]);
    expect(result.core.playerStateById["0"].devCardsBoughtThisTurn).toEqual(["roadBuilding"]);
  });

  it("player 0 sees opponent card counts but not actual cards", () => {
    const G = makeG();
    const ctx = { gameover: undefined };
    const result = Catan.playerView({ G, ctx, playerID: "0" });

    // Player 0 sees player 1's COUNTS (array length preserved)
    expect(result.core.playerStateById["1"].resources.length).toBe(2);
    expect(result.core.playerStateById["1"].devCards.length).toBe(2);

    // But the actual values are hidden
    expect(result.core.playerStateById["1"].resources).toEqual(["hidden", "hidden"]);
    expect(result.core.playerStateById["1"].devCards).toEqual(["hidden", "hidden"]);

    // Public info is still visible
    expect(result.core.playerStateById["1"].victoryPoints).toBe(3);
    expect(result.core.playerStateById["1"].roadsRemaining).toBe(12);
  });

  it("player 1 sees their own data and opponent is masked", () => {
    const G = makeG();
    const ctx = { gameover: undefined };
    const result = Catan.playerView({ G, ctx, playerID: "1" });

    // Player 1 sees their own full data
    expect(result.core.playerStateById["1"].resources).toEqual(["Sheep", "Wheat"]);
    expect(result.core.playerStateById["1"].devCards).toEqual(["monopoly", "yearOfPlenty"]);

    // Player 1 sees player 0's counts but not values
    expect(result.core.playerStateById["0"].resources.length).toBe(3);
    expect(result.core.playerStateById["0"].resources).toEqual(["hidden", "hidden", "hidden"]);
  });

  it("devDeck count is preserved but contents are hidden", () => {
    const G = makeG();
    const ctx = { gameover: undefined };
    const result = Catan.playerView({ G, ctx, playerID: "0" });

    expect(result.core.devDeck.length).toBe(3);
    expect(result.core.devDeck).toEqual(["hidden", "hidden", "hidden"]);
  });

  it("masks private balanced dice state", () => {
    const G = makeG();
    const ctx = { gameover: undefined };
    const result = Catan.playerView({ G, ctx, playerID: "0" });

    expect(result.diceState).toEqual({ mode: "balanced" });
    expect(G.diceState.cardsLeft).toBe(35);
  });

  it("does not mutate the original G", () => {
    const G = makeG();
    const ctx = { gameover: undefined };
    Catan.playerView({ G, ctx, playerID: "0" });

    // Original G should be unchanged
    expect(G.core.devDeck).toEqual(["knight", "knight", "victoryPoint"]);
    expect(G.core.playerStateById["1"].resources).toEqual(["Sheep", "Wheat"]);
  });

  it("reveals everything after gameover", () => {
    const G = makeG();
    const ctx = { gameover: { winner: "0" } };
    const result = Catan.playerView({ G, ctx, playerID: "0" });

    // Should return G unchanged (same reference)
    expect(result).toBe(G);
    expect(result.core.playerStateById["1"].resources).toEqual(["Sheep", "Wheat"]);
    expect(result.core.devDeck).toEqual(["knight", "knight", "victoryPoint"]);
  });

  it("reveals everything after core gameOver", () => {
    const G = makeG();
    G.core.gameOver = { winnerId: "0", reason: "victoryPoints" };
    const ctx = { gameover: undefined };
    const result = Catan.playerView({ G, ctx, playerID: "1" });

    expect(result).toBe(G);
    expect(result.core.playerStateById["0"].devCards).toEqual(["knight"]);
  });

  it("spectators see counts but all card values are hidden", () => {
    const G = makeG();
    const ctx = { gameover: undefined };
    const result = Catan.playerView({ G, ctx, playerID: null });

    // Both players' hands are hidden (but lengths preserved)
    expect(result.core.playerStateById["0"].resources.length).toBe(3);
    expect(result.core.playerStateById["0"].resources).toEqual(["hidden", "hidden", "hidden"]);
    expect(result.core.playerStateById["1"].resources.length).toBe(2);
    expect(result.core.playerStateById["1"].resources).toEqual(["hidden", "hidden"]);
    expect(result.core.devDeck.length).toBe(3);
  });
});
