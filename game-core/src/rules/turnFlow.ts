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

export function canPlaceRobber(
  state: GameState,
  board: BoardTopology,
  tileId: number
): boolean {
  const tile = board.tiles.find((t) => t.tile.id === tileId);
  if (!tile) {
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
    const vp = state.playerStateById[owner]?.victoryPoints ?? 0;
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
    victims.add(building.ownerId);
  }

  return Array.from(victims);
}

export function applyMoveRobber(
  state: GameState,
  board: BoardTopology,
  tileId: number,
  _actingPlayerId: string
): { ok: true } | { ok: false; error: string } {
  if (!canPlaceRobber(state, board, tileId)) {
    return { ok: false, error: "illegal-robber" };
  }
  state.robberTileId = tileId;
  return { ok: true };
}

export function applyRollDice(
  state: GameState,
  board: BoardTopology,
  rollTotal: number
): { ok: true } | { ok: false; error: string } {
  state.turn.hasRolled = true;
  state.turn.lastRollTotal = rollTotal;

  if (rollTotal === 7) {
    const pending = playersNeedingDiscard(state);
    state.turn.pendingDiscards = pending;
    state.turn.phase = pending.length > 0 ? "robberDiscard" : "robberMove";
    return { ok: true };
  }

  applyResourceDistribution(state, board, rollTotal);
  state.turn.phase = "postRoll";
  return { ok: true };
}
