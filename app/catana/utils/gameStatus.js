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

const STATUS_KIND = {
  PREGAME: "pregame",
  WAITING_FOR_ROLL: "waiting_for_roll",
  WAITING_FOR_ROLL_OTHER: "waiting_for_roll_other",
  YOUR_TURN: "your_turn",
  DISCARD_SELF: "discard_self",
  DISCARD_OTHER: "discard_other",
  MOVING_ROBBER: "moving_robber",
  STEALING: "stealing",
  PLACING_SETTLEMENT: "placing_settlement",
  PLACING_ROAD: "placing_road",
  PLACING_CITY: "placing_city",
  GAME_OVER: "game_over",
};

const makeStatus = ({ kind, title, text, statusType, activePlayerId }) => ({
  kind,
  title,
  text,
  statusType,
  activePlayerId,
});

const normalizeOptions = (playerActionOrOptions) => {
  if (playerActionOrOptions == null || typeof playerActionOrOptions === "string") {
    return { playerAction: playerActionOrOptions ?? null };
  }

  return playerActionOrOptions;
};

const resolvePlayerName = (playerId, playerMap = {}) => {
  const value = playerMap?.[playerId];
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.name === "string" && value.name.trim()) {
    return value.name;
  }
  return `Player ${playerId}`;
};

const getTitle = (legacyTitle, viewerPlayerId, activePlayerId, playerMap = {}) => {
  if (viewerPlayerId == null) return legacyTitle;

  const isViewerActive = String(viewerPlayerId) === String(activePlayerId);
  if (isViewerActive) return "Roll dice";

  return `Waiting for ${resolvePlayerName(activePlayerId, playerMap)} to roll`;
};

const getDiscardTitle = (viewerPlayerId, activePlayerId, playerMap = {}, pendingDiscards = []) => {
  if (viewerPlayerId == null) return STATUS_TEXT.DISCARDING;

  const isViewerDiscarding = pendingDiscards
    .map(String)
    .includes(String(viewerPlayerId));

  if (isViewerDiscarding) return "Discard resources";

  return `${resolvePlayerName(activePlayerId, playerMap)} is discarding`;
};

const shouldUseViewerAwareCopy = (viewerPlayerId, playerMap) =>
  viewerPlayerId != null || (playerMap && Object.keys(playerMap).length > 0);

/**
 * Derives the current game status from state.
 * @param {object} core - The core game state (G.core)
 * @param {object} ctx - The boardgame.io context
 * @param {string|null} playerAction - UI-level action like 'placeRoad'
 * @returns {{ text: string, statusType: string, activePlayerId: string }}
 */
export function getGameStatus(core, ctx, playerActionOrOptions = null) {
  const { playerAction = null, viewerPlayerId = null, playerMap = {} } =
    normalizeOptions(playerActionOrOptions);
  const activePlayerId = core.turn.currentPlayerId;
  const useViewerAwareCopy = shouldUseViewerAwareCopy(viewerPlayerId, playerMap);
  const isViewerActive = String(viewerPlayerId) === String(activePlayerId);

  if (ctx.phase === "preGame") {
    return makeStatus({
      kind: STATUS_KIND.PREGAME,
      title: STATUS_TEXT.PREGAME,
      text: STATUS_TEXT.PREGAME,
      statusType: STATUS_TYPES.THINKING,
      activePlayerId,
    });
  }

  // UI-level build actions take priority
  if (playerAction === "placeRoad" || playerAction === "roadBuilding") {
    return makeStatus({
      kind: STATUS_KIND.PLACING_ROAD,
      title: STATUS_TEXT.PLACING_ROAD,
      text: STATUS_TEXT.PLACING_ROAD,
      statusType: STATUS_TYPES.PLACING_ROAD,
      activePlayerId,
    });
  }

  if (playerAction === "placeSettlement") {
    return makeStatus({
      kind: STATUS_KIND.PLACING_SETTLEMENT,
      title: STATUS_TEXT.PLACING_SETTLEMENT,
      text: STATUS_TEXT.PLACING_SETTLEMENT,
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    });
  }

  if (playerAction === "placeCity") {
    return makeStatus({
      kind: STATUS_KIND.PLACING_CITY,
      title: STATUS_TEXT.PLACING_CITY,
      text: STATUS_TEXT.PLACING_CITY,
      statusType: STATUS_TYPES.PLACING_CITY,
      activePlayerId,
    });
  }

  // Placement phase
  if (core.phase === "placement") {
    const hasPendingRoad = core.pendingRoadFromNodeIdByPlayer?.[activePlayerId] != null;
    if (hasPendingRoad) {
      return makeStatus({
        kind: STATUS_KIND.PLACING_ROAD,
        title: STATUS_TEXT.PLACING_ROAD,
        text: STATUS_TEXT.PLACING_ROAD,
        statusType: STATUS_TYPES.PLACING_ROAD,
        activePlayerId,
      });
    }
    return makeStatus({
      kind: STATUS_KIND.PLACING_SETTLEMENT,
      title: STATUS_TEXT.PLACING_SETTLEMENT,
      text: STATUS_TEXT.PLACING_SETTLEMENT,
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
      activePlayerId,
    });
  }

  // Robber phases
  if (core.turn.phase === "robberDiscard") {
    return makeStatus({
      kind:
        useViewerAwareCopy && isViewerActive
          ? STATUS_KIND.DISCARD_SELF
          : STATUS_KIND.DISCARD_OTHER,
      title: getDiscardTitle(
        viewerPlayerId,
        activePlayerId,
        playerMap,
        core.turn.pendingDiscards ?? []
      ),
      text: STATUS_TEXT.DISCARDING,
      statusType: STATUS_TYPES.DISCARDING,
      activePlayerId,
    });
  }

  if (core.turn.phase === "robberMove") {
    return makeStatus({
      kind: STATUS_KIND.MOVING_ROBBER,
      title: STATUS_TEXT.MOVING_ROBBER,
      text: STATUS_TEXT.MOVING_ROBBER,
      statusType: STATUS_TYPES.MOVING_ROBBER,
      activePlayerId,
    });
  }

  if (core.turn.phase === "robberSteal") {
    return makeStatus({
      kind: STATUS_KIND.STEALING,
      title: STATUS_TEXT.STEALING,
      text: STATUS_TEXT.STEALING,
      statusType: STATUS_TYPES.STEALING,
      activePlayerId,
    });
  }

  // Pre-roll
  if (core.turn.phase === "preRoll") {
    return makeStatus({
      kind: useViewerAwareCopy && isViewerActive
        ? STATUS_KIND.WAITING_FOR_ROLL
        : STATUS_KIND.WAITING_FOR_ROLL_OTHER,
      title: useViewerAwareCopy
        ? getTitle(STATUS_TEXT.ROLLING, viewerPlayerId, activePlayerId, playerMap)
        : STATUS_TEXT.ROLLING,
      text: STATUS_TEXT.ROLLING,
      statusType: STATUS_TYPES.ROLLING,
      activePlayerId,
    });
  }

  // Post-roll (default main phase)
  return makeStatus({
    kind: STATUS_KIND.YOUR_TURN,
    title: STATUS_TEXT.THINKING,
    text: STATUS_TEXT.THINKING,
    statusType: STATUS_TYPES.THINKING,
    activePlayerId,
  });
}

const TIMED_STATUS_KINDS_BY_STAGE_KEY = {
  "main:preRoll": new Set([STATUS_KIND.WAITING_FOR_ROLL, STATUS_KIND.WAITING_FOR_ROLL_OTHER]),
  "main:robberDiscard": new Set([STATUS_KIND.DISCARD_SELF, STATUS_KIND.DISCARD_OTHER]),
  "main:robberMove": new Set([STATUS_KIND.MOVING_ROBBER]),
  "main:robberSteal": new Set([STATUS_KIND.STEALING]),
};

export function shouldShowGameStatusTimer(status, timerSnapshot) {
  if (!status || !timerSnapshot) return false;
  if (status.kind === STATUS_KIND.GAME_OVER) return false;
  if (timerSnapshot.kind !== "stage") return true;

  const { stageKey } = timerSnapshot;
  if (!stageKey || stageKey.startsWith("preGame:")) return false;

  const allowedKinds = TIMED_STATUS_KINDS_BY_STAGE_KEY[stageKey];
  if (!allowedKinds) return true;

  return allowedKinds.has(status.kind);
}
