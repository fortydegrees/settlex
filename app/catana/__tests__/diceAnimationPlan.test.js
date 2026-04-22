import { describe, expect, it } from "vitest";
import {
  buildDiceAnimationPair,
  buildDiceAnimationRequest
} from "../components/diceAnimationPlan";

const makeRandom = (values) => {
  let index = 0;
  return () => values[index++];
};

describe("diceAnimationPlan", () => {
  it("ties each die to its assigned throw layer timing when available", () => {
    const [first, second] = buildDiceAnimationPair({
      dice: [3, 5],
      timeline: {
        rollMs: 978,
        slowdownStartMs: 334,
        layerTimings: [
          {
            delayMs: 100,
            durationMs: 398,
            slowdownStartMs: 434,
            rollMs: 832
          },
          {
            delayMs: 129,
            durationMs: 515,
            slowdownStartMs: 463,
            rollMs: 978
          }
        ]
      },
      random: makeRandom([0.1, 0.75])
    });

    expect(first).toEqual({
      face: 3,
      rollMs: 832,
      slowdownStartMs: 434,
      rollVariant: 0
    });
    expect(second).toEqual({
      face: 5,
      rollMs: 978,
      slowdownStartMs: 463,
      rollVariant: 2
    });
  });

  it("keeps a minimum landing window when the settle tail would get too short", () => {
    expect(
      buildDiceAnimationRequest({
        face: 6,
        timeline: {
          rollMs: 360,
          slowdownStartMs: 334
        },
        rollVariant: 2,
        random: makeRandom([0])
      })
    ).toEqual({
      face: 6,
      rollMs: 394,
      slowdownStartMs: 334,
      rollVariant: 2
    });
  });
});
