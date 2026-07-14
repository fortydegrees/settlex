import type { BoardSpecId } from "./boardSpecs";

export type BoardGenerationConfig = {
  terrain: "random" | "official";
  numbers: "random" | "official";
  ports: "random";
  options?: { official?: { startCorner?: "random" | "fixed" } };
};

export type BoardRevealConfig = {
  tiles?: "start" | "turn1" | "end";
  numbers?: "start" | "turn1" | "end";
};

export type BoardConfig = {
  specId: BoardSpecId;
  generation: BoardGenerationConfig;
  reveal?: BoardRevealConfig;
};

export type BoardConfigId =
  | "standard-official-spiral"
  | "standard-random";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

const deepFreeze = <T extends object>(value: T): DeepReadonly<T> => {
  for (const child of Object.values(value)) {
    if (child != null && typeof child === "object" && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return Object.freeze(value) as DeepReadonly<T>;
};

export const BOARD_CONFIGS: DeepReadonly<Record<BoardConfigId, BoardConfig>> = deepFreeze({
  "standard-official-spiral": {
    specId: "standard-4p",
    generation: {
      terrain: "random",
      numbers: "official",
      ports: "random",
      options: { official: { startCorner: "random" } }
    }
  },
  "standard-random": {
    specId: "standard-4p",
    generation: { terrain: "random", numbers: "random", ports: "random" }
  }
});

export function resolveBoardConfig(id: BoardConfigId): DeepReadonly<BoardConfig> {
  return BOARD_CONFIGS[id];
}
