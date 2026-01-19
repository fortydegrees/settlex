import { describe, expect, it } from "vitest";
import { appendGameLog } from "../utils/gameLog";

describe("appendGameLog", () => {
  it("stamps id/turn/phase and appends", () => {
    const G = { gameLog: [], gameLogSeq: 0 };
    const ctx = { turn: 3, phase: "main" };
    appendGameLog(G, ctx, { type: "roll", actorId: "0", data: { total: 7 } });
    expect(G.gameLog).toHaveLength(1);
    expect(G.gameLog[0]).toMatchObject({
      id: 1,
      turn: 3,
      phase: "main",
      type: "roll",
      actorId: "0",
      data: { total: 7 }
    });
  });
});
