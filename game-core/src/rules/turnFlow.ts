import type { Resource } from "../types";
import type { BoardTopology } from "../core/topology";
import type { GameState } from "../core/state";

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

export function applyResourceDistribution(
  state: GameState,
  board: BoardTopology,
  rollTotal: number
): { ok: true } | { ok: false; error: string } {
  if (rollTotal === 7) {
    return { ok: true };
  }

  const requiredByResource: Record<string, number> = {};
  const allocations: Record<string, Resource[]> = {};

  for (const playerId of state.players) {
    allocations[playerId] = [];
  }

  for (const tile of board.tiles) {
    if (tile.tile.number !== rollTotal) {
      continue;
    }
    if (state.robberTileId !== null && tile.tile.id === state.robberTileId) {
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
      for (let i = 0; i < amount; i += 1) {
        allocations[owner].push(resource);
      }
      requiredByResource[resource] = (requiredByResource[resource] ?? 0) + amount;
    }
  }

  if (state.ruleset.bank.finite) {
    for (const [resource, required] of Object.entries(requiredByResource)) {
      const available = state.bank.resources.filter((r) => r === resource).length;
      if (required > available) {
        for (const playerId of Object.keys(allocations)) {
          allocations[playerId] = allocations[playerId].filter(
            (r) => r !== resource
          );
        }
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

  return { ok: true };
}

// Placeholder exports for later tasks in this slice
export function canPlaceRobber(
  _state: GameState,
  _board: BoardTopology,
  _tileId: number
): boolean {
  return true;
}

export function getRobberVictims(
  _state: GameState,
  _board: BoardTopology,
  _tileId: number,
  _actingPlayerId: string
): string[] {
  return [];
}

export function applyMoveRobber(
  state: GameState,
  _board: BoardTopology,
  tileId: number,
  _actingPlayerId: string
): { ok: true } | { ok: false; error: string } {
  state.robberTileId = tileId;
  return { ok: true };
}

export function applyRollDice(
  _state: GameState,
  _board: BoardTopology,
  _rollTotal: number
): { ok: true } | { ok: false; error: string } {
  return { ok: true };
}
