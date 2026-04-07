import type { Resource } from "../types";
import { TileTypes } from "../types";
import type { BoardTopology } from "../core/topology";
import type { GameState } from "../core/state";
import { getPublicVictoryPoints } from "./victory";

export function playersNeedingDiscard(state: GameState): string[] {
  return state.players.filter(
    (playerId) =>
      (state.playerStateById[playerId]?.resources.length ?? 0) >
      state.ruleset.discardLimit
  );
}

function removeCardOnce(cards: Resource[], card: Resource): boolean {
  const index = cards.indexOf(card);
  if (index === -1) {
    return false;
  }
  cards.splice(index, 1);
  return true;
}

export function applyDiscard(
  state: GameState,
  playerId: string,
  resources: Resource[]
): { ok: true } | { ok: false; error: string } {
  if (!state.turn.pendingDiscards.includes(playerId)) {
    return { ok: false, error: "discard-not-pending" };
  }

  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }

  const requiredCount = Math.floor(player.resources.length / 2);
  if (resources.length !== requiredCount) {
    return { ok: false, error: "invalid-discard-count" };
  }

  for (const resource of resources) {
    if (!removeCardOnce(player.resources, resource)) {
      return { ok: false, error: "missing-resource" };
    }
  }

  state.turn.pendingDiscards = state.turn.pendingDiscards.filter(
    (id) => id !== playerId
  );

  if (state.turn.pendingDiscards.length === 0) {
    state.turn.phase = "robberMove";
  }

  return { ok: true };
}

export type Distribution = {
  tileId: number;
  playerId: string;
  resource: Resource;
};

export type DistributionShortage = {
  resource: Resource;
  required: number;
  available: number;
  entitledByPlayerId: Record<string, number>;
  allocatedByPlayerId: Record<string, number>;
};

export type DistributionResult =
  | {
      ok: true;
      distributions: Distribution[];
      blockedTiles: number[];
      shortages: DistributionShortage[];
    }
  | { ok: false; error: string };

export function applyResourceDistribution(
  state: GameState,
  board: BoardTopology,
  rollTotal: number
): DistributionResult {
  if (rollTotal === 7) {
    return { ok: true, distributions: [], blockedTiles: [], shortages: [] };
  }

  const requiredByResource: Record<string, number> = {};
  const claimantsByResource: Record<string, Set<string>> = {};
  const entitledByPlayerIdByResource: Record<string, Record<string, number>> = {};
  const allocations: Record<string, Resource[]> = {};
  const distributions: Distribution[] = [];
  const blockedTiles: number[] = [];
  const shortages: DistributionShortage[] = [];

  for (const playerId of state.players) {
    allocations[playerId] = [];
  }

  for (const tile of board.tiles) {
    if (tile.tile.number !== rollTotal) {
      continue;
    }

    // Check if robber blocks this tile
    if (state.robberTileId !== null && tile.tile.id === state.robberTileId) {
      // Track blocked tile only if it would have produced
      const nodes = tile.tile.nodes ?? {};
      const hasBuildings = Object.values(nodes).some(
        (nodeId) => state.buildingsByNodeId[nodeId]
      );
      if (hasBuildings && tile.tile.resource) {
        blockedTiles.push(tile.tile.id);
      }
      continue;
    }

    if (!tile.tile.resource) {
      continue;
    }

    const resource = tile.tile.resource as Resource;
    const nodes = tile.tile.nodes ?? {};
    for (const nodeId of Object.values(nodes)) {
      const building = state.buildingsByNodeId[nodeId];
      if (!building) {
        continue;
      }
      const owner = building.ownerId;
      const amount = building.type === "city" ? 2 : 1;
      claimantsByResource[resource] ??= new Set<string>();
      claimantsByResource[resource].add(owner);
      entitledByPlayerIdByResource[resource] ??= {};
      entitledByPlayerIdByResource[resource][owner] =
        (entitledByPlayerIdByResource[resource][owner] ?? 0) + amount;
      for (let i = 0; i < amount; i += 1) {
        allocations[owner].push(resource);
        distributions.push({
          tileId: tile.tile.id,
          playerId: owner,
          resource,
        });
      }
      requiredByResource[resource] = (requiredByResource[resource] ?? 0) + amount;
    }
  }

  if (state.ruleset.bank.finite) {
    const stripResource = (resource: Resource) => {
      for (const playerId of Object.keys(allocations)) {
        allocations[playerId] = allocations[playerId].filter((r) => r !== resource);
      }
      for (let i = distributions.length - 1; i >= 0; i -= 1) {
        if (distributions[i].resource === resource) {
          distributions.splice(i, 1);
        }
      }
    };

    for (const [resource, required] of Object.entries(requiredByResource)) {
      const available = state.bank.resources.filter((r) => r === resource).length;
      if (required > available) {
        const resTyped = resource as Resource;
        const claimants = Array.from(claimantsByResource[resource] ?? []);
        const entitledByPlayerId = {
          ...(entitledByPlayerIdByResource[resource] ?? {})
        };

        if (claimants.length !== 1 || available === 0) {
          stripResource(resTyped);
          shortages.push({
            resource: resTyped,
            required,
            available,
            entitledByPlayerId,
            allocatedByPlayerId: {}
          });
          continue;
        }

        const claimantId = claimants[0];
        let keptAllocations = 0;
        allocations[claimantId] = allocations[claimantId].filter((r) => {
          if (r !== resTyped) {
            return true;
          }
          if (keptAllocations < available) {
            keptAllocations += 1;
            return true;
          }
          return false;
        });

        for (const playerId of Object.keys(allocations)) {
          if (playerId === claimantId) {
            continue;
          }
          allocations[playerId] = allocations[playerId].filter(
            (r) => r !== resTyped
          );
        }

        let keptDistributions = 0;
        for (let i = distributions.length - 1; i >= 0; i -= 1) {
          const distribution = distributions[i];
          if (distribution.resource !== resTyped) {
            continue;
          }
          if (
            distribution.playerId === claimantId &&
            keptDistributions < available
          ) {
            keptDistributions += 1;
            continue;
          }
          distributions.splice(i, 1);
        }

        shortages.push({
          resource: resTyped,
          required,
          available,
          entitledByPlayerId,
          allocatedByPlayerId: available > 0 ? { [claimantId]: available } : {}
        });
      }
    }
  }

  for (const [playerId, resources] of Object.entries(allocations)) {
    const player = state.playerStateById[playerId];
    if (!player) {
      continue;
    }
    for (const resource of resources) {
      player.resources.push(resource);
      if (state.ruleset.bank.finite) {
        removeCardOnce(state.bank.resources, resource);
      }
    }
  }

  return { ok: true, distributions, blockedTiles, shortages };
}

export function canPlaceRobber(
  state: GameState,
  board: BoardTopology,
  tileId: number
): boolean {
  const tile = board.tiles.find((t) => t.tile.id === tileId);
  if (!tile) {
    return false;
  }
  if (tile.type !== TileTypes.LAND) {
    return false;
  }
  if (state.robberTileId !== null && tile.tile.id === state.robberTileId) {
    return false;
  }

  if (!state.ruleset.friendlyRobber.enabled) {
    return true;
  }

  const nodes = tile.tile.nodes ?? {};
  for (const nodeId of Object.values(nodes)) {
    const building = state.buildingsByNodeId[nodeId];
    if (!building) {
      continue;
    }
    const owner = building.ownerId;
    const vp = getPublicVictoryPoints(state, owner);
    if (vp <= state.ruleset.friendlyRobber.vpThreshold) {
      return false;
    }
  }

  return true;
}

export function getRobberVictims(
  state: GameState,
  board: BoardTopology,
  tileId: number,
  actingPlayerId: string
): string[] {
  const tile = board.tiles.find((t) => t.tile.id === tileId);
  if (!tile) {
    return [];
  }

  const victims = new Set<string>();
  const nodes = tile.tile.nodes ?? {};
  for (const nodeId of Object.values(nodes)) {
    const building = state.buildingsByNodeId[nodeId];
    if (!building) {
      continue;
    }
    if (building.ownerId === actingPlayerId) {
      continue;
    }
    
    // Check Friendly Robber protection: cannot steal from player with too few VPs
    if (state.ruleset.friendlyRobber.enabled) {
        const vp = getPublicVictoryPoints(state, building.ownerId);
        if (vp <= state.ruleset.friendlyRobber.vpThreshold) {
            continue;
        }
    }
    
    victims.add(building.ownerId);
  }

  return Array.from(victims);
}

export function applyMoveRobber(
  state: GameState,
  board: BoardTopology,
  tileId: number,
  actingPlayerId: string,
  stolenCardIndex?: number,
  targetVictimId?: string
): { ok: true } | { ok: false; error: string } {
  if (!canPlaceRobber(state, board, tileId)) {
    return { ok: false, error: "illegal-robber" };
  }

  // Handle stealing
  const victims = getRobberVictims(state, board, tileId, actingPlayerId);
  
  const potentialVictims = victims.filter(id => {
      const p = state.playerStateById[id];
      return p && p.resources.length > 0;
  });

  let victimId = targetVictimId;
  if (potentialVictims.length > 0) {
    // If target specified, validate it
    if (victimId) {
      if (!potentialVictims.includes(victimId)) {
        return { ok: false, error: "invalid-victim" };
      }
    } else {
      // If only one victim, auto-select
      if (potentialVictims.length === 1) {
        victimId = potentialVictims[0];
      } else {
        // If multiple victims and no target specified, return error (UI needs to ask user)
        return { ok: false, error: "ambiguous-victim" };
      }
    }
  }

  state.robberTileId = tileId;

  // Execute steal
  if (victimId) {
    const victim = state.playerStateById[victimId];
    const thief = state.playerStateById[actingPlayerId];
    if (victim && thief && victim.resources.length > 0) {
      // Use provided index (0-1 float) to select card
      // random.Number() returns 0..1, so we map it to 0..length-1
      const rand = stolenCardIndex !== undefined ? stolenCardIndex : 0;
      const index = Math.floor(rand * victim.resources.length);
      const stolenResource = victim.resources[index];

      removeCardOnce(victim.resources, stolenResource);
      thief.resources.push(stolenResource);
    }
  }

  return { ok: true };
}

export type RollResult =
  | {
      ok: true;
      distributions: Distribution[];
      blockedTiles: number[];
      shortages: DistributionShortage[];
    }
  | { ok: false; error: string };

export function applyRollDice(
  state: GameState,
  board: BoardTopology,
  rollTotal: number
): RollResult {
  state.turn.hasRolled = true;
  state.turn.lastRollTotal = rollTotal;

  if (rollTotal === 7) {
    const pending = playersNeedingDiscard(state);
    state.turn.pendingDiscards = pending;
    state.turn.phase = pending.length > 0 ? "robberDiscard" : "robberMove";
    return { ok: true, distributions: [], blockedTiles: [], shortages: [] };
  }

  const distResult = applyResourceDistribution(state, board, rollTotal);
  if (!distResult.ok) {
    return distResult;
  }

  state.turn.phase = "postRoll";
  return {
    ok: true,
    distributions: distResult.distributions,
    blockedTiles: distResult.blockedTiles,
    shortages: distResult.shortages
  };
}

export function applyEndTurn(
  state: GameState
): { ok: true } | { ok: false; error: string } {
  if (state.phase !== "normal") {
    return { ok: false, error: "not-in-normal-phase" };
  }
  if (!state.turn.hasRolled) {
    return { ok: false, error: "not-rolled" };
  }
  if (state.turn.phase !== "postRoll") {
    return { ok: false, error: "turn-not-finished" };
  }
  if (state.turn.pendingDiscards.length > 0) {
    return { ok: false, error: "discard-pending" };
  }

  const currentIndex = state.players.indexOf(state.turn.currentPlayerId);
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + 1) % state.players.length;
  const currentId = state.turn.currentPlayerId;
  const nextId = state.players[nextIndex] ?? currentId;

  state.turn.currentPlayerId = nextId;
  state.turn.phase = "preRoll";
  state.turn.hasRolled = false;
  state.turn.lastRollTotal = null;
  state.turn.pendingDiscards = [];

  const currentPlayer = state.playerStateById[currentId];
  if (currentPlayer) {
    currentPlayer.devCardsBoughtThisTurn = [];
    currentPlayer.devCardsPlayedThisTurn = 0;
  }

  return { ok: true };
}
