import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Master } from "boardgame.io/dist/cjs/master.js";
import { InitializeGame } from "boardgame.io/dist/cjs/internal.js";
import { InMemory } from "boardgame.io/src/server/db/inmemory";
import { createCatanGame } from "../../lib/game-runtime/Game.js";
import { buildAutoMoveAction } from "../timers/dispatchUtils.js";
import { TimerManager } from "../timers/TimerManager.js";
import { createTimerPubSub } from "../timers/timerPubSub.js";

const MATCH_ID = "dev-card-turn-bonus";
const GAME = {
  ...createCatanGame({ includeDebugMoves: false, includeEffects: false }),
  seed: "dev-card-turn-bonus"
};

const timers = [];

function seedServer(cardType, configure = () => {}) {
  const state = structuredClone(InitializeGame({ game: GAME, numPlayers: 2 }));
  state.ctx.phase = "main";
  state.ctx.currentPlayer = "0";
  state.ctx.playOrderPos = 0;
  state.ctx.activePlayers = { "0": "postRoll" };
  state.G.core.phase = "normal";
  state.G.core.turn.phase = "postRoll";
  state.G.core.turn.currentPlayerId = "0";
  state.G.core.turn.hasRolled = true;
  state.G.core.buildingsByNodeId = { 35: { ownerId: "0", type: "settlement" } };
  const player = state.G.core.playerStateById["0"];
  player.settlementsRemaining = 4;
  if (cardType) {
    player.devCards = [cardType];
    state.G.core.devDeck.splice(state.G.core.devDeck.indexOf(cardType), 1);
  }
  configure(state.G, player);

  const metadata = {
    gameName: GAME.name,
    players: { "0": { id: 0 }, "1": { id: 1 } }
  };
  const db = new InMemory();
  db.createMatch(MATCH_ID, { initialState: state, metadata });
  const timer = new TimerManager({ dispatch() {} });
  timers.push(timer);
  const pubSub = createTimerPubSub(timer);
  const master = new Master(GAME, db, {
    send() {},
    sendAll(payload) { pubSub.publish(`MATCH-${MATCH_ID}`, payload); }
  });
  timer.onState(MATCH_ID, state);

  return {
    timer,
    state: () => db.fetch(MATCH_ID, { state: true }).state,
    log: () => db.fetch(MATCH_ID, { log: true }).log,
    move: (move, args) => master.onUpdate(
      buildAutoMoveAction({ move, args, playerID: "0", metadata }),
      db.fetch(MATCH_ID, { state: true }).state._stateID,
      MATCH_ID,
      "0"
    )
  };
}

describe("development-card turn bonus through the server", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Expected invalid-move reports come from the real reducer.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const timer of timers.splice(0)) timer.deleteMatch(MATCH_ID);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    { name: "card not held", cardType: "knight", heldCard: null },
    {
      name: "card bought this turn", cardType: "knight", heldCard: "knight",
      configure: (_G, player) => { player.devCardsBoughtThisTurn = ["knight"]; }
    },
    {
      name: "a second card in the same turn", cardType: "knight", heldCard: "knight",
      configure: (_G, player) => { player.devCardsPlayedThisTurn = 1; }
    },
    { name: "victory point card", cardType: "victoryPoint", heldCard: "victoryPoint" },
    {
      name: "Road Building with no pieces", cardType: "roadBuilding", heldCard: "roadBuilding",
      configure: (_G, player) => { player.roadsRemaining = 0; }
    },
    {
      name: "Road Building with no legal road", cardType: "roadBuilding", heldCard: "roadBuilding",
      configure: (G) => { G.core.buildingsByNodeId = {}; }
    }
  ])("rejects $name without changing state or awarding time", async ({ cardType, heldCard, configure }) => {
    const server = seedServer(heldCard, configure);
    const before = structuredClone(server.state());
    expect(server.timer.getTurnRemaining(MATCH_ID)).toBe(45000);

    await server.move("playDevCardStart", [cardType]);

    const after = server.state();
    expect(after._stateID).toBe(before._stateID);
    expect(after.G).toEqual(before.G);
    expect(after.ctx).toEqual(before.ctx);
    expect(server.log()).toEqual([]);
    expect(server.timer.getTurnRemaining(MATCH_ID)).toBe(45000);
  });

  it("awards time for a valid knight play", async () => {
    const server = seedServer("knight");

    await server.move("playDevCardStart", ["knight"]);

    expect(server.state()._stateID).toBe(1);
    expect(server.state().G.core.playerStateById["0"].devCards).toEqual([]);
    expect(server.state().G.core.playerStateById["0"].knightsPlayed).toBe(1);
    expect(server.state().ctx.activePlayers["0"]).toBe("moveRobber");
    expect(server.timer.getTurnRemaining(MATCH_ID)).toBe(55000);
  });

  it("awards one bonus for a valid choice card and none for a rejected replay", async () => {
    const server = seedServer("yearOfPlenty");

    await server.move("playDevCardStart", ["yearOfPlenty"]);
    expect(server.state().G.devCardPlay.type).toBe("yearOfPlenty");
    expect(server.timer.getTurnRemaining(MATCH_ID)).toBe(55000);
    await server.move("confirmDevCardPlay", [["Wood", "Brick"]]);
    expect(server.state().G.core.playerStateById["0"].devCards).toEqual([]);
    expect(server.state().G.core.playerStateById["0"].resources).toEqual(["Wood", "Brick"]);
    expect(server.state().ctx.activePlayers["0"]).toBe("postRoll");
    expect(server.timer.getTurnRemaining(MATCH_ID)).toBe(55000);

    const before = structuredClone(server.state());
    await server.move("playDevCardStart", ["yearOfPlenty"]);
    expect(server.state()._stateID).toBe(before._stateID);
    expect(server.state().G).toEqual(before.G);
    expect(server.timer.getTurnRemaining(MATCH_ID)).toBe(55000);
  });
});
