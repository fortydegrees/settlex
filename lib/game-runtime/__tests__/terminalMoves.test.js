import { describe, expect, it } from "vitest";
import { resign } from "../moves/terminalMoves.js";

const buildContext = (playerID) => ({
  G: { core: { players: ["0", "1"], gameOver: null }, gameLog: [] },
  ctx: { currentPlayer: "0", turn: 3, phase: "main" },
  playerID,
  events: {}
});

describe("resign", () => {
  it("forfeits the caller even when another player's id is passed", () => {
    const context = buildContext("1");
    resign.move(context, "0");
    expect(context.G.core.gameOver).toMatchObject({ winnerId: "0" });
  });

  it("forfeits the caller when called without arguments", () => {
    const context = buildContext("1");
    resign.move(context);
    expect(context.G.core.gameOver).toMatchObject({ winnerId: "0" });
  });

  it("falls back to the current player when no playerID is present", () => {
    const context = buildContext(undefined);
    resign.move(context);
    expect(context.G.core.gameOver).toMatchObject({ winnerId: "1" });
  });
});
