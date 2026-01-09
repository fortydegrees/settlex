import { GameState } from "../core/state";

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
