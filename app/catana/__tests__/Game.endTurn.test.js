import { describe, expect, it } from "vitest";
import { Catan } from "../../../lib/game-runtime/Game";
import { endTurn } from "../../../lib/game-runtime/moves/turnMoves";

describe("Catan config", () => {
  it("uses the core-backed endTurn move in postRoll", () => {
    expect(Catan.phases.main.turn.stages.postRoll.moves.endTurn).toBe(endTurn);
  });
});
