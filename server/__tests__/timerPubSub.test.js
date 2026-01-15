import { describe, it, expect, vi } from "vitest";
import { createTimerPubSub } from "../timers/timerPubSub";

it("forwards publish payloads to TimerManager", () => {
  const manager = { onState: vi.fn(), getTimerSnapshot: vi.fn() };
  const pubSub = createTimerPubSub(manager);
  const payload = {
    type: "update",
    args: [
      "1",
      {
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "preRoll" }
        }
      }
    ]
  };

  pubSub.publish("MATCH-1", payload);

  expect(manager.onState).toHaveBeenCalledWith("1", payload.args[1], null);
  expect(manager.getTimerSnapshot).toHaveBeenCalledWith("1", payload.args[1]);
});

it("attaches timer snapshot to update payloads", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

  const manager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue({
      kind: "turn",
      remainingMs: 5000,
      totalMs: 60000,
      stageKey: "main:"
    })
  };
  const pubSub = createTimerPubSub(manager);
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const payload = {
    type: "update",
    args: [
      "1",
      {
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "preRoll" }
        }
      }
    ]
  };

  pubSub.publish("MATCH-1", payload);

  expect(received).toHaveBeenCalledTimes(1);
  const forwarded = received.mock.calls[0][0];
  expect(forwarded.args[1].timerSnapshot).toEqual({
    kind: "turn",
    remainingMs: 5000,
    totalMs: 60000,
    stageKey: "main:"
  });
  expect(forwarded.args[1].timerServerTimeMs).toBe(Date.now());

  vi.useRealTimers();
});

it("attaches timer snapshot to patch payloads", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

  const manager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue({
      kind: "stage",
      remainingMs: 2000,
      totalMs: 10000,
      stageKey: "main:postRoll"
    })
  };
  const pubSub = createTimerPubSub(manager);
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const payload = {
    type: "patch",
    args: ["1", 10, { ctx: {} }, { ctx: { phase: "main" } }]
  };

  pubSub.publish("MATCH-1", payload);

  const forwarded = received.mock.calls[0][0];
  expect(forwarded.args[3].timerSnapshot).toEqual({
    kind: "stage",
    remainingMs: 2000,
    totalMs: 10000,
    stageKey: "main:postRoll"
  });
  expect(forwarded.args[3].timerServerTimeMs).toBe(Date.now());

  vi.useRealTimers();
});
