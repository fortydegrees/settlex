export const STATUS_TYPES = {
  ROLLING: "rolling",
  THINKING: "thinking",
  MOVING_ROBBER: "moving_robber",
  STEALING: "stealing",
  DISCARDING: "discarding",
  PLACING_SETTLEMENT: "placing_settlement",
  PLACING_ROAD: "placing_road",
  PLACING_CITY: "placing_city",
};

/**
 * Derives the current game status from state.
 * @param {object} core - The core game state (G.core)
 * @param {object} ctx - The boardgame.io context
 * @param {string|null} playerAction - UI-level action like 'placeRoad'
 * @returns {{ text: string, statusType: string, activePlayerId: string }}
 */
export function getGameStatus(core, ctx, playerAction = null) {
  const activePlayerId = core.turn.currentPlayerId;

  if (ctx.phase === "preGame") {
    return {
      text: "Waiting to start",
      statusType: STATUS_TYPES.THINKING,
      activePlayerId,
    };
  }

  // UI-level build actions take priority
  if (playerAction === "placeRoad" || playerAction === "roadBuilding") {
    return {
      text: "Place Road",
      statusType: STATUS_TYPES.PLACING_ROAD,
      activePlayerId,
    };
  }

  if (playerAction === "placeSettlement") {
    return {
      text: "Place Settlement",
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    };
  }

  if (playerAction === "placeCity") {
    return {
      text: "Place City",
      statusType: STATUS_TYPES.PLACING_CITY,
      activePlayerId,
    };
  }

  // Placement phase
  if (core.phase === "placement") {
    const hasPendingRoad = core.pendingRoadFromNodeIdByPlayer?.[activePlayerId] != null;
    if (hasPendingRoad) {
      return {
        text: "Place Road",
        statusType: STATUS_TYPES.PLACING_ROAD,
        activePlayerId,
      };
    }
    return {
      text: "Place Settlement",
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    };
  }

  // Robber phases
  if (core.turn.phase === "robberDiscard") {
    return {
      text: "Discard Cards",
      statusType: STATUS_TYPES.DISCARDING,
      activePlayerId,
    };
  }

  if (core.turn.phase === "robberMove") {
    return {
      text: "Move Robber",
      statusType: STATUS_TYPES.MOVING_ROBBER,
      activePlayerId,
    };
  }

  if (core.turn.phase === "robberSteal") {
    return {
      text: "Choose Player",
      statusType: STATUS_TYPES.STEALING,
      activePlayerId,
    };
  }

  // Pre-roll
  if (core.turn.phase === "preRoll") {
    return {
      text: "Roll Dice",
      statusType: STATUS_TYPES.ROLLING,
      activePlayerId,
    };
  }

  // Post-roll (default main phase)
  return {
    text: "Your Turn",
    statusType: STATUS_TYPES.THINKING,
    activePlayerId,
  };
}
