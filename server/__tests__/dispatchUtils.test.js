import { describe, expect, it } from "vitest";
import { buildAutoMoveAction } from "../timers/dispatchUtils";

describe("buildAutoMoveAction", () => {
  it("includes player credentials when present", () => {
    const action = buildAutoMoveAction({
      move: "autoRoll",
      playerID: "0",
      metadata: {
        players: {
          "0": { credentials: "secret-0" }
        }
      }
    });

    expect(action.payload.credentials).toBe("secret-0");
  });

  it("falls back to null when credentials are missing", () => {
    const action = buildAutoMoveAction({
      move: "autoRoll",
      playerID: "0",
      metadata: null
    });

    expect(action.payload.credentials).toBeNull();
  });

  it("passes move args through to payload", () => {
    const action = buildAutoMoveAction({
      move: "moveRobber",
      playerID: "1",
      args: [42, "victim-2"],
      metadata: {
        players: {
          "1": { credentials: "secret-1" }
        }
      }
    });

    expect(action.payload.args).toEqual([42, "victim-2"]);
  });
});
