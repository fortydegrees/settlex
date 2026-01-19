import { describe, expect, it } from "vitest";
import { resolveBoardConfig } from "./boardConfigs";
import { resolveBoardSpec } from "./boardSpecs";

describe("board config registry", () => {
  it("resolves standard official config and spec", () => {
    const config = resolveBoardConfig("standard-official");
    const spec = resolveBoardSpec(config.specId);

    expect(config.specId).toBe("standard-4p");
    expect(config.generation.numbers).toBe("official");
    expect(spec.rollNumbers().length).toBe(18);
    expect(spec.officialNumbers?.length).toBe(18);
  });
});
