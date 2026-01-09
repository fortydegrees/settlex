import { EdgeId, NodeId } from "./ids";
import type { Resource, DevCardType } from "../types";
import { createStandardRuleset, type Ruleset } from "../ruleset";

export type Building = { ownerId: string; type: string };

export type PlayerState = {
  resources: Resource[];
  victoryPoints: number;
  roadsRemaining: number;
  settlementsRemaining: number;
  citiesRemaining: number;
  devCards: DevCardType[];
  devCardsBoughtThisTurn: DevCardType[];
  devCardsPlayedThisTurn: number;
  knightsPlayed: number;
};

export type BankState = {
  resources: Resource[];
};

export type TurnState = {
  phase: "preRoll" | "postRoll" | "robberDiscard" | "robberMove" | "robberSteal";
  hasRolled: boolean;
  lastRollTotal: number | null;
  pendingDiscards: string[];
  currentPlayerId: string;
};

export type GameState = {
  phase: "placement" | "normal";
  players: string[];
  buildingsByNodeId: Record<NodeId, Building>;
  roadsByEdgeId: Record<EdgeId, string>;
  pendingRoadFromNodeIdByPlayer: Record<string, NodeId | null>;
  caches: {
    buildableNodeIdsByPlayer: Record<string, NodeId[]>;
    buildableEdgeIdsByPlayer: Record<string, EdgeId[]>;
  };
  ruleset: Ruleset;
  bank: BankState;
  playerStateById: Record<string, PlayerState>;
  turn: TurnState;
  robberTileId: number | null;
  devDeck: DevCardType[];
};

function expandResources(counts: Record<Resource, number>): Resource[] {
  const resources: Resource[] = [];
  for (const [resource, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i += 1) {
      resources.push(resource as Resource);
    }
  }
  return resources;
}

export function createEmptyState(players: string[]): GameState {
  const pending: Record<string, NodeId | null> = {};
  const buildableNodes: Record<string, NodeId[]> = {};
  const buildableEdges: Record<string, EdgeId[]> = {};
  const playerStateById: Record<string, PlayerState> = {};
  const ruleset = createStandardRuleset();
  const firstPlayer = players[0] ?? "0";

  for (const p of players) {
    pending[p] = null;
    buildableNodes[p] = [];
    buildableEdges[p] = [];
    playerStateById[p] = {
      resources: [],
      victoryPoints: 0,
      roadsRemaining: ruleset.pieceLimits.roads,
      settlementsRemaining: ruleset.pieceLimits.settlements,
      citiesRemaining: ruleset.pieceLimits.cities,
      devCards: [],
      devCardsBoughtThisTurn: [],
      devCardsPlayedThisTurn: 0,
      knightsPlayed: 0
    };
  }

  return {
    phase: "placement",
    players,
    buildingsByNodeId: {},
    roadsByEdgeId: {},
    pendingRoadFromNodeIdByPlayer: pending,
    caches: {
      buildableNodeIdsByPlayer: buildableNodes,
      buildableEdgeIdsByPlayer: buildableEdges
    },
    ruleset,
    bank: { resources: expandResources(ruleset.bank.resourceCounts) },
    playerStateById,
    turn: {
      phase: "preRoll",
      hasRolled: false,
      lastRollTotal: null,
      pendingDiscards: [],
      currentPlayerId: firstPlayer
    },
    robberTileId: null,
    devDeck: []
  };
}
