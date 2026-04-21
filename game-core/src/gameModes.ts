import type { BoardConfigId } from "./board/boardConfigs";
import type { RulesetId } from "./ruleset";

export type GameModeId = "duel" | "standard-3p" | "standard-4p";

export type GameMode = {
  id: GameModeId;
  numPlayers: number;
  rulesetId: RulesetId;
  boardConfigId: BoardConfigId;
};

export const GAME_MODES: Record<GameModeId, GameMode> = {
  duel: {
    id: "duel",
    numPlayers: 2,
    rulesetId: "duel",
    boardConfigId: "standard-balanced"
  },
  "standard-3p": {
    id: "standard-3p",
    numPlayers: 3,
    rulesetId: "standard",
    boardConfigId: "standard-official"
  },
  "standard-4p": {
    id: "standard-4p",
    numPlayers: 4,
    rulesetId: "standard",
    boardConfigId: "standard-official"
  }
};

export function resolveGameMode(id: string): GameMode {
  const mode = GAME_MODES[id as GameModeId];
  if (!mode) {
    throw new Error(`Unknown game mode: ${id}`);
  }
  return mode;
}

export function resolveDefaultGameModeId(numPlayers: number): GameModeId {
  if (numPlayers === 2) return "duel";
  if (numPlayers === 3) return "standard-3p";
  return "standard-4p";
}
