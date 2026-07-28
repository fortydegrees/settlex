import { CreateGameReducer } from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../../../app/catana/Game.js";

const cloneValue = (value) => {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const assertReplayState = (state, label) => {
  const core = state?.G?.core;
  if (
    !isRecord(state) ||
    !isRecord(state.G) ||
    !isRecord(state.ctx) ||
    !isRecord(core) ||
    !Array.isArray(state.G.tiles) ||
    !Array.isArray(core.players) ||
    !isRecord(core.playerStateById) ||
    !isRecord(core.buildingsByNodeId) ||
    !isRecord(core.roadsByEdgeId)
  ) {
    throw new Error(`${label} is not a valid Catana replay state`);
  }
};

const defaultReducer = CreateGameReducer({
  game: createCatanGame({
    includeDebugMoves: false,
    includeEffects: false,
    includeServerMoves: true,
  }),
  isClient: false,
});

export const buildReplayFrames = ({
  initialState,
  log = [],
  finalState = null,
  reducer = defaultReducer,
} = {}) => {
  if (!initialState) {
    return [];
  }

  assertReplayState(initialState, "Initial replay state");

  const frames = [
    {
      index: 0,
      state: cloneValue(initialState),
      logEntry: null,
    },
  ];

  let state = cloneValue(initialState);

  for (const entry of Array.isArray(log) ? log : []) {
    if (!entry?.action) {
      continue;
    }

    const entryStateId = Number(entry._stateID);
    const currentStateId = Number(state?._stateID);
    if (
      Number.isFinite(entryStateId) &&
      Number.isFinite(currentStateId) &&
      entryStateId < currentStateId
    ) {
      continue;
    }

    if (
      Number.isFinite(entryStateId) &&
      Number.isFinite(currentStateId) &&
      entryStateId > currentStateId
    ) {
      throw new Error(
        `Replay log skipped state ${currentStateId}; next action expects ${entryStateId}`
      );
    }

    const nextState = reducer(state, entry.action);
    assertReplayState(nextState, "Reconstructed replay state");

    const reducerError = nextState?.transients?.error;
    if (reducerError) {
      const detail =
        reducerError.type ?? reducerError.message ?? String(reducerError);
      throw new Error(`Replay action failed: ${detail}`);
    }

    const nextStateId = Number(nextState?._stateID);
    if (
      Number.isFinite(currentStateId) &&
      Number.isFinite(nextStateId) &&
      nextStateId !== currentStateId + 1
    ) {
      throw new Error(
        `Replay action did not advance replay state from ${currentStateId}`
      );
    }

    state = nextState;
    frames.push({
      index: frames.length,
      state: cloneValue(state),
      logEntry: entry,
    });
  }

  if (finalState) {
    assertReplayState(finalState, "Archived final state");
    const reconstructedStateId = Number(state?._stateID);
    const archivedStateId = Number(finalState?._stateID);
    if (
      Number.isFinite(reconstructedStateId) &&
      Number.isFinite(archivedStateId) &&
      reconstructedStateId !== archivedStateId
    ) {
      throw new Error(
        `Replay did not reach archived final state ${archivedStateId}`
      );
    }
  }

  return frames;
};
