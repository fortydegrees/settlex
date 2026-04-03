import { describe, expect, it, vi } from "vitest";
import { dispatchMatchUpdate } from "../dispatch/dispatchMatchUpdate";

const createServerInstance = () => {
  const publish = vi.fn();
  return {
    db: {
      fetch: vi.fn()
    },
    transport: {
      pubSub: {
        publish
      }
    },
    auth: {}
  };
};

describe("dispatchMatchUpdate", () => {
  it("returns early when move is missing", async () => {
    const serverInstance = createServerInstance();

    await dispatchMatchUpdate({
      serverInstance,
      botManager: {
        syncMatchBots: vi.fn(),
        isBotPlayerForMatch: vi.fn(),
        chooseMoves: vi.fn()
      },
      move: null,
      playerID: "0",
      matchID: "m1",
      game: {},
      MasterClass: vi.fn()
    });

    expect(serverInstance.db.fetch).not.toHaveBeenCalled();
  });

  it("uses a single initial fetch and a single final sync fetch for multi-move bots", async () => {
    const serverInstance = createServerInstance();
    const state = { _stateID: 11 };
    const metadata = { players: { "0": { credentials: "c0" } } };
    serverInstance.db.fetch.mockResolvedValue({ state, metadata });

    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const MasterClass = vi.fn().mockImplementation(() => ({ onUpdate }));
    const syncMatchBots = vi.fn();
    const chooseMoves = vi.fn().mockResolvedValue([
      { move: "autoRoll", args: [] },
      { move: "autoEndTurn", args: [] }
    ]);

    await dispatchMatchUpdate({
      serverInstance,
      botManager: {
        syncMatchBots,
        isBotPlayerForMatch: () => true,
        chooseMoves
      },
      move: "autoBot",
      playerID: "0",
      matchID: "m1",
      game: { name: "catan" },
      MasterClass
    });

    expect(chooseMoves).toHaveBeenCalledWith(state, "0", "m1");
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(serverInstance.db.fetch).toHaveBeenCalledTimes(2);
  });

  it("logs and returns when master update fails", async () => {
    const serverInstance = createServerInstance();
    const state = { _stateID: 2 };
    const metadata = { players: { "0": { credentials: "c0" } } };
    serverInstance.db.fetch.mockResolvedValue({ state, metadata });

    const onUpdate = vi.fn().mockRejectedValue(new Error("boom"));
    const MasterClass = vi.fn().mockImplementation(() => ({ onUpdate }));
    const logger = { error: vi.fn() };

    await dispatchMatchUpdate({
      serverInstance,
      botManager: {
        syncMatchBots: vi.fn(),
        isBotPlayerForMatch: () => false,
        chooseMoves: vi.fn()
      },
      move: "autoRoll",
      playerID: "0",
      matchID: "m2",
      game: { name: "catan" },
      MasterClass,
      logger
    });

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("dispatches disconnect forfeits as the active player while targeting the disconnected seat", async () => {
    const serverInstance = createServerInstance();
    const state = {
      _stateID: 6,
      ctx: {
        currentPlayer: "0",
        activePlayers: { "0": "preRoll" }
      }
    };
    const metadata = {
      players: {
        "0": { credentials: "c0" },
        "1": { credentials: "c1" }
      }
    };
    serverInstance.db.fetch.mockResolvedValue({ state, metadata });

    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const MasterClass = vi.fn().mockImplementation(() => ({ onUpdate }));

    await dispatchMatchUpdate({
      serverInstance,
      botManager: {
        syncMatchBots: vi.fn(),
        isBotPlayerForMatch: () => false,
        chooseMoves: vi.fn()
      },
      move: "resolveDisconnectForfeit",
      playerID: "1",
      matchID: "m3",
      game: { name: "catan" },
      MasterClass
    });

    expect(onUpdate).toHaveBeenCalledWith(
      {
        type: "MAKE_MOVE",
        payload: {
          type: "resolveDisconnectForfeit",
          args: ["1"],
          playerID: "0",
          credentials: "c0"
        }
      },
      6,
      "m3",
      "0"
    );
  });

  it("prefers a non-null staged seat over Stage.NULL seats for targeted server moves", async () => {
    const serverInstance = createServerInstance();
    const state = {
      _stateID: 9,
      ctx: {
        currentPlayer: "1",
        activePlayers: { "0": null, "1": "postRoll" }
      }
    };
    const metadata = {
      players: {
        "0": { credentials: "c0" },
        "1": { credentials: "c1" }
      }
    };
    serverInstance.db.fetch.mockResolvedValue({ state, metadata });

    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const MasterClass = vi.fn().mockImplementation(() => ({ onUpdate }));

    await dispatchMatchUpdate({
      serverInstance,
      botManager: {
        syncMatchBots: vi.fn(),
        isBotPlayerForMatch: () => false,
        chooseMoves: vi.fn()
      },
      move: "resolveDisconnectForfeit",
      playerID: "0",
      matchID: "m4",
      game: { name: "catan" },
      MasterClass
    });

    expect(onUpdate).toHaveBeenCalledWith(
      {
        type: "MAKE_MOVE",
        payload: {
          type: "resolveDisconnectForfeit",
          args: ["0"],
          playerID: "1",
          credentials: "c1"
        }
      },
      9,
      "m4",
      "1"
    );
  });

  it("dispatches idle forfeits as the active player while targeting the idle seat", async () => {
    const serverInstance = createServerInstance();
    const state = {
      _stateID: 12,
      ctx: {
        currentPlayer: "0",
        activePlayers: { "0": "postRoll" }
      }
    };
    const metadata = {
      players: {
        "0": { credentials: "c0" },
        "1": { credentials: "c1" }
      }
    };
    serverInstance.db.fetch.mockResolvedValue({ state, metadata });

    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const MasterClass = vi.fn().mockImplementation(() => ({ onUpdate }));

    await dispatchMatchUpdate({
      serverInstance,
      botManager: {
        syncMatchBots: vi.fn(),
        isBotPlayerForMatch: () => false,
        chooseMoves: vi.fn()
      },
      move: "resolveIdleForfeit",
      playerID: "1",
      matchID: "m5",
      game: { name: "catan" },
      MasterClass
    });

    expect(onUpdate).toHaveBeenCalledWith(
      {
        type: "MAKE_MOVE",
        payload: {
          type: "resolveIdleForfeit",
          args: ["1"],
          playerID: "0",
          credentials: "c0"
        }
      },
      12,
      "m5",
      "0"
    );
  });
});
