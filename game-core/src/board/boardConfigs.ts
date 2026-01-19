import type { BoardSpecId } from "./boardSpecs";

export type BoardGenerationConfig = {
  terrain: "random" | "balanced" | "official";
  numbers: "random" | "balanced" | "official";
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
  | "standard-official"
  | "standard-random"
  | "standard-balanced";

export const BOARD_CONFIGS: Record<BoardConfigId, BoardConfig> = {
  "standard-official": {
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
  },
  "standard-balanced": {
    specId: "standard-4p",
    generation: { terrain: "balanced", numbers: "balanced", ports: "random" }
  }
};

export function resolveBoardConfig(id: BoardConfigId): BoardConfig {
  return BOARD_CONFIGS[id];
}
