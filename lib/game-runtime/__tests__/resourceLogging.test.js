import { describe, expect, it } from "vitest";
import {
  logResourceDistributions,
  logResourceShortages
} from "../moves/resourceLogging";

describe("resource logging", () => {
  it("groups resource distributions by player in stable player order", () => {
    const G = { gameLog: [], gameLogSeq: 0 };

    logResourceDistributions(
      G,
      { turn: 3 },
      [
        { playerId: "1", resource: "Wood" },
        { playerId: "0", resource: "Brick" },
        { playerId: "1", resource: "Wood" },
        { playerId: "0", resource: "Sheep" },
        { playerId: "2", resource: null }
      ],
      { forced: true }
    );

    expect(G.gameLog).toEqual([
      expect.objectContaining({
        type: "resource:gain",
        actorId: "0",
        data: { resources: { Brick: 1, Sheep: 1 } },
        forced: true
      }),
      expect.objectContaining({
        type: "resource:gain",
        actorId: "1",
        data: { resources: { Wood: 2 } },
        forced: true
      })
    ]);
  });

  it("logs only concrete resource shortages", () => {
    const G = { gameLog: [], gameLogSeq: 0 };

    logResourceShortages(
      G,
      { turn: 4 },
      [
        { resource: "Ore", requested: 2, available: 0 },
        { requested: 1, available: 0 }
      ],
      { forced: true }
    );

    expect(G.gameLog).toEqual([
      expect.objectContaining({
        type: "resource:shortage",
        data: { resource: "Ore", requested: 2, available: 0 },
        forced: true
      })
    ]);
  });
});
