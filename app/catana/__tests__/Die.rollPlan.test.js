import { describe, expect, it } from "vitest";
import { buildDieRollPlan } from "../components/dieRollPlan";

describe("buildDieRollPlan", () => {
  it("normalizes a continuous roll animation request", () => {
    expect(
      buildDieRollPlan({
        request: { face: 6, rollMs: 1400, slowdownStartMs: 250, rollVariant: 2 }
      })
    ).toEqual({
      face: 6,
      rollMs: 1400,
      slowdownStartMs: 250,
      rollVariant: 2
    });
  });
});
