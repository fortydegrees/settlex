import { describe, expect, it } from "vitest";
import { Catan } from "../Game";

describe("main phase endIf", () => {
  it("returns gameOver when set", () => {
    const endIf = Catan.phases.main.endIf;
    const G = { core: { gameOver: { winnerId: "0", reason: "victoryPoints" } } };

    expect(endIf({ G })).toEqual(G.core.gameOver);
  });
});
