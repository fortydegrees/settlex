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

describe("buildReplayFrames", () => {
  it("builds sequential replay frames from archived initial state and log", async () => {
    const buildReplayFrames = await loadBuildReplayFrames();

    const initialState = {
      G: { score: 0 },
      ctx: { phase: "main", gameover: null },
    };
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
});
