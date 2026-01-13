import { GameState } from "../core/state";
import { BoardTopology } from "../core/topology";
import { EdgeId, NodeId } from "../core/ids";

export function recomputeLargestArmy(state: GameState) {
  const minKnights = state.ruleset.largestArmyMinKnights;
  const current = state.awards.largestArmyOwnerId;
  let max = 0;
  let leaders: string[] = [];

  for (const [playerId, player] of Object.entries(state.playerStateById)) {
    if (player.knightsPlayed > max) {
      max = player.knightsPlayed;
      leaders = [playerId];
    } else if (player.knightsPlayed === max) {
      leaders.push(playerId);
    }
  }

  if (max < minKnights) {
    state.awards.largestArmyOwnerId = null;
    return;
  }

  if (leaders.length === 1) {
    state.awards.largestArmyOwnerId = leaders[0];
    return;
  }

  state.awards.largestArmyOwnerId =
    current && leaders.includes(current) ? current : null;
}

function dfsLongestFromNode(
  board: BoardTopology,
  roadsByEdgeId: Record<EdgeId, string>,
  playerId: string,
  blockedNodes: Set<NodeId>,
  nodeId: NodeId,
  visited: Set<EdgeId>
): number {
  const edges = board.nodeEdges[nodeId] ?? [];
  const isBlocked = blockedNodes.has(nodeId);
  let max = 0;

  for (const edgeId of edges) {
    if (roadsByEdgeId[edgeId] !== playerId) {
      continue;
    }
    if (visited.has(edgeId)) {
      continue;
    }
    visited.add(edgeId);
    const [a, b] = board.edgeNodes[edgeId];
    const nextNode = a === nodeId ? b : a;
    const length = 1 + (isBlocked ? 0 : dfsLongestFromNode(
      board,
      roadsByEdgeId,
      playerId,
      blockedNodes,
      nextNode,
      visited
    ));
    visited.delete(edgeId);
    if (length > max) {
      max = length;
    }
  }

  return max;
}

export function getLongestRoadLength(
  state: GameState,
  board: BoardTopology,
  playerId: string
): number {
  const blockedNodes = new Set<NodeId>();
  for (const [nodeId, building] of Object.entries(state.buildingsByNodeId)) {
    if (building.ownerId !== playerId) {
      blockedNodes.add(Number(nodeId));
    }
  }

  let max = 0;
  for (const nodeId of board.nodeIds) {
    const length = dfsLongestFromNode(
      board,
      state.roadsByEdgeId,
      playerId,
      blockedNodes,
      nodeId,
      new Set()
    );
    if (length > max) {
      max = length;
    }
  }
  return max;
}

export function recomputeLongestRoad(state: GameState, board: BoardTopology) {
  const minLength = state.ruleset.longestRoadMinLength;
  const current = state.awards.longestRoadOwnerId;
  let max = 0;
  let leaders: string[] = [];

  for (const playerId of state.players) {
    const length = getLongestRoadLength(state, board, playerId);
    if (length > max) {
      max = length;
      leaders = [playerId];
    } else if (length === max) {
      leaders.push(playerId);
    }
  }

  if (max < minLength) {
    state.awards.longestRoadOwnerId = null;
    return;
  }
  if (leaders.length === 1) {
    state.awards.longestRoadOwnerId = leaders[0];
    return;
  }

  state.awards.longestRoadOwnerId =
    current && leaders.includes(current) ? current : null;
}

export function getVictoryPoints(state: GameState, playerId: string): number {
  let points = 0;
  for (const building of Object.values(state.buildingsByNodeId)) {
    if (building.ownerId !== playerId) {
      continue;
    }
    if (building.type === "settlement") {
      points += 1;
    } else if (building.type === "city") {
      points += 2;
    }
  }

  const player = state.playerStateById[playerId];
  if (player) {
    points += player.devCards.filter((card) => card === "victoryPoint").length;
  }

  if (state.awards.longestRoadOwnerId === playerId) {
    points += 2;
  }
  if (state.awards.largestArmyOwnerId === playerId) {
    points += 2;
  }

  return points;
}

export function getPublicVictoryPoints(state: GameState, playerId: string): number {
  let points = 0;
  for (const building of Object.values(state.buildingsByNodeId)) {
    if (building.ownerId !== playerId) {
      continue;
    }
    if (building.type === "settlement") {
      points += 1;
    } else if (building.type === "city") {
      points += 2;
    }
  }

  // Hidden VP cards (devCards) are NOT counted in public VPs

  if (state.awards.longestRoadOwnerId === playerId) {
    points += 2;
  }
  if (state.awards.largestArmyOwnerId === playerId) {
    points += 2;
  }

  return points;
}

export function checkWin(state: GameState, playerId: string): boolean {
  return getVictoryPoints(state, playerId) >= state.ruleset.victoryPointsToWin;
}

export function checkAndApplyWin(state: GameState, actingPlayerId: string): void {
  if (state.phase !== "normal") {
    return;
  }
  if (state.gameOver) {
    return;
  }
  if (state.turn.currentPlayerId !== actingPlayerId) {
    return;
  }
  if (checkWin(state, actingPlayerId)) {
    state.gameOver = { winnerId: actingPlayerId, reason: "victoryPoints" };
  }
}
