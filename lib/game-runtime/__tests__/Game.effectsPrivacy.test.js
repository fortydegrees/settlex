import { describe, expect, it } from "vitest";
import {
  CreateGameReducer,
  InitializeGame,
  getFilterPlayerView
} from "boardgame.io/dist/cjs/internal.js";
import { ResourceType } from "@settlex/game-core";
import { createCatanGame } from "../Game";

const game = createCatanGame({ includeEffects: true, includeDebugMoves: false });
const filter = getFilterPlayerView(game);

const buyCard = (cardType) => {
  const before = structuredClone(InitializeGame({ game, numPlayers: 2 }));
  before.ctx.phase = "main";
  before.ctx.currentPlayer = "0";
  before.ctx.activePlayers = { "0": "postRoll" };
  before.G.core.phase = "normal";
  before.G.core.turn.currentPlayerId = "0";
  before.G.core.devDeck = [cardType];
  before.G.core.playerStateById["0"].resources = [
    ResourceType.SHEEP, ResourceType.WHEAT, ResourceType.ORE
  ];
  const after = CreateGameReducer({ game, isClient: false })(before, {
    type: "MAKE_MOVE",
    payload: { type: "buyDevCard", args: [], playerID: "0" }
  });
  expect(after.G.core.playerStateById["0"].devCards).toEqual([cardType]);
  return { before, after };
};

const transportState = (transport, playerID, before, after) => {
  if (transport === "sync") {
    return filter(playerID, {
      type: "sync", args: ["privacy-match", { state: after, log: after.deltalog }]
    }).args[1].state;
  }
  if (transport === "patch") {
    const previous = structuredClone(filter(playerID, {
      type: "update", args: ["privacy-match", before]
    }).args[1]);
    const patch = filter(playerID, {
      type: "patch", args: ["privacy-match", before._stateID, before, after]
    }).args[3];
    const patched = CreateGameReducer({ game, isClient: true })(previous, {
      type: "PATCH", patch
    });
    expect(patched._stateID).toBe(after._stateID);
    return patched;
  }
  return filter(playerID, { type: "update", args: ["privacy-match", after] }).args[1];
};

describe.each(["update", "sync", "patch"])("effects privacy over %s", (transport) => {
  it.each(["monopoly", "victoryPoint"])("keeps purchased %s private across viewer changes", (cardType) => {
    const { before, after } = buyCard(cardType);
    const original = structuredClone(after);
    // A public event sharing the queue must keep its payload and timeline metadata.
    after.plugins.effects.data.queue.push({
      type: "roll", payload: [3, 4], t: 0.25, endT: 1.75
    });
    original.plugins.effects.data.queue = structuredClone(after.plugins.effects.data.queue);
    for (const playerID of ["1", null, "0", undefined]) {
      const visible = transportState(transport, playerID, before, after);
      const expected = structuredClone(after.plugins.effects.data);
      if (playerID !== "0") {
        for (const event of expected.queue) {
          if (event.type === "buyDevCardReveal") delete event.payload.cardType;
        }
        expect(visible.G.core.playerStateById["0"].devCards).toEqual(["hidden"]);
      } else {
        expect(visible.G.core.playerStateById["0"].devCards).toEqual([cardType]);
      }
      expect(visible.plugins.effects.data).toEqual(expected);
      // Filtering an opponent first must never erase the buyer's reveal or archive data.
      expect(after).toEqual(original);
    }
  });
});
