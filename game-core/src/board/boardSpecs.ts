import { spec as standard4pSpec } from "../spec";

export type BoardSpec = typeof standard4pSpec;

export type BoardSpecId = "standard-4p";

export const BOARD_SPECS: Record<BoardSpecId, BoardSpec> = {
  "standard-4p": standard4pSpec
};

export function resolveBoardSpec(id: BoardSpecId): BoardSpec {
  return BOARD_SPECS[id];
}
