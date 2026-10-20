import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CreateGameReducer, InitializeGame } from "boardgame.io/dist/cjs/internal.js";
import { describe, expect, it } from "vitest";
import { createCatanGame } from "../../../lib/game-runtime/Game.js";
import { buildReplayFrames } from "../../../lib/server/replays/buildReplayFrames.js";
import { buildableEdges, buildableNodes } from "../index";
import {
  exportSettlexNotationArchive,
  replayHAN,
  validateHANSyntax,
  type HANRecord,
} from "../index";

const retainedRecordPath = resolve(
  __dirname,
  "../../../docs/notation/examples/settlex-complete.han.json",
);

function shortAuthoritativeArchive() {
  const game = {
    ...createCatanGame({ includeDebugMoves: false, includeEffects: false, includeServerMoves: true }),
    seed: "notation-maintained-core",
  };
  const reducer = CreateGameReducer({ game, isClient: false });
  const initialState = InitializeGame({ game, numPlayers: 3 });
  let state: any = initialState;
  const log: any[] = [];
  const move = (type: string, playerID: string, args: unknown[] = []) => {
    const action = { type: "MAKE_MOVE", payload: { type, playerID, args } };
    const before = state;
    state = reducer(state, action);
    expect(state._stateID).toBe(before._stateID + 1);
    log.push({ _stateID: before._stateID, action });
  };

  for (const player of ["0", "1", "2"]) move("readyUp", player);
  while (state.ctx.phase === "placement") {
    const player = state.ctx.currentPlayer;
    const stage = state.ctx.activePlayers[player];
    const core = state.G.core;
    if (stage === "settlement") {
      move("placeSettlement", player, [
        buildableNodes(core, state.G.coreTopology, player, { initialPlacement: true })[0],
      ]);
    } else {
      move("placeRoad", player, [
        buildableEdges(core, state.G.coreTopology, player, {
          initialPlacement: true,
          fromNodeId: core.pendingRoadFromNodeIdByPlayer[player],
        })[0],
      ]);
    }
  }
  move("rollDice", "0");
  return { initialState, log, finalState: state };
}

describe("maintained HAN notation", () => {
  it("validates retained complete HAN syntax without applying the game", () => {
    const record = JSON.parse(readFileSync(retainedRecordPath, "utf8")) as HANRecord;
    expect(() => validateHANSyntax(record)).not.toThrow();
    const malformed = { ...record, actions: ["garbage", ...record.actions.slice(1)] };
    expect(() => validateHANSyntax(malformed)).toThrow(/unsupported HAN action/);
    const dangling = { ...record, actions: ["BR"] };
    expect(() => validateHANSyntax(dangling)).toThrow(/dangling buy/);
  });
  it("replays the retained complete authoritative game to its verified result", () => {
    const record = JSON.parse(readFileSync(retainedRecordPath, "utf8")) as HANRecord;
    const states = replayHAN(record);
    expect(record.actions).toHaveLength(2542);
    expect(states[0].phase).toBe("setupSettlement");
    expect(states[states.length - 1].winner).toBe("1");
    expect(states[states.length - 1].points["1"]).toBe(10);
    expect(states[states.length - 1].phase).toBe("finished");
  });

  it("exports real source frames matching the frozen independent setup/roll record", () => {
    const archive = shortAuthoritativeArchive();
    const expected = JSON.parse(readFileSync(resolve(__dirname, "fixtures/settlex-setup-roll.expected.json"), "utf8"));
    const actual = exportSettlexNotationArchive(archive, buildReplayFrames);
    expect(actual).toEqual(expected);
    expect(actual.sourceFrames).toBe(archive.log.length + 1);
    expect(actual.record.actions.some((token: string) => /^R\([1-6]\+[1-6]\)$/.test(token))).toBe(true);
  });

  it("rejects malformed archive history and unsupported rules", () => {
    const archive = shortAuthoritativeArchive();
    const malformed = structuredClone(archive);
    delete malformed.log[0]._stateID;
    expect(() => exportSettlexNotationArchive(malformed, buildReplayFrames)).toThrow(/log state ID/);

    const unsupported = structuredClone(archive);
    unsupported.initialState.G.core.ruleset.devCardsEnabled = false;
    expect(() => exportSettlexNotationArchive(unsupported, buildReplayFrames)).toThrow(/development-card rule/);
  });

  it("does not mark a missing terminal archive as complete", () => {
    const archive = shortAuthoritativeArchive();
    const noFinal = { initialState: archive.initialState, log: archive.log };
    const result = exportSettlexNotationArchive(noFinal, buildReplayFrames);
    expect(result.record.coverage).toBe("prefix");
    expect(result.record.result).toBeNull();
  });
});
