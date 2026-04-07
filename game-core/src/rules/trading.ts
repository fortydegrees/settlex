import type { GameState } from "../core/state";
import type { BoardTopology } from "../core/topology";
import type { Resource } from "../types";
import { ResourceType } from "../types";

function countResources(resources: Resource[]): Record<Resource, number> {
  const counts: Record<Resource, number> = {} as Record<Resource, number>;
  for (const resource of resources) {
    counts[resource] = (counts[resource] ?? 0) + 1;
  }
  return counts;
}

function removeResourceOnce(resources: Resource[], resource: Resource): boolean {
  const index = resources.indexOf(resource);
  if (index === -1) {
    return false;
  }
  resources.splice(index, 1);
  return true;
}

export function canUsePort(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  resource: Resource
): boolean {
  for (const [nodeId, portResource] of Object.entries(board.portsByNodeId)) {
    const building = state.buildingsByNodeId[Number(nodeId)];
    if (!building || building.ownerId !== playerId) {
      continue;
    }
    if (portResource === ResourceType.ANY || portResource === resource) {
      return true;
    }
  }
  return false;
}

export function bestTradeRate(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  resource: Resource
): number {
  let hasSpecific = false;
  let hasGeneric = false;
  for (const [nodeId, portResource] of Object.entries(board.portsByNodeId)) {
    const building = state.buildingsByNodeId[Number(nodeId)];
    if (!building || building.ownerId !== playerId) {
      continue;
    }
    if (portResource === resource) {
      hasSpecific = true;
    }
    if (portResource === ResourceType.ANY) {
      hasGeneric = true;
    }
  }
  if (hasSpecific) return state.ruleset.tradeRates.specificPort;
  if (hasGeneric) return state.ruleset.tradeRates.genericPort;
  return state.ruleset.tradeRates.bank;
}

/**
 * Check if a player can perform any maritime trade.
 * Returns true if they have enough resources to meet the best available trade rate for at least one resource type they own.
 */
export function canMaritimeTrade(
  state: GameState,
  board: BoardTopology,
  playerId: string
): { ok: true } | { ok: false; error: string } {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }

  const resourceCounts = countResources(player.resources);
  
  // Iterate through all resource types the player owns
  for (const [resource, count] of Object.entries(resourceCounts)) {
    if (count <= 0) continue;
    
    // Check the rate for this specific resource
    const rate = bestTradeRate(state, board, playerId, resource as Resource);
    
    // If they have enough to trade even once, it's a valid action
    if (count >= rate) {
      return { ok: true };
    }
  }

  return { ok: false, error: "insufficient-resources" };
}

export function applyMaritimeTrade(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  trade: { give: Resource; receive: Resource }
): { ok: true } | { ok: false; error: string } {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }

  const rate = bestTradeRate(state, board, playerId, trade.give);
  const playerCounts = countResources(player.resources);
  if ((playerCounts[trade.give] ?? 0) < rate) {
    return { ok: false, error: "insufficient-resources" };
  }

  if (state.ruleset.bank.finite) {
    const available =
      state.bank.resources.filter((r) => r === trade.receive).length;
    if (available < 1) {
      return { ok: false, error: "bank-empty" };
    }
  }

  for (let i = 0; i < rate; i += 1) {
    removeResourceOnce(player.resources, trade.give);
    if (state.ruleset.bank.finite) {
      state.bank.resources.push(trade.give);
    }
  }

  player.resources.push(trade.receive);
  if (state.ruleset.bank.finite) {
    removeResourceOnce(state.bank.resources, trade.receive);
  }

  return { ok: true };
}

export function getMaritimeTradeReceiveCount(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  give: Resource[]
): { ok: true; count: number } | { ok: false; error: string } {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }

  if (!Array.isArray(give) || give.length === 0) {
    return { ok: true, count: 0 };
  }

  const selectedCounts = countResources(give);
  const playerCounts = countResources(player.resources);
  let count = 0;

  for (const [resource, selectedCount] of Object.entries(selectedCounts) as [
    Resource,
    number
  ][]) {
    if ((playerCounts[resource] ?? 0) < selectedCount) {
      return { ok: false, error: "insufficient-resources" };
    }

    const rate = bestTradeRate(state, board, playerId, resource);
    if (selectedCount < rate || selectedCount % rate !== 0) {
      return { ok: false, error: "invalid-trade-ratio" };
    }

    count += selectedCount / rate;
  }

  return { ok: true, count };
}

export function applyMaritimeTradeBatch(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  trade: { give: Resource[]; receive: Resource[] }
): { ok: true } | { ok: false; error: string } {
  const receiveCount = getMaritimeTradeReceiveCount(
    state,
    board,
    playerId,
    trade.give
  );
  if (!receiveCount.ok) {
    return receiveCount;
  }

  if (receiveCount.count === 0) {
    return { ok: false, error: "invalid-trade-ratio" };
  }

  if (trade.receive.length !== receiveCount.count) {
    return { ok: false, error: "invalid-receive-count" };
  }

  if (state.ruleset.bank.finite) {
    const requestedCounts = countResources(trade.receive);
    const availableCounts = countResources(state.bank.resources);
    for (const [resource, requestedCount] of Object.entries(requestedCounts) as [
      Resource,
      number
    ][]) {
      if ((availableCounts[resource] ?? 0) < requestedCount) {
        return { ok: false, error: "bank-empty" };
      }
    }
  }

  const giveCounts = countResources(trade.give);
  let receiveIndex = 0;

  for (const [resource, selectedCount] of Object.entries(giveCounts) as [
    Resource,
    number
  ][]) {
    const rate = bestTradeRate(state, board, playerId, resource);
    const tradesForResource = selectedCount / rate;

    for (let i = 0; i < tradesForResource; i += 1) {
      const result = applyMaritimeTrade(state, board, playerId, {
        give: resource,
        receive: trade.receive[receiveIndex]
      });
      if (!result.ok) {
        return result;
      }
      receiveIndex += 1;
    }
  }

  return { ok: true };
}

export function applyPlayerTrade(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
  trade: { give: Resource[]; receive: Resource[] }
): { ok: true } | { ok: false; error: string } {
  if (!state.ruleset.allowPlayerTrades) {
    return { ok: false, error: "player-trades-disabled" };
  }
  const fromPlayer = state.playerStateById[fromPlayerId];
  const toPlayer = state.playerStateById[toPlayerId];
  if (!fromPlayer || !toPlayer) {
    return { ok: false, error: "unknown-player" };
  }

  const fromCounts = countResources(fromPlayer.resources);
  for (const resource of trade.give) {
    if ((fromCounts[resource] ?? 0) <= 0) {
      return { ok: false, error: "insufficient-resources" };
    }
    fromCounts[resource] -= 1;
  }

  const toCounts = countResources(toPlayer.resources);
  for (const resource of trade.receive) {
    if ((toCounts[resource] ?? 0) <= 0) {
      return { ok: false, error: "insufficient-resources" };
    }
    toCounts[resource] -= 1;
  }

  for (const resource of trade.give) {
    removeResourceOnce(fromPlayer.resources, resource);
    toPlayer.resources.push(resource);
  }
  for (const resource of trade.receive) {
    removeResourceOnce(toPlayer.resources, resource);
    fromPlayer.resources.push(resource);
  }

  return { ok: true };
}
