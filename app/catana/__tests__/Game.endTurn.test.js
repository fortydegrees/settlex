import { describe, expect, it } from "vitest";
import { Catan } from "../Game";
import { endTurn } from "../moves/turnMoves";

describe("Catan config", () => {
  it("uses the core-backed endTurn move in postRoll", () => {
    expect(Catan.phases.main.turn.stages.postRoll.moves.endTurn).toBe(endTurn);
  });
});
