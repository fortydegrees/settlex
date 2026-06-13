import { describe, expect, it } from "vitest";
import * as Moves from "../Moves";

describe("Moves compatibility exports", () => {
  it("re-exports split move modules for legacy imports", () => {
    expect(Moves.placeRoad).toBeDefined();
    expect(Moves.moveRobber).toBeDefined();
    expect(Moves.rollDice).toBeDefined();
    expect(Moves.buyDevCard).toBeDefined();
    expect(Moves.autoPlaceRoad).toBeDefined();
    expect(Moves.readyUp).toBeDefined();
    expect(Moves.maritimeTrade).toBeDefined();
  });
});
