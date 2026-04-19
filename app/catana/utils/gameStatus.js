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
  OPPONENT_TURN: "opponent_turn",
  DISCARD_SELF: "discard_self",
  DISCARD_OTHER: "discard_other",
  MOVING_ROBBER_SELF: "moving_robber_self",
  MOVING_ROBBER_OTHER: "moving_robber_other",
  STEALING_SELF: "stealing_self",
  STEALING_OTHER: "stealing_other",
  PLACING_SETTLEMENT_SELF: "placing_settlement_self",
  PLACING_SETTLEMENT_OTHER: "placing_settlement_other",
  PLACING_ROAD_SELF: "placing_road_self",
  PLACING_ROAD_OTHER: "placing_road_other",
  PLACING_CITY_SELF: "placing_city_self",
  PLACING_CITY_OTHER: "placing_city_other",
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

const normalizePlayerId = (playerId) => {
  if (playerId == null || playerId === "") return null;
  return String(playerId);
};

const resolveActivePlayerId = (core, ctx) =>
  normalizePlayerId(ctx?.currentPlayer ?? core?.turn?.currentPlayerId);

const normalizePendingPlayerIds = (playerIds = []) =>
  Array.from(
    new Set(
      playerIds
        .map((playerId) => normalizePlayerId(playerId))
        .filter(Boolean)
    )
  );

const resolvePlayerName = (playerId, playerMap = {}) => {
  const normalizedPlayerId = normalizePlayerId(playerId);
  const value = playerMap?.[normalizedPlayerId];
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.name === "string" && value.name.trim()) {
    return value.name;
  }
  return normalizedPlayerId == null ? "Player" : `Player ${normalizedPlayerId}`;
};

const hasViewerAwareCopy = (viewerPlayerId, playerMap = {}) =>
  normalizePlayerId(viewerPlayerId) != null ||
  Object.keys(playerMap ?? {}).length > 0;

const isViewerPlayer = (viewerPlayerId, playerId) => {
  const normalizedViewerPlayerId = normalizePlayerId(viewerPlayerId);
  const normalizedPlayerId = normalizePlayerId(playerId);
  return (
    normalizedViewerPlayerId != null &&
    normalizedPlayerId != null &&
    normalizedViewerPlayerId === normalizedPlayerId
  );
};

const getViewerAwareTitle = ({
  viewerPlayerId,
  activePlayerId,
  playerMap = {},
  legacyTitle,
  selfTitle,
  otherTitle,
}) => {
  if (!hasViewerAwareCopy(viewerPlayerId, playerMap)) return legacyTitle;
  if (isViewerPlayer(viewerPlayerId, activePlayerId)) return selfTitle;
  return otherTitle(resolvePlayerName(activePlayerId, playerMap));
};

const getPlacementStatus = ({
  viewerPlayerId,
  activePlayerId,
  playerMap = {},
  selfKind,
  otherKind,
  legacyTitle,
  selfTitle,
  otherTitle,
  statusType,
}) =>
  makeStatus({
    kind: isViewerPlayer(viewerPlayerId, activePlayerId)
      ? selfKind
      : otherKind,
    title: getViewerAwareTitle({
      viewerPlayerId,
      activePlayerId,
      playerMap,
      legacyTitle,
      selfTitle,
      otherTitle,
    }),
    text: legacyTitle,
    statusType,
    activePlayerId,
  });

const getDiscardStatus = ({
  viewerPlayerId,
  currentPlayerId,
  playerMap = {},
  pendingDiscards = [],
}) => {
  const normalizedViewerPlayerId = normalizePlayerId(viewerPlayerId);
  const pendingDiscardPlayerIds = normalizePendingPlayerIds(pendingDiscards);
  const viewerIsDiscarding =
    normalizedViewerPlayerId != null &&
    pendingDiscardPlayerIds.includes(normalizedViewerPlayerId);

  if (viewerIsDiscarding) {
    return makeStatus({
      kind: STATUS_KIND.DISCARD_SELF,
      title: "Discard resources",
      text: STATUS_TEXT.DISCARDING,
      statusType: STATUS_TYPES.DISCARDING,
      activePlayerId: normalizedViewerPlayerId,
    });
  }

  if (pendingDiscardPlayerIds.length === 1) {
    const discardingPlayerId = pendingDiscardPlayerIds[0];
    return makeStatus({
      kind: STATUS_KIND.DISCARD_OTHER,
      title: getViewerAwareTitle({
        viewerPlayerId,
        activePlayerId: discardingPlayerId,
        playerMap,
        legacyTitle: STATUS_TEXT.DISCARDING,
        selfTitle: "Discard resources",
        otherTitle: (playerName) => `${playerName} is discarding`,
      }),
      text: STATUS_TEXT.DISCARDING,
      statusType: STATUS_TYPES.DISCARDING,
      activePlayerId: discardingPlayerId,
    });
  }

  if (pendingDiscardPlayerIds.length > 1) {
    return makeStatus({
      kind: STATUS_KIND.DISCARD_OTHER,
      title: `${pendingDiscardPlayerIds.length} players are discarding`,
      text: STATUS_TEXT.DISCARDING,
      statusType: STATUS_TYPES.DISCARDING,
      activePlayerId: null,
    });
  }

  return makeStatus({
    kind: STATUS_KIND.DISCARD_OTHER,
    title: getViewerAwareTitle({
      viewerPlayerId,
      activePlayerId: currentPlayerId,
      playerMap,
      legacyTitle: STATUS_TEXT.DISCARDING,
      selfTitle: "Discard resources",
      otherTitle: (playerName) => `${playerName} is discarding`,
    }),
    text: STATUS_TEXT.DISCARDING,
    statusType: STATUS_TYPES.DISCARDING,
    activePlayerId: currentPlayerId,
  });
};

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
  const activePlayerId = resolveActivePlayerId(core, ctx);

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
    return getPlacementStatus({
      viewerPlayerId,
      activePlayerId,
      playerMap,
      selfKind: STATUS_KIND.PLACING_ROAD_SELF,
      otherKind: STATUS_KIND.PLACING_ROAD_OTHER,
      legacyTitle: STATUS_TEXT.PLACING_ROAD,
      selfTitle: "Place road",
      otherTitle: (playerName) => `${playerName} is placing a road`,
      statusType: STATUS_TYPES.PLACING_ROAD,
    });
  }

  if (playerAction === "placeSettlement") {
    return getPlacementStatus({
      viewerPlayerId,
      activePlayerId,
      playerMap,
      selfKind: STATUS_KIND.PLACING_SETTLEMENT_SELF,
      otherKind: STATUS_KIND.PLACING_SETTLEMENT_OTHER,
      legacyTitle: STATUS_TEXT.PLACING_SETTLEMENT,
      selfTitle: "Place settlement",
      otherTitle: (playerName) => `${playerName} is placing a settlement`,
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
    });
  }

  if (playerAction === "placeCity") {
    return getPlacementStatus({
      viewerPlayerId,
      activePlayerId,
      playerMap,
      selfKind: STATUS_KIND.PLACING_CITY_SELF,
      otherKind: STATUS_KIND.PLACING_CITY_OTHER,
      legacyTitle: STATUS_TEXT.PLACING_CITY,
      selfTitle: "Place city",
      otherTitle: (playerName) => `${playerName} is placing a city`,
      statusType: STATUS_TYPES.PLACING_CITY,
    });
  }

  // Placement phase
  if (core.phase === "placement") {
    const hasPendingRoad = core.pendingRoadFromNodeIdByPlayer?.[activePlayerId] != null;
    if (hasPendingRoad) {
      return getPlacementStatus({
        viewerPlayerId,
        activePlayerId,
        playerMap,
        selfKind: STATUS_KIND.PLACING_ROAD_SELF,
        otherKind: STATUS_KIND.PLACING_ROAD_OTHER,
        legacyTitle: STATUS_TEXT.PLACING_ROAD,
        selfTitle: "Place road",
        otherTitle: (playerName) => `${playerName} is placing a road`,
        statusType: STATUS_TYPES.PLACING_ROAD,
      });
    }
    return getPlacementStatus({
      viewerPlayerId,
      activePlayerId,
      playerMap,
      selfKind: STATUS_KIND.PLACING_SETTLEMENT_SELF,
      otherKind: STATUS_KIND.PLACING_SETTLEMENT_OTHER,
      legacyTitle: STATUS_TEXT.PLACING_SETTLEMENT,
      selfTitle: "Place settlement",
      otherTitle: (playerName) => `${playerName} is placing a settlement`,
      statusType: STATUS_TYPES.PLACING_SETTLEMENT,
    });
  }

  // Robber phases
  if (core.turn.phase === "robberDiscard") {
    return getDiscardStatus({
      viewerPlayerId,
      currentPlayerId: activePlayerId,
      playerMap,
      pendingDiscards: core.turn.pendingDiscards ?? [],
    });
  }

  if (core.turn.phase === "robberMove") {
    return makeStatus({
      kind: isViewerPlayer(viewerPlayerId, activePlayerId)
        ? STATUS_KIND.MOVING_ROBBER_SELF
        : STATUS_KIND.MOVING_ROBBER_OTHER,
      title: getViewerAwareTitle({
        viewerPlayerId,
        activePlayerId,
        playerMap,
        legacyTitle: STATUS_TEXT.MOVING_ROBBER,
        selfTitle: "Move the robber",
        otherTitle: (playerName) => `${playerName} is moving the robber`,
      }),
      text: STATUS_TEXT.MOVING_ROBBER,
      statusType: STATUS_TYPES.MOVING_ROBBER,
      activePlayerId,
    });
  }

  if (core.turn.phase === "robberSteal") {
    return makeStatus({
      kind: isViewerPlayer(viewerPlayerId, activePlayerId)
        ? STATUS_KIND.STEALING_SELF
        : STATUS_KIND.STEALING_OTHER,
      title: getViewerAwareTitle({
        viewerPlayerId,
        activePlayerId,
        playerMap,
        legacyTitle: STATUS_TEXT.STEALING,
        selfTitle: "Choose a player to steal from",
        otherTitle: (playerName) => `${playerName} is choosing who to steal from`,
      }),
      text: STATUS_TEXT.STEALING,
      statusType: STATUS_TYPES.STEALING,
      activePlayerId,
    });
  }

  // Pre-roll
  if (core.turn.phase === "preRoll") {
    return makeStatus({
      kind: isViewerPlayer(viewerPlayerId, activePlayerId)
        ? STATUS_KIND.WAITING_FOR_ROLL
        : STATUS_KIND.WAITING_FOR_ROLL_OTHER,
      title: getViewerAwareTitle({
        viewerPlayerId,
        activePlayerId,
        playerMap,
        legacyTitle: STATUS_TEXT.ROLLING,
        selfTitle: "Roll dice",
        otherTitle: (playerName) => `Waiting for ${playerName} to roll`,
      }),
      text: STATUS_TEXT.ROLLING,
      statusType: STATUS_TYPES.ROLLING,
      activePlayerId,
    });
  }

  // Post-roll (default main phase)
  return makeStatus({
    kind: isViewerPlayer(viewerPlayerId, activePlayerId)
      ? STATUS_KIND.YOUR_TURN
      : STATUS_KIND.OPPONENT_TURN,
    title: getViewerAwareTitle({
      viewerPlayerId,
      activePlayerId,
      playerMap,
      legacyTitle: STATUS_TEXT.THINKING,
      selfTitle: "Your turn",
      otherTitle: (playerName) => `${playerName}'s turn`,
    }),
    text: STATUS_TEXT.THINKING,
    statusType: STATUS_TYPES.THINKING,
    activePlayerId,
  });
}

const TIMED_STATUS_KINDS_BY_STAGE_KEY = {
  "main:preRoll": new Set([STATUS_KIND.WAITING_FOR_ROLL, STATUS_KIND.WAITING_FOR_ROLL_OTHER]),
  "main:postRoll": new Set([STATUS_KIND.YOUR_TURN, STATUS_KIND.OPPONENT_TURN]),
  "main:robberDiscard": new Set([STATUS_KIND.DISCARD_SELF, STATUS_KIND.DISCARD_OTHER]),
  "main:robberMove": new Set([
    STATUS_KIND.MOVING_ROBBER_SELF,
    STATUS_KIND.MOVING_ROBBER_OTHER
  ]),
  "main:robberSteal": new Set([
    STATUS_KIND.STEALING_SELF,
    STATUS_KIND.STEALING_OTHER
  ]),
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
