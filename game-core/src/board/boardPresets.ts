import { spec } from "../spec";

export type BoardPreset = typeof spec;

export type BoardPresetId = "standard-random";

export const BOARD_PRESETS: Record<BoardPresetId, BoardPreset> = {
  "standard-random": spec
};

export function resolveBoardPreset(id: BoardPresetId): BoardPreset {
  return BOARD_PRESETS[id];
}
