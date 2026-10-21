import { describe, expect, it, vi } from "vitest";
import * as ActionCreators from "boardgame.io/src/core/action-creators";
import { InMemory } from "boardgame.io/src/server/db/inmemory";
import { Master } from "boardgame.io/src/master/master";
import { ServerCatan } from "../../../server/serverGame";

const createTransport = () => ({
  send: vi.fn(),
  sendAll: vi.fn()
});

describe("pregame readyUp stale-state handling", () => {
  it("accepts the second player's stale readyUp and still starts placement", async () => {
    const transport = createTransport();
    const db = new InMemory();
    const master = new Master(ServerCatan, db, transport);

    await master.onSync("match-ready-race", "0", undefined, 2);
    await master.onSync("match-ready-race", "1", undefined, 2);

    await master.onUpdate(
      ActionCreators.makeMove("readyUp", null, "0"),
      0,
      "match-ready-race",
      "0"
    );
    await master.onUpdate(
      ActionCreators.makeMove("readyUp", null, "1"),
      0,
      "match-ready-race",
      "1"
    );

    const { state } = db.fetch("match-ready-race", { state: true });

    expect(state._stateID).toBe(2);
    expect(state.ctx.phase).toBe("placement");
    expect(state.G.preGame.readyByPlayerId).toEqual({
      "0": true,
      "1": true
    });
  });
});
