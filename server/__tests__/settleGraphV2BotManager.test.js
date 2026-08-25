import { describe, expect, it, vi } from "vitest";
import { BotManager } from "../bots/BotManager.js";
import { SettleGraphV2BotManager } from "../bots/settleGraphV2BotManager.js";

const baseState = (overrides = {}) => ({
  _stateID: 12,
  G: {
    core: {
      players: ["0", "1"],
      turn: {
        phase: "postRoll",
        currentPlayerId: "1",
        pendingDiscards: []
      }
    },
    devCardPlay: null
  },
  ctx: {
    phase: "main",
    currentPlayer: "1",
    activePlayers: { "1": "postRoll" },
    turn: 3
  },
  ...overrides
});

describe("SettleGraphV2BotManager", () => {
  it("returns the native worker's existing SettleX move plan unchanged", async () => {
    const client = {
      decide: vi.fn().mockResolvedValue({
        plannedMoves: [
          { move: "playDevCardStart", args: ["yearOfPlenty"] },
          { move: "confirmDevCardPlay", args: [["Wood", "Brick"]] }
        ]
      })
    };
    const manager = new SettleGraphV2BotManager({ client });
    const state = baseState();

    await expect(manager.chooseMoves(state, "1")).resolves.toEqual([
      { move: "playDevCardStart", args: ["yearOfPlenty"] },
      { move: "confirmDevCardPlay", args: [["Wood", "Brick"]] }
    ]);
    expect(client.decide).toHaveBeenCalledWith({ playerId: "1", state });
  });

  it("handles pregame readiness and interrupted split-card recovery without inference", async () => {
    const client = { decide: vi.fn() };
    const manager = new SettleGraphV2BotManager({ client });
    const waiting = baseState({
      ctx: {
        phase: "preGame",
        currentPlayer: "0",
        activePlayers: { all: "waiting" },
        turn: 1
      }
    });
    const splitCard = baseState();
    splitCard.G.devCardPlay = { type: "monopoly", playerId: "1" };

    await expect(manager.chooseMoves(waiting, "1"))
      .resolves.toEqual([{ move: "readyUp", args: [] }]);
    await expect(manager.chooseMoves(splitCard, "1"))
      .resolves.toEqual([{ move: "autoResolveDevCard", args: [] }]);
    expect(client.decide).not.toHaveBeenCalled();
  });

  it("only infers for the first serial discard actor", async () => {
    const client = {
      decide: vi.fn().mockResolvedValue({
        plannedMoves: [{ move: "discardResources", args: [["Wood", "Brick"]] }]
      })
    };
    const manager = new SettleGraphV2BotManager({ client });
    const state = baseState();
    state.G.core.turn.phase = "robberDiscard";
    state.G.core.turn.pendingDiscards = ["1", "0"];
    state.ctx.activePlayers = { "0": "robberDiscard", "1": "robberDiscard" };

    await expect(manager.chooseMoves(state, "0")).resolves.toEqual([]);
    await expect(manager.chooseMoves(state, "1")).resolves.toEqual([
      { move: "discardResources", args: [["Wood", "Brick"]] }
    ]);
    expect(client.decide).toHaveBeenCalledTimes(1);
  });

  it("rejects any worker move outside the narrow dispatch allowlist", async () => {
    const manager = new SettleGraphV2BotManager({
      client: {
        decide: vi.fn().mockResolvedValue({
          plannedMoves: [{ move: "changeVictoryPoints", args: [99] }]
        })
      }
    });

    await expect(manager.chooseMoves(baseState(), "1"))
      .rejects.toThrow("unsupported website move");
  });
});

describe("BotManager routing", () => {
  it("routes by persisted botKey and falls back to Puffer with a structured warning", async () => {
    const puffer = {
      syncMatchBots: vi.fn(),
      syncMatchBotsFromMatchData: vi.fn(),
      isBotPlayer: vi.fn().mockReturnValue(false),
      chooseMoves: vi.fn().mockResolvedValue([{ move: "autoEndTurn", args: [] }]),
      deleteMatch: vi.fn(),
      close: vi.fn()
    };
    const v2 = {
      chooseMoves: vi.fn()
        .mockResolvedValueOnce([{ move: "rollDice", args: [] }])
        .mockRejectedValueOnce(new Error("worker unavailable")),
      close: vi.fn()
    };
    const logger = { warn: vi.fn() };
    const manager = new BotManager({ pufferManager: puffer, settleGraphV2Manager: v2, logger });
    const metadata = {
      players: {
        "0": { name: "Ada", data: {} },
        "1": {
          name: "[BOT] SettleGraph V2",
          data: { isBot: true, botKey: "settlegraph-v2" }
        }
      }
    };
    manager.syncMatchBots("m1", metadata);

    await expect(manager.chooseMoves(baseState(), "1", "m1"))
      .resolves.toEqual([{ move: "rollDice", args: [] }]);
    await expect(manager.chooseMoves(baseState(), "1", "m1"))
      .resolves.toEqual([{ move: "autoEndTurn", args: [] }]);

    expect(manager.isBotPlayerForMatch("m1", "1")).toBe(true);
    expect(puffer.chooseMoves).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "SettleGraph V2 inference failed; using Puffer fallback",
      expect.objectContaining({ matchID: "m1", playerID: "1", error: expect.any(Error) })
    );
  });
});
