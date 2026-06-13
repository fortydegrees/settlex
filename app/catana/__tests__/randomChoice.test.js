import { describe, expect, it, vi } from "vitest";
import { pickRandom } from "../moves/randomChoice";

describe("random move choice", () => {
  it("uses boardgame.io Shuffle when available", () => {
    const random = { Shuffle: vi.fn((items) => ["c", ...items]) };

    expect(pickRandom(["a", "b"], random)).toBe("c");
    expect(random.Shuffle).toHaveBeenCalledWith(["a", "b"]);
  });

  it("uses boardgame.io Number when Shuffle is unavailable", () => {
    const random = { Number: () => 0.75 };

    expect(pickRandom(["a", "b", "c", "d"], random)).toBe("d");
  });

  it("falls back to the first item for deterministic tests", () => {
    expect(pickRandom(["a", "b"], {})).toBe("a");
  });

  it("returns null for empty choices", () => {
    expect(pickRandom([], { Number: () => 0 })).toBe(null);
  });
});
