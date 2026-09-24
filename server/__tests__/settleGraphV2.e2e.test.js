import path from "node:path";
import { writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { Master } from "boardgame.io/dist/cjs/master.js";
import { InitializeGame } from "boardgame.io/dist/cjs/internal.js";
import { dispatchMatchUpdate } from "../dispatch/dispatchMatchUpdate.js";
import { buildAutoMoveAction } from "../timers/dispatchUtils.js";
import { ServerCatan } from "../serverGame.js";
import { BotManager } from "../bots/BotManager.js";
import { SETTLEGRAPH_006_MODEL_SHA256, SettleGraphV2Client } from "../bots/SettleGraphV2Client.js";
import { SettleGraphV2BotManager } from "../bots/settleGraphV2BotManager.js";

const RUN_E2E = process.env.SETTLEX_RUN_SETTLEGRAPH_V2_E2E === "1";
const MATCH_ID = "settlegraph-v2-e2e";
const E2E_GAME = {
  ...ServerCatan,
  seed: "settlegraph-v2-e2e-v1"
};

function createSyncDb() {
  const records = new Map();
  return {
    type: () => 0,
    createMatch(matchID, { initialState, metadata }) {
      records.set(matchID, { state: initialState, metadata, log: [] });
    },
    setState(matchID, state, deltalog) {
      const record = records.get(matchID);
      record.state = state;
      if (Array.isArray(deltalog)) record.log.push(...deltalog);
    },
    setMetadata(matchID, metadata) {
      records.get(matchID).metadata = metadata;
    },
    fetch(matchID, options = {}) {
      const record = records.get(matchID);
      return {
        ...(options.state ? { state: record?.state } : {}),
        ...(options.metadata ? { metadata: record?.metadata } : {}),
        ...(options.log ? { log: record?.log } : {})
      };
    }
  };
}

describe("SettleGraph sealed-runtime integration", () => {
  it.runIf(RUN_E2E)(
    "plays setup and a main-turn action through Master, router, native worker, and sealed model",
    async () => {
      const workerPath = process.env.SETTLEX_SETTLEGRAPH_V2_WORKER ??
        path.resolve("native/settlegraph-v2/target/release/settlegraph-v2-worker");
      const modelPath = process.env.SETTLEX_SETTLEGRAPH_V2_MODEL;
      const expectedModelSha256 = process.env.SETTLEX_EXPECTED_MODEL_SHA256 ?? SETTLEGRAPH_006_MODEL_SHA256;
      expect(modelPath, "SETTLEX_SETTLEGRAPH_V2_MODEL must be set").toBeTruthy();

      const metadata = {
        gameName: "catan",
        players: {
          "0": {
            id: 0,
            name: "Ada",
            credentials: "human-secret",
            data: { participantType: "human", accountId: "acct_1" }
          },
          "1": {
            id: 1,
            name: "[BOT] SettleGraph",
            credentials: "bot-secret",
            data: {
              participantType: "bot",
              isBot: true,
              botKey: "settlegraph-v2"
            }
          }
        }
      };
      const initialState = InitializeGame({
        game: E2E_GAME,
        numPlayers: 2,
        setupData: {
          modeId: "duel",
          rulesetId: "duel",
          boardSourceId: "settlegraph-v2-native-v1",
          matchKind: "bot_game",
          botKey: "settlegraph-v2"
        }
      });
      const db = createSyncDb();
      db.createMatch(MATCH_ID, { initialState, metadata });
      const publish = vi.fn();
      const serverInstance = {
        db,
        transport: { pubSub: { publish } }
      };
      const master = new Master(
        E2E_GAME,
        db,
        { send() {}, sendAll() {} }
      );
      const pufferManager = {
        syncMatchBots: vi.fn(),
        syncMatchBotsFromMatchData: vi.fn(),
        isBotPlayer: vi.fn().mockReturnValue(false),
        isBotPlayerForMatch: vi.fn().mockReturnValue(false),
        chooseMoves: vi.fn(() => {
          throw new Error("unexpected Puffer fallback");
        }),
        getFallbackMove: vi.fn(),
        deleteMatch: vi.fn(),
        close: vi.fn()
      };
      const client = new SettleGraphV2Client({
        workerPath,
        modelPath,
        timeoutMs: 10_000
      });
      const botManager = new BotManager({
        pufferManager,
        settleGraphV2Manager: new SettleGraphV2BotManager({ client })
      });
      const nativeDecisions = vi.spyOn(client, "decide");
      const logger = { error: vi.fn() };

      const state = () => db.fetch(MATCH_ID, { state: true }).state;
      const apply = async (move, args, playerID) => {
        const before = state();
        const result = await master.onUpdate(
          buildAutoMoveAction({ move, args, playerID, metadata }),
          before._stateID,
          MATCH_ID,
          playerID
        );
        expect(result?.error).toBeUndefined();
      };
      const dispatchBot = async () => {
        const beforeStateId = state()._stateID;
        await dispatchMatchUpdate({
          serverInstance,
          botManager,
          move: "autoBot",
          playerID: "1",
          matchID: MATCH_ID,
          game: E2E_GAME,
          logger
        });
        expect(state()._stateID).toBeGreaterThan(beforeStateId);
      };
      const playHumanSetupPair = async () => {
        expect(state().ctx.currentPlayer).toBe("0");
        await apply("placeSettlement", [state().G.valids.nodes[0]], "0");
        await apply("placeRoad", [state().G.valids.edges[0]], "0");
      };

      try {
        const health = await client.start();
        expect(health.modelSha256).toBe(expectedModelSha256);
        await apply("readyUp", [], "0");
        await dispatchBot();
        expect(state()).toMatchObject({
          G: { boardSourceId: "settlegraph-v2-native-v1" },
          ctx: { phase: "placement", currentPlayer: "0" }
        });

        await playHumanSetupPair();
        await dispatchBot();
        await dispatchBot();
        await dispatchBot();
        await dispatchBot();
        expect(state().ctx.currentPlayer).toBe("0");

        await playHumanSetupPair();
        expect(state().ctx.phase).toBe("main");
        expect(state().ctx.currentPlayer).toBe("0");

        await apply("rollDice", [], "0");
        await apply("endTurn", [], "0");
        expect(state().ctx.currentPlayer).toBe("1");

        const mainTurnStartStateId = state()._stateID;
        let mainTurnDispatches = 0;
        while (state().ctx.currentPlayer === "1" && mainTurnDispatches < 12) {
          await dispatchBot();
          mainTurnDispatches += 1;
        }

        expect(logger.error).not.toHaveBeenCalled();
        expect(pufferManager.chooseMoves).not.toHaveBeenCalled();
        expect(mainTurnDispatches).toBeGreaterThanOrEqual(2);
        expect(state()._stateID).toBeGreaterThan(mainTurnStartStateId);
        expect(state().ctx.currentPlayer).toBe("0");
        expect(state().G.core.playerStateById["1"].settlementsRemaining).toBeLessThanOrEqual(3);
        expect(state().G.core.playerStateById["1"].roadsRemaining).toBeLessThanOrEqual(13);
        expect(nativeDecisions.mock.calls.length).toBeGreaterThanOrEqual(5);
        const decisions = await Promise.all(nativeDecisions.mock.results.map(({ value }) => value));
        expect(decisions.every((decision) => decision.modelSha256 === expectedModelSha256)).toBe(true);
        if (process.env.SETTLEX_E2E_RECEIPT) {
          writeFileSync(process.env.SETTLEX_E2E_RECEIPT, JSON.stringify({
            passed: true, modelSha256: health.modelSha256, contract: health.contract,
            workerPath, modelPath, boardSourceId: state().G.boardSourceId,
            setupCompleted: true, mainTurnCompleted: true, mainTurnDispatches,
            finalStateId: state()._stateID, finalCurrentPlayer: state().ctx.currentPlayer,
            nativeDecisions: decisions.map(({ stateId, modelSha256, actionIds, plannedMoves }) =>
              ({ stateId, modelSha256, actionIds, plannedMoves }))
          }, null, 2) + "\n");
        }
      } finally {
        botManager.close();
      }
    },
    30_000
  );
});
