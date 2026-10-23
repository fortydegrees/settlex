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
  it("returns the native worker's existing SettleHex move plan unchanged", async () => {
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
  const seats = { players: {
    "0": { name: "Ada", data: {} },
    "1": { name: "SettleGraph 009", data: { isBot: true, botKey: "settlegraph-v2" } }
  } };

  it("dispatches native moves and uses the stage auto-move when inference fails", async () => {
    const native = { chooseMoves: vi.fn()
      .mockResolvedValueOnce([{ move: "rollDice", args: [] }])
      .mockRejectedValueOnce(new Error("worker unavailable")) };
    const logger = { warn: vi.fn() };
    const manager = new BotManager({ settleGraphV2Manager: native, logger });
    manager.syncMatchBots("m1", seats);
    await expect(manager.chooseMoves(baseState(), "1", "m1"))
      .resolves.toEqual([{ move: "rollDice", args: [] }]);
    await expect(manager.chooseMoves(baseState(), "1", "m1"))
      .resolves.toEqual([{ move: "autoEndTurn", args: [] }]);
    expect(logger.warn).toHaveBeenCalledWith(
      "SettleGraph inference failed; using stage fallback",
      expect.objectContaining({ matchID: "m1", playerID: "1", error: expect.any(Error) })
    );
  });

  it("does not act for human or retired backend seats", async () => {
    const manager = new BotManager();
    manager.syncMatchBots("m1", { players: {
      ...seats.players,
      "2": { name: "Old bot", data: { isBot: true, botKey: "puffer" } }
    } });
    expect(manager.isBotPlayerForMatch("m1", "2")).toBe(false);
    await expect(manager.chooseMoves(baseState(), "0", "m1")).resolves.toEqual([]);
    await expect(manager.chooseMoves(baseState(), "2", "m1")).resolves.toEqual([]);
  });

  it("keeps readiness, serial discard ownership and forced choice recovery without a worker", async () => {
    const manager = new BotManager({ botPlayerIds: ["0", "1"] });
    const waiting = baseState({ ctx: { phase: "preGame", currentPlayer: "0", activePlayers: { all: "waiting" } } });
    await expect(manager.chooseMoves(waiting, "1"))
      .resolves.toEqual([{ move: "readyUp", args: [] }]);
    const discard = baseState();
    discard.G.core.turn.phase = "robberDiscard";
    discard.G.core.turn.pendingDiscards = ["0", "1"];
    await expect(manager.chooseMoves(discard, "1")).resolves.toEqual([]);
    await expect(manager.chooseMoves(discard, "0"))
      .resolves.toEqual([{ move: "autoDiscard", args: [] }]);
    const choice = baseState();
    choice.G.devCardPlay = { type: "monopoly", playerId: "1" };
    await expect(manager.chooseMoves(choice, "0")).resolves.toEqual([]);
    await expect(manager.chooseMoves(choice, "1"))
      .resolves.toEqual([{ move: "autoResolveDevCard", args: [] }]);
  });

  it("clears discovered seats and closes its native worker", () => {
    const native = { close: vi.fn() };
    const manager = new BotManager({ settleGraphV2Manager: native });
    manager.syncMatchBotsFromMatchData("m1", [{ id: "1", ...seats.players["1"] }]);
    expect(manager.isBotPlayerForMatch("m1", "1")).toBe(true);
    manager.deleteMatch("m1");
    expect(manager.isBotPlayerForMatch("m1", "1")).toBe(false);
    manager.close();
    expect(native.close).toHaveBeenCalledOnce();
  });
});
