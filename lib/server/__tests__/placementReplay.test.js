import { describe, expect, it } from "vitest";
import { InitializeGame, CreateGameReducer } from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../../../app/catana/Game.js";
import { buildReplayFrames } from "../replays/buildReplayFrames.js";
import fixture from "./fixtures/placementReplay.json";

// JSON archives normalize signed zero in topology coordinates. Compare that persisted representation.
const asArchived = (value) => JSON.parse(JSON.stringify(value));
const expectedG = { ...fixture.initialState.G, ...fixture.expected.G };

describe("captured seeded placement game", () => {
  it("preserves initial state, legal move results, queues and phase transition", () => {
    const game = {
      ...createCatanGame({ includeDebugMoves: false, includeEffects: true, includeServerMoves: true }),
      seed: fixture.provenance.seed
    };
    const reducer = CreateGameReducer({ game, isClient: false });
    let state = InitializeGame({ game, numPlayers: 2 });
    expect(asArchived(state.G)).toEqual(fixture.initialState.G);
    expect(state.ctx).toEqual(fixture.initialState.ctx);
    const placements = [];
    for (const entry of fixture.log.filter(entry => entry.action.type === "MAKE_MOVE")) {
      const previousID = state._stateID;
      state = reducer(state, entry.action);
      expect(state.transients?.error).toBeUndefined();
      expect(state._stateID).toBe(previousID + 1);
      const event = state.plugins.effects.data.queue.find(event => event.type === "placePiece");
      if (event) placements.push(event);
    }
    expect(placements).toEqual(fixture.expected.placements);
    expect(asArchived(state.G)).toEqual(expectedG);
    expect(state.ctx).toEqual(fixture.expected.ctx);
    expect(state._stateID).toBe(fixture.expected.stateID);
    expect(state.ctx.phase).toBe("main");
  });

  it("reconstructs the pre-extraction archive through the production replay reducer", () => {
    const archive = structuredClone(fixture);
    const frames = buildReplayFrames({
      initialState: archive.initialState,
      log: archive.log,
      finalState: { G: expectedG, ctx: archive.expected.ctx, _stateID: archive.expected.stateID }
    });
    expect(frames).toHaveLength(11);
    expect(frames.at(-1).state.G).toEqual(expectedG);
    expect(frames.at(-1).state.ctx).toEqual(fixture.expected.ctx);
    // Archive input and every prior frame stay independent of reconstruction.
    frames.at(-1).state.G.core.players.push("unexpected");
    expect(frames[0].state.G).toEqual(fixture.initialState.G);
    expect(archive).toEqual(fixture);
  });
});
