import { describe, it, expect } from "vitest";
import envModule from "../settlexEnv.cjs";

const { SettlexSelfPlayEnv } = envModule;

function firstLegal(mask) {
  const idx = mask.findIndex((value) => value === 1);
  if (idx === -1) {
    throw new Error("No legal actions in mask");
  }
  return idx;
}

describe("SettlexSelfPlayEnv", () => {
  it("reset starts in placement settlement mode with legal actions", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    const out = env.reset(7);

    expect(out.mode).toBe("placement_settlement");
    expect(out.done).toBe(false);
    expect(out.truncated).toBe(false);
    expect(out.actionMask.some((v) => v === 1)).toBe(true);
    expect(Array.isArray(out.observation)).toBe(true);
    expect(out.observation.length).toBeGreaterThan(0);

    env.close();
  });

  it("advances to placement road after a legal settlement", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    const reset = env.reset(11);
    const action = firstLegal(reset.actionMask);

    const next = env.step(action);
    expect(next.mode).toBe("placement_road");
    expect(next.actorId).toBe(reset.actorId);
    expect(next.done).toBe(false);

    env.close();
  });

  it("plays a full random legal episode without crashing", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 1200 });
    let out = env.reset(101);
    let guard = 0;

    while (!out.done && !out.truncated && guard < 1500) {
      const legal = firstLegal(out.actionMask);
      out = env.step(legal);
      guard += 1;
    }

    expect(guard).toBeGreaterThan(0);
    expect(out.done || out.truncated).toBe(true);

    env.close();
  });

  it("marks illegal actions and substitutes a legal move", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    const out = env.reset(99);
    const illegal = out.actionMask.findIndex((v) => v === 0);
    expect(illegal).toBeGreaterThanOrEqual(0);

    const next = env.step(illegal);
    expect(next.info.illegalAction).toBe(true);
    expect(next.done).toBe(false);

    env.close();
  });
});
