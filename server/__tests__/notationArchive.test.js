import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { archiveFinishedMatch } from "../archive/archiveFinishedMatch.js";
import { createArchivePool } from "./helpers/archiveTestUtils.js";

const completeRecord = JSON.parse(readFileSync(resolve("docs/notation/examples/settlex-complete.han.json"), "utf8"));
const live = () => ({
  metadata: { gameName: "catan", players: {} },
  initialState: { _stateID: 0, G: { rulesetId: "standard" }, ctx: {} },
  log: [{ _stateID: 0, action: { type: "MAKE_MOVE" } }],
  state: { _stateID: 1, G: {}, ctx: { gameover: { winnerId: "0" } } },
});

describe("archived notation sidecar", () => {
  it("stores a complete result atomically with the native source, before opening SQL", async () => {
    const { pool, state } = createArchivePool();
    const source = live();
    const convertNotation = vi.fn(async (slice) => {
      expect(pool.connect).not.toHaveBeenCalled();
      expect(slice).toEqual({ initialState: source.initialState, log: source.log, finalState: source.state });
      return { status: "ready", record: completeRecord };
    });
    const result = await archiveFinishedMatch({ pool, serverDb: { fetch: async () => source }, matchID: "ready-1", convertNotation });
    expect(result.archived).toBe(true);
    expect(state.archivedMatchReplays[0]).toMatchObject({
      initialStateJson: source.initialState, logJson: source.log, finalStateJson: source.state,
      notationStatus: "ready", notationJson: completeRecord, notationErrorCode: null,
    });
    const duplicate = await archiveFinishedMatch({ pool, serverDb: { fetch: async () => source }, matchID: "ready-1", convertNotation });
    expect(duplicate).toEqual({ archived: false, archivedMatchId: result.archivedMatchId });
    expect(state.archivedMatchReplays).toHaveLength(1);
  });

  it("archives native source when conversion throws or produces a prefix", async () => {
    for (const [name, convertNotation] of [
      ["throw", async () => { throw new Error("sensitive source detail"); }],
      ["prefix", async () => ({ status: "ready", record: { ...completeRecord, coverage: "prefix", result: null } })],
    ]) {
      const { pool, state } = createArchivePool();
      await archiveFinishedMatch({ pool, serverDb: { fetch: async () => live() }, matchID: name, convertNotation });
      expect(state.archivedMatchReplays[0].notationStatus).toBe("unavailable");
      expect(state.archivedMatchReplays[0].notationJson).toBeNull();
      expect(state.archivedMatchReplays[0].notationErrorCode).toMatch(/^[a-z-]{1,40}$/);
      expect(state.archivedMatchReplays[0].notationErrorCode).not.toContain("sensitive");
      expect(state.archivedMatchReplays[0].initialStateJson).toEqual(live().initialState);
    }
  });

  it("retains unsupported forfeit and missing history with unavailable notation", async () => {
    for (const source of [
      { ...live(), state: { ...live().state, ctx: { gameover: { winnerId: "0", reason: "forfeit" } } } },
      { ...live(), log: null },
    ]) {
      const { pool, state } = createArchivePool();
      await archiveFinishedMatch({ pool, serverDb: { fetch: async () => source }, matchID: `unsupported-${source.log == null}` });
      expect(state.archivedMatches).toHaveLength(1);
      expect(state.archivedMatchReplays[0].notationStatus).toBe("unavailable");
      expect(state.archivedMatchReplays[0].notationJson).toBeNull();
      expect(state.archivedMatchReplays[0].finalStateJson).toEqual(source.state);
    }
  });

  it("rolls back a ready sidecar with the native archive when the transaction fails", async () => {
    const { pool, state } = createArchivePool({ failAfterArchivedMatchInsert: true });
    await expect(archiveFinishedMatch({
      pool, serverDb: { fetch: async () => live() }, matchID: "rollback-ready",
      convertNotation: async () => ({ status: "ready", record: completeRecord }),
    })).rejects.toThrow(/injected failure/);
    expect(state.archivedMatches).toEqual([]);
    expect(state.archivedMatchReplays).toEqual([]);
  });

  it("keeps native rows when a claimed ready record has invalid tokens or cannot serialize", async () => {
    const invalidAction = { ...completeRecord, actions: ["garbage", ...completeRecord.actions.slice(1)] };
    const withBigInt = { ...completeRecord, extra: 1n };
    const cyclic = { ...completeRecord }; cyclic.self = cyclic;
    for (const [name, record, expectedCode] of [
      ["invalid-token", invalidAction, "invalid-source"],
      ["bigint", withBigInt, "serialization"],
      ["cycle", cyclic, "serialization"],
    ]) {
      const { pool, state } = createArchivePool();
      const result = await archiveFinishedMatch({ pool, serverDb: { fetch: async () => live() }, matchID: name,
        convertNotation: async () => ({ status: "ready", record }) });
      expect(result.archived).toBe(true);
      expect(state.archivedMatchReplays[0].notationStatus).toBe("unavailable");
      expect(state.archivedMatchReplays[0].notationErrorCode).toBe(expectedCode);
      expect(state.archivedMatchReplays[0].notationJson).toBeNull();
      expect(state.archivedMatchReplays[0].finalStateJson).toEqual(live().state);
    }
  });
});
