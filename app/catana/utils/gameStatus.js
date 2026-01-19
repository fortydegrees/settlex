import { STATUS_TEXT } from "./gameText";

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
      text: STATUS_TEXT.PREGAME,
      statusType: STATUS_TYPES.THINKING,
      activePlayerId,
    };
  }

  // UI-level build actions take priority
  if (playerAction === "placeRoad" || playerAction === "roadBuilding") {
    return {
      text: STATUS_TEXT.PLACING_ROAD,
      statusType: STATUS_TYPES.PLACING_ROAD,
      activePlayerId,
    };
  }

  if (playerAction === "placeSettlement") {
    return {
      text: STATUS_TEXT.PLACING_SETTLEMENT,
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    };
  }

  if (playerAction === "placeCity") {
    return {
      text: STATUS_TEXT.PLACING_CITY,
      statusType: STATUS_TYPES.PLACING_CITY,
      activePlayerId,
    };
  }

  // Placement phase
  if (core.phase === "placement") {
    const hasPendingRoad = core.pendingRoadFromNodeIdByPlayer?.[activePlayerId] != null;
    if (hasPendingRoad) {
      return {
        text: STATUS_TEXT.PLACING_ROAD,
        statusType: STATUS_TYPES.PLACING_ROAD,
        activePlayerId,
      };
    }
    return {
      text: STATUS_TEXT.PLACING_SETTLEMENT,
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    };
  }

  // Robber phases
  if (core.turn.phase === "robberDiscard") {
    return {
      text: STATUS_TEXT.DISCARDING,
      statusType: STATUS_TYPES.DISCARDING,
      activePlayerId,
    };
  }

  if (core.turn.phase === "robberMove") {
    return {
      text: STATUS_TEXT.MOVING_ROBBER,
      statusType: STATUS_TYPES.MOVING_ROBBER,
      activePlayerId,
    };
  }

  if (core.turn.phase === "robberSteal") {
    return {
      text: STATUS_TEXT.STEALING,
      statusType: STATUS_TYPES.STEALING,
      activePlayerId,
    };
  }

  // Pre-roll
  if (core.turn.phase === "preRoll") {
    return {
      text: STATUS_TEXT.ROLLING,
      statusType: STATUS_TYPES.ROLLING,
      activePlayerId,
    };
  }

  // Post-roll (default main phase)
  return {
    text: STATUS_TEXT.THINKING,
    statusType: STATUS_TYPES.THINKING,
    activePlayerId,
  };
}
