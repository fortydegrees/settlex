import { describe, expect, it } from "vitest";
import { Catan } from "../../app/catana/Game";
import { PufferBotManager } from "../bots/pufferBotManager";

function createRandomStub() {
  return {
    Number: () => 0.3333,
    Shuffle: (items) => [...items],
    D6: (count) => Array.from({ length: count }, () => 1)
  };
}

function createState({
  phase = "placement",
  currentPlayer = "0",
  activePlayers = { "0": "settlement" },
  turn = 1
} = {}) {
  const setupCtx = { numPlayers: 2, phase };
  const G = Catan.setup({ ctx: setupCtx, random: createRandomStub() }, {});
  const ctx = {
    numPlayers: 2,
    phase,
    currentPlayer,
    activePlayers,
    turn
  };
  return { G, ctx, _stateID: turn };
}

describe("PufferBotManager", () => {
  it("returns no actions for non-bot seats", async () => {
    const manager = new PufferBotManager({ botPlayerIds: ["1"] });
    const state = createState();

    const moves = await manager.chooseMoves(state, "0");
    expect(moves).toEqual([]);
  });

  it("uses autoDiscard fallback in robberDiscard stage", async () => {
    const manager = new PufferBotManager({ botPlayerIds: ["0"] });
    const state = createState({
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "robberDiscard" },
      turn: 4
    });
    state.G.core.phase = "normal";
    state.G.core.turn.currentPlayerId = "0";
    state.G.core.turn.phase = "robberDiscard";
    state.G.core.turn.pendingDiscards = ["0"];

    const moves = await manager.chooseMoves(state, "0");
    expect(moves).toEqual([{ move: "autoDiscard", args: [] }]);
  });

  it("chooses a legal mapped move with random fallback when no checkpoint is configured", async () => {
    const manager = new PufferBotManager({ botPlayerIds: ["0"] });
    const state = createState({
      phase: "placement",
      currentPlayer: "0",
      activePlayers: { "0": "settlement" },
      turn: 1
    });

    const moves = await manager.chooseMoves(state, "0");
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].move).toBe("placeSettlement");
  });
});
