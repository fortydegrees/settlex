import { describe, expect, it } from "vitest";
import { findAllHighestBy, findHighestBy } from "./collections";

describe("maximum helpers", () => {
  it.each([
    { name: "negative scores", scores: [-8, -3, -5], winners: [1] },
    { name: "a score of minus one", scores: [-1], winners: [0] },
    { name: "mixed scores", scores: [-4, 3, 0], winners: [1] },
    { name: "positive scores", scores: [2, 6, 4], winners: [1] },
    { name: "zero ties", scores: [-2, 0, 0], winners: [1, 2] },
    { name: "negative ties", scores: [-3, -7, -3], winners: [0, 2] },
    { name: "lowest finite scores", scores: [-Number.MAX_VALUE, -Number.MAX_VALUE], winners: [0, 1] },
    { name: "highest finite scores", scores: [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE], winners: [0, 2] }
  ])("selects $name in traversal order", ({ scores, winners }) => {
    const items = scores.map(score => ({ score }));

    expect(findHighestBy(items, item => item.score)).toBe(items[winners[0]]);
    const allHighest = findAllHighestBy(items, item => item.score);
    expect(allHighest).toHaveLength(winners.length);
    winners.forEach((index, position) => expect(allHighest[position]).toBe(items[index]));
  });

  it("returns empty results without scoring empty input", () => {
    const score = () => { throw new Error("empty input must not be scored"); };

    expect(findHighestBy([], score)).toBeUndefined();
    expect(findAllHighestBy([], score)).toEqual([]);
  });

  it.each(["first", "all"])("finds %s maxima with one traversal and one score per element", mode => {
    const items = [{ score: -4 }, { score: -2 }, { score: -2 }, { score: -6 }];
    let traversals = 0;
    const input = {
      *[Symbol.iterator]() {
        if (++traversals > 1) throw new Error("input can only be traversed once");
        yield* items;
      }
    };
    const scored: typeof items = [];
    const score = (item: typeof items[number]) => {
      scored.push(item);
      return item.score;
    };

    if (mode === "first") {
      expect(findHighestBy(input, score)).toBe(items[1]);
    } else {
      const highest = findAllHighestBy(input, score);
      expect(highest).toHaveLength(2);
      expect(highest[0]).toBe(items[1]);
      expect(highest[1]).toBe(items[2]);
    }
    expect(traversals).toBe(1);
    expect(scored).toHaveLength(4);
    items.forEach((item, index) => expect(scored[index]).toBe(item));
  });
});
