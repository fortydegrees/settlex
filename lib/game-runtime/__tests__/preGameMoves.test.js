import { describe, expect, it, vi } from "vitest";
import { autoStartGame, readyUp } from "../moves/preGameMoves";

const makeContext = (overrides = {}) => ({
  G: {
    core: {
      players: ["0", "1"]
    }
  },
  ctx: {
    playOrder: ["0", "1"]
  },
  playerID: "0",
  events: {
    endPhase: vi.fn()
  },
  ...overrides
});

describe("pre-game moves", () => {
  it("records readiness without ending the phase until all players are ready", () => {
    const context = makeContext();

    readyUp.move(context);

    expect(context.G.preGame.readyByPlayerId).toEqual({ "0": true });
    expect(context.events.endPhase).not.toHaveBeenCalled();
  });

  it("ends the pre-game phase once every player is ready", () => {
    const context = makeContext({
      G: {
        core: {
          players: ["0", "1"]
        },
        preGame: {
          readyByPlayerId: { "1": true }
        }
      }
    });

    readyUp.move(context);

    expect(context.G.preGame.readyByPlayerId).toEqual({
      "0": true,
      "1": true
    });
    expect(context.events.endPhase).toHaveBeenCalledTimes(1);
  });

  it("keeps stale ready-up protection enabled", () => {
    expect(readyUp.ignoreStaleStateID).toBe(true);
  });

  it("autoStartGame ends the phase", () => {
    const context = makeContext();

    autoStartGame.move(context);

    expect(context.events.endPhase).toHaveBeenCalledTimes(1);
  });
});
