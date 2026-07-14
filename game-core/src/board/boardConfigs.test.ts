import { describe, expect, it } from "vitest";
import {
  BOARD_CONFIGS,
  resolveBoardConfig,
  type BoardConfig
} from "./boardConfigs";

describe("board config registry", () => {
  it("contains only deterministic runtime configurations", () => {
    expect(Object.keys(BOARD_CONFIGS).sort()).toEqual([
      "standard-official-spiral",
      "standard-random"
    ]);
  });

  it("resolves the explicit official spiral configuration", () => {
    expect(resolveBoardConfig("standard-official-spiral")).toMatchObject({
      specId: "standard-4p",
      generation: {
        terrain: "random",
        numbers: "official",
        ports: "random"
      }
    });
  });

  it("does not allow consumers to mutate registry configs or nested options", () => {
    const config = resolveBoardConfig("standard-official-spiral");

    expect(Object.isFrozen(BOARD_CONFIGS)).toBe(true);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.generation)).toBe(true);
    expect(Object.isFrozen(config.generation.options)).toBe(true);
    expect(Object.isFrozen(config.generation.options?.official)).toBe(true);
    expect(() => {
      const hostileConsumer = config as unknown as BoardConfig;
      hostileConsumer.generation.options.official.startCorner = "fixed";
    }).toThrow(TypeError);
    expect(resolveBoardConfig("standard-official-spiral").generation.options)
      .toEqual({ official: { startCorner: "random" } });
  });
});
