import { describe, it, expect, vi } from "vitest";
import { createTimerPubSub } from "../timers/timerPubSub";

it("forwards publish payloads to TimerManager", () => {
  const manager = { onState: vi.fn() };
  const pubSub = createTimerPubSub(manager);
  const payload = {
    state: {
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "preRoll" }
      }
    }
  };

  pubSub.publish("MATCH-1", payload);

  expect(manager.onState).toHaveBeenCalledWith("1", payload.state, undefined);
});
