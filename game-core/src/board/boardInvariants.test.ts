import { describe, it, expect } from "vitest";
import { spec } from "../spec";
import { generateBoard } from "./generateBoard";
import { makeDeterministicRng } from "../testUtils";

describe("board generation invariants", () => {
  it("is deterministic for a fixed seed", () => {
    const rng = makeDeterministicRng(123);
    const a = generateBoard(spec, rng);
    const b = generateBoard(spec, makeDeterministicRng(123));
    expect(a).toEqual(b);
  });
});
