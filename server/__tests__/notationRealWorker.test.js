import { describe, expect, it } from "vitest";
import { replayHAN } from "@settlehex/game-core";
import { runLocalSettleHexGame } from "./helpers/notationGame.ts";
import { getArchivedNotation } from "../../lib/server/replays/getArchivedNotation.js";
import { archiveFinishedMatch } from "../archive/archiveFinishedMatch.js";
import { createNotationConverter } from "../archive/notation/convertNotation.js";
import { createArchivePool } from "./helpers/archiveTestUtils.js";

describe("real worker and finished archive", () => {
  it("exports a complete authoritative game and reads its persisted sidecar", async () => {
    const run = runLocalSettleHexGame({ maxMoves: 6000 });
    expect(run.archive.finalState.ctx.gameover.winnerId).toBe("0");
    const { pool, state } = createArchivePool();
    const result = await archiveFinishedMatch({
      pool,
      serverDb: { fetch: async () => ({
        metadata: { gameName: "catan", players: {} },
        initialState: run.archive.initialState,
        log: run.archive.log,
        state: run.archive.finalState,
      }) },
      matchID: "real-worker-1",
      // This checks a full-game round trip, not worker speed on shared CI CPUs.
      // Timeout handling is tested separately in notationWorker.test.js.
      convertNotation: createNotationConverter({ timeoutMs: 90_000 }),
    });
    const archivedReplay = state.archivedMatchReplays[0];
    expect({
      status: archivedReplay.notationStatus,
      errorCode: archivedReplay.notationErrorCode,
    }).toEqual({ status: "ready", errorCode: null });
    expect(state.archivedMatchReplays[0].logJson).toHaveLength(run.moves);
    const stored = await getArchivedNotation(result.replayId, { pool });
    expect(stored.status).toBe("ready");
    expect(stored.record.coverage).toBe("complete");
    expect(stored.record.result).toEqual({ winner: "1" });
    const snapshots = replayHAN(stored.record);
    expect(snapshots.at(-1).winner).toBe("1");
    expect(snapshots.at(-1).phase).toBe("finished");
  }, 120_000);
});
