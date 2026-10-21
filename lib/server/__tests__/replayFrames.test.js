import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const modulePath = path.join(repoRoot, "lib", "server", "replays", "buildReplayFrames.js");

const loadBuildReplayFrames = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href;
  const importedModule = await import(`${href}?t=${Date.now()}`);
  return importedModule.buildReplayFrames;
};

const makeReplayState = ({ stateID = 0, score = 0, moves = [] } = {}) => ({
  _stateID: stateID,
  G: {
    score,
    moves,
    tiles: [],
    core: {
      players: [],
      playerStateById: {},
      buildingsByNodeId: {},
      roadsByEdgeId: {},
    },
  },
  ctx: { phase: "main", gameover: null },
});

describe("buildReplayFrames", () => {
  it("builds sequential replay frames from archived initial state and log", async () => {
    const buildReplayFrames = await loadBuildReplayFrames();

    const initialState = makeReplayState();
    const log = [
      {
        action: {
          type: "score",
          payload: { increment: 2 },
        },
      },
      {
        action: {
          type: "score",
          payload: {
            increment: 3,
            gameover: { winner: "0" },
          },
        },
      },
    ];

    const reducer = (state, action) => ({
      ...state,
      _stateID: state._stateID + 1,
      G: {
        ...state.G,
        score: state.G.score + (action?.payload?.increment ?? 0),
      },
      ctx: {
        ...state.ctx,
        gameover: action?.payload?.gameover ?? state.ctx.gameover,
      },
    });

    const frames = buildReplayFrames({
      initialState,
      log,
      reducer,
    });

    expect(frames).toHaveLength(log.length + 1);
    expect(frames[0].state.G).toEqual(initialState.G);
    expect(frames[1].state.G.score).toBe(2);
    expect(frames.at(-1).state.ctx.gameover).toEqual({ winner: "0" });
  });

  it("skips log entries for transitions the reducer already applied", async () => {
    const buildReplayFrames = await loadBuildReplayFrames();
    const appliedActions = [];
    const reducer = (state, action) => {
      appliedActions.push(action.payload.type);
      return {
        ...state,
        _stateID: state._stateID + 1,
        G: {
          ...state.G,
          moves: [...state.G.moves, action.payload.type],
        },
      };
    };

    const frames = buildReplayFrames({
      initialState: makeReplayState(),
      log: [
        {
          _stateID: 0,
          action: { type: "MAKE_MOVE", payload: { type: "readyUp" } },
        },
        {
          _stateID: 0,
          action: { type: "GAME_EVENT", payload: { type: "endPhase" } },
        },
        {
          _stateID: 1,
          action: {
            type: "MAKE_MOVE",
            payload: { type: "placeSettlement" },
          },
        },
      ],
      reducer,
    });

    expect(appliedActions).toEqual(["readyUp", "placeSettlement"]);
    expect(frames).toHaveLength(3);
    expect(frames.at(-1).state.G.moves).toEqual([
      "readyUp",
      "placeSettlement",
    ]);
  });

  it("rejects malformed initial state before rendering", async () => {
    const buildReplayFrames = await loadBuildReplayFrames();

    expect(() =>
      buildReplayFrames({ initialState: {}, log: [], reducer: (state) => state })
    ).toThrow(/initial replay state/i);
  });

  it("rejects reducer errors and actions that do not advance state", async () => {
    const buildReplayFrames = await loadBuildReplayFrames();
    const log = [
      {
        _stateID: 0,
        action: {
          type: "MAKE_MOVE",
          payload: { type: "removedHistoricalMove" },
        },
      },
    ];

    expect(() =>
      buildReplayFrames({
        initialState: makeReplayState(),
        log,
        reducer: (state) => ({
          ...state,
          transients: {
            error: { type: "action/unavailable_move" },
          },
        }),
      })
    ).toThrow(/action\/unavailable_move/);

    expect(() =>
      buildReplayFrames({
        initialState: makeReplayState(),
        log,
        reducer: (state) => ({ ...state }),
      })
    ).toThrow(/advance replay state/i);
  });

  it("rejects reconstruction that does not reach the archived final state id", async () => {
    const buildReplayFrames = await loadBuildReplayFrames();

    expect(() =>
      buildReplayFrames({
        initialState: makeReplayState(),
        finalState: makeReplayState({ stateID: 2 }),
        log: [
          {
            _stateID: 0,
            action: { type: "MAKE_MOVE", payload: { type: "readyUp" } },
          },
        ],
        reducer: (state) => ({ ...state, _stateID: state._stateID + 1 }),
      })
    ).toThrow(/archived final state/i);
  });
});
