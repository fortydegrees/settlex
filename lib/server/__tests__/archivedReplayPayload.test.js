import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { buildArchivedReplayPayload } from "../replays/buildArchivedReplayPayload.js";
import { buildReplayTimeline } from "../../../app/_features/replay/replayTimeline.js";
import { buildReplayGameScreenProps } from "../../../app/_features/replay/replayGameScreenProps.js";
import { projectHANLog } from "@settlex/game-core";
import { hydrateArchivedReplayPayload } from "../../replays/archivedReplayPayload.js";

const record = JSON.parse(readFileSync("docs/notation/examples/settlex-complete.han.json", "utf8"));
const archive = () => ({
  match: { replayId: "r1", bgioMatchId: "m1", winnerSeatId: "0", playerCount: 3 },
  participants: ["Ada", "Ben", "Cy"].map((name, index) => ({
    seatId: String(index), accountId: `account-${index}`, usernameSnapshot: name,
    avatarColorSnapshot: "sky", result: index === 0 ? "win" : "loss",
  })),
  chatMessages: [{ id: "chat-1", actorId: "0", message: "gg" }],
  notation: { status: "ready", record },
  initialState: { legacy: "initial" }, log: [{ legacy: "action" }], finalState: { legacy: "final" },
});
const fallbackFrames = [{ index: 0, state: { legacy: true } }];

describe("finished archive replay source selection", () => {
  it("prefers a valid complete record, preserving archive seats, names, chat and masking", () => {
    const source = archive();
    const buildReplayFrames = vi.fn(() => { throw new Error("broken legacy history"); });
    const compact = buildArchivedReplayPayload(source, { buildReplayFrames });
    expect(compact.record).toBe(record);
    expect(compact).not.toHaveProperty("frames");
    expect(JSON.stringify(compact).length).toBeLessThan(25000);
    const payload = hydrateArchivedReplayPayload(compact);
    expect(buildReplayFrames).not.toHaveBeenCalled();
    expect(payload.replay.source).toEqual({ kind: "notation" });
    expect(payload.replay.match).toEqual(source.match);
    expect(payload.replay.participants).toEqual(source.participants);
    expect(payload.replay.chatMessages).toEqual(source.chatMessages);
    for (const field of ["initialState", "finalState", "log", "notation"]) expect(payload.replay).not.toHaveProperty(field);
    expect(payload.frames).toHaveLength(2542);
    expect(payload.frames[1].annotation.label).toContain("Ada");
    const last = payload.frames.at(-1).state;
    expect(last.G.core.players).toEqual(["0", "1", "2"]);
    expect(last.G.core.gameOver.winnerId).toBe("0");
    expect(last.ctx.gameover.winnerId).toBe("0");
    expect(last.G.core.playerStateById["0"].victoryPoints).toBe(10);
    expect(payload.frames[0].state.G.placementOrder).toEqual(["0", "1", "2", "2", "1", "0"]);
    for (const frame of payload.frames) {
      const core = frame.state.G.core;
      expect(["0", "1", "2"]).toContain(frame.state.ctx.currentPlayer);
      expect(core.turn.currentPlayerId).toBe(frame.state.ctx.currentPlayer);
      expect(Object.keys(core.playerStateById)).toEqual(["0", "1", "2"]);
      expect(Object.keys(core.pendingRoadFromNodeIdByPlayer)).toEqual(["0", "1", "2"]);
      for (const building of Object.values(core.buildingsByNodeId)) expect(core.players).toContain(building.ownerId);
      for (const owner of Object.values(core.roadsByEdgeId)) expect(core.players).toContain(owner);
      for (const id of core.turn.pendingDiscards) expect(core.players).toContain(id);
      for (const owner of Object.values(core.awards)) if (owner != null) expect(core.players).toContain(owner);
    }
    const expectedRows = projectHANLog(record);
    const rows = last.G.gameLog;
    const seat = id => id === "system" ? id : String(Number(id) - 1);
    for (const [index, row] of expectedRows.entries()) {
      if (row.actorId != null) expect(rows[index].actorId).toBe(seat(row.actorId));
      for (const field of ["victimId", "with", "previousOwnerId", "winnerId"]) {
        if (row.data[field] != null) expect(rows[index].data[field]).toBe(seat(row.data[field]));
      }
      for (const field of ["entitledByPlayerId", "allocatedByPlayerId"]) {
        if (row.data[field]) expect(rows[index].data[field]).toEqual(
          Object.fromEntries(Object.entries(row.data[field]).map(([id, n]) => [seat(id), n]))
        );
      }
    }
    const timeline = buildReplayTimeline({ frames: payload.frames, participants: payload.replay.participants });
    const steal = timeline.events.find(event => event.logEntry?.type === "robber:steal");
    const row = steal.logEntry;
    const other = ["0", "1", "2"].find(id => id !== row.actorId && id !== row.data.victimId);
    const own = buildReplayGameScreenProps({ event: steal, perspectiveId: row.actorId, revealAllHands: false });
    const publicView = buildReplayGameScreenProps({ event: steal, perspectiveId: other, revealAllHands: false });
    expect(own.replayLogEntries.at(-1).data.resource).toBe(row.data.resource);
    expect(publicView.replayLogEntries.at(-1).data.resource).toBeUndefined();
    expect(own.credentials).toBeNull();
    expect(payload.frames[0].state.G.gameLog).toEqual([]);
    expect(source.notation.record.players).toEqual(["1", "2", "3"]);
  });

  it.each([
    ["not-recorded", { status: "not-recorded" }],
    ["unavailable", { status: "unavailable" }],
    ["invalid", { status: "ready", record: { ...record, version: 999 } }],
    ["invalid", { status: "ready", record: null }],
    ["invalid", { status: "ready", record: { ...record, actions: ["not-an-action"] } }],
    ["invalid", { status: "ready", record: { ...record, coverage: "prefix", result: null, actions: [] } }],
    ["not-recorded", undefined],
  ])("falls back for %s without forwarding the record", (reason, notation) => {
    const source = { ...archive(), notation };
    const buildReplayFrames = vi.fn().mockReturnValue(fallbackFrames);
    const result = buildArchivedReplayPayload(source, { buildReplayFrames });
    expect(result.replay.source).toEqual({ kind: "legacy", fallbackReason: reason });
    expect(result.frames).toBe(fallbackFrames);
    expect(result.replay).not.toHaveProperty("notation");
    expect(buildReplayFrames).toHaveBeenCalledWith({
      initialState: source.initialState, log: source.log, finalState: source.finalState,
    });
  });

  it("rejects record/archive identity mismatches and preserves the fallback", () => {
    for (const change of [
      { match: { ...archive().match, winnerSeatId: "1" } },
      { participants: archive().participants.slice(0, 2) },
      { participants: archive().participants.map(p => ({ ...p, seatId: "0" })) },
      { match: { ...archive().match, playerCount: 4 } },
    ]) {
      const result = buildArchivedReplayPayload({ ...archive(), ...change }, { buildReplayFrames: () => fallbackFrames });
      expect(result.replay.source).toEqual({ kind: "legacy", fallbackReason: "invalid" });
    }
  });

  it("reports failure when neither source can be replayed", () => {
    const source = { ...archive(), notation: { status: "unavailable" } };
    expect(() => buildArchivedReplayPayload(source, { buildReplayFrames: () => [] })).toThrow(/no valid frames/);
    expect(() => buildArchivedReplayPayload(source, { buildReplayFrames: () => { throw new Error("bad legacy"); } })).toThrow("bad legacy");
  });
});
