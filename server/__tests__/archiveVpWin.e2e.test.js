import { describe, expect, it, vi } from "vitest";
import { Master } from "boardgame.io/dist/cjs/master.js";
import { InitializeGame } from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../../app/catana/Game.js";
import { createTimerPubSub } from "../timers/timerPubSub.js";
import { ArchiveManager } from "../archive/ArchiveManager.js";
import { archiveFinishedMatch } from "../archive/archiveFinishedMatch.js";
import { buildAutoMoveAction } from "../timers/dispatchUtils.js";
import { createArchivePool } from "./helpers/archiveTestUtils.js";

const MATCH_ID = "vp-win-e2e-1";

// Minimal synchronous storage mirroring boardgame.io's InMemory semantics:
// fetch returns current refs synchronously; setState replaces state and
// appends the deltalog. This reproduces the production timing where the
// Master publishes (sendAll) before it persists (setState).
const createSyncDb = () => {
  const records = new Map();
  return {
    // boardgame.io's Sync storage type marker (Type.SYNC === 0)
    type() {
      return 0;
    },
    createMatch(matchID, { initialState, metadata }) {
      records.set(matchID, {
        state: initialState,
        initialState,
        metadata,
        log: []
      });
    },
    setState(matchID, state, deltalog) {
      const record = records.get(matchID);
      if (!record) return;
      if (Array.isArray(deltalog) && deltalog.length > 0) {
        record.log = [...record.log, ...deltalog];
      }
      record.state = state;
    },
    setMetadata(matchID, metadata) {
      const record = records.get(matchID);
      if (record) record.metadata = metadata;
    },
    fetch(matchID, opts = {}) {
      const record = records.get(matchID);
      if (!record) return {};
      const out = {};
      if (opts.state) out.state = record.state;
      if (opts.metadata) out.metadata = record.metadata;
      if (opts.initialState) out.initialState = record.initialState;
      if (opts.log) out.log = record.log;
      return out;
    },
    wipe(matchID) {
      records.delete(matchID);
    }
  };
};

const stubTimerManager = {
  onState() {},
  onMatchData() {},
  getTimerSnapshot: () => null
};

const stubPresenceManager = {
  onState() {},
  onMatchData() {},
  getSnapshot: () => null
};

describe("VP win end-to-end (Master -> pubsub -> archive)", () => {
  it("archives the terminal state, log, and winner for a victory-point win", async () => {
    const game = createCatanGame({
      includeDebugMoves: true,
      includeEffects: false,
      includeServerMoves: true
    });
    const db = createSyncDb();
    const metadata = {
      gameName: "catan",
      createdAt: 1712500000000,
      updatedAt: 1712500030000,
      players: {
        "0": {
          id: 0,
          name: "Ada",
          credentials: "cred-0",
          data: {
            participantType: "human",
            accountId: "acct_0",
            usernameSnapshot: "Ada"
          }
        },
        "1": {
          id: 1,
          name: "Grace",
          credentials: "cred-1",
          data: {
            participantType: "human",
            accountId: "acct_1",
            usernameSnapshot: "Grace"
          }
        }
      }
    };
    const initialState = InitializeGame({ game, numPlayers: 2 });
    db.createMatch(MATCH_ID, { initialState, metadata });

    const { pool, state: archiveState } = createArchivePool();
    const logger = { error: vi.fn() };
    const archiveManager = new ArchiveManager({
      archiveFinishedMatch: ({ matchID }) =>
        archiveFinishedMatch({ pool, serverDb: db, matchID }),
      logger
    });
    const pubSub = createTimerPubSub(stubTimerManager, {
      archiveManager,
      disconnectManager: stubPresenceManager,
      idleManager: stubPresenceManager
    });
    const transportAPI = {
      send() {},
      sendAll(payload) {
        pubSub.publish(`MATCH-${MATCH_ID}`, payload);
      }
    };

    const master = new Master(game, db, transportAPI);

    const wonG = structuredClone(initialState.G);
    wonG.core.gameOver = { winnerId: "0", reason: "victoryPoints" };
    const action = buildAutoMoveAction({
      move: "DEBUG_loadState",
      args: [{ G: wonG }],
      playerID: "0",
      metadata
    });

    const result = await master.onUpdate(action, 0, MATCH_ID, "0");
    expect(result?.error).toBeUndefined();
    expect(db.fetch(MATCH_ID, { state: true }).state.ctx.gameover).toMatchObject(
      { winnerId: "0" }
    );

    await vi.waitFor(() => {
      expect(archiveState.archivedMatches).toHaveLength(1);
    });
    expect(logger.error).not.toHaveBeenCalled();

    const archived = archiveState.archivedMatches[0];
    expect(archived.winnerSeatId).toBe("0");
    expect(archived.winnerAccountId).toBe("acct_0");

    const replay = archiveState.archivedMatchReplays[0];
    expect(replay.finalStateJson?.ctx?.gameover).toMatchObject({
      winnerId: "0"
    });
    expect(replay.finalStateJson?.G?.core?.gameOver).toMatchObject({
      winnerId: "0"
    });

    const loggedMoveTypes = (replay.logJson ?? []).map(
      (entry) => entry?.action?.payload?.type
    );
    expect(loggedMoveTypes).toContain("DEBUG_loadState");

    expect(archiveState.archivedMatchPlayers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seatId: "0",
          accountId: "acct_0",
          result: "win"
        }),
        expect.objectContaining({
          seatId: "1",
          result: "loss"
        })
      ])
    );
  });
});
