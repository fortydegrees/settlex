import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../../utils/seededRandom";

describe("createSeededRandom", () => {
  it("produces deterministic sequences per seed", () => {
    const randA = createSeededRandom(123);
    const randB = createSeededRandom(123);
    const randC = createSeededRandom(456);

    const seqA = [randA(), randA(), randA()];
    const seqB = [randB(), randB(), randB()];
    const seqC = [randC(), randC(), randC()];

    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });
});
