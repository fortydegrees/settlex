import { CreateGameReducer } from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../../../app/catana/Game.js";

const cloneValue = (value) => {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
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
  reducer = defaultReducer,
} = {}) => {
  if (!initialState) {
    return [];
  }

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

    state = reducer(state, entry.action);
    frames.push({
      index: frames.length,
      state: cloneValue(state),
      logEntry: entry,
    });
  }

  return frames;
};
