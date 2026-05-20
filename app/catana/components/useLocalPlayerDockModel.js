import { useCallback, useMemo } from "react";
import {
  canAfford,
  canBuildCity,
  canBuildRoad,
  canBuildSettlement,
  canMaritimeTrade,
  buildableEdges,
  buildableNodes,
  getPlayableDevCardCounts,
} from "@settlex/game-core";
import { getMaritimeTradeRateIfTradable } from "../utils/trade";
import { getBuildPickupPieceType } from "../utils/playerAction";
import { getTurnControlMode } from "../utils/turnControlMode";
import {
  getClassicSvgPath,
  getThemedSvgPath,
} from "../theme/themes";
import { getPieceSvgFile } from "../theme/pieceAssets.js";

export const BUILD_PICKUP_PRELAUNCH_DELAY_MS = 132;
export const DEV_CARD_PRELAUNCH_DELAY_MS = 320;
export const LOW_TIMER_THRESHOLD_SECONDS = 5;
export const LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS = new Set([
  "waiting_for_roll",
  "waiting_for_roll_other",
]);
export const LOW_TIMER_ALERT_SUPPRESSED_STATUS_TYPES = new Set(["rolling"]);

export const getTimerSeconds = (ms) => {
  if (ms == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(ms / 1000));
};

export const formatTimer = (ms) => {
  if (ms == null) return null;
  const total = getTimerSeconds(ms);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const getLowTimerAlertState = ({
  timerMs,
  statusType,
  gameStatus,
}) => {
  const timerText = formatTimer(timerMs);
  const showStatusTimer = gameStatus?.showTimer !== false && Boolean(timerText);
  const isLowTimerAlertSuppressed =
    LOW_TIMER_ALERT_SUPPRESSED_STATUS_TYPES.has(statusType) ||
    LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS.has(gameStatus?.kind);

  return {
    showStatusTimer,
    isLowTimerAlertActive:
      showStatusTimer &&
      !isLowTimerAlertSuppressed &&
      getTimerSeconds(timerMs) <= LOW_TIMER_THRESHOLD_SECONDS,
  };
};

export function useLocalPlayerDockModel({
  G,
  ctx,
  player,
  clientPlayerID,
  buildPickup,
  displayDevCards,
  keepDevCardShellMounted,
  onTradeClick,
  onBuildAction,
  onDevCardPurchase,
  canRoll,
  canEnd,
  timerMs,
  statusType,
  gameStatus,
  themeId,
}) {
  const activePickupPieceType = buildPickup?.pieceType ?? null;
  const stage = ctx?.activePlayers?.[player.id];
  const isDevStage = stage === "preRoll" || stage === "postRoll";
  const devPlayActive = G.devCardPlay && G.devCardPlay.playerId === player.id;
  const canStartDev =
    clientPlayerID === player.id &&
    ctx.currentPlayer === player.id &&
    isDevStage &&
    !devPlayActive;
  const activeDevCardType = devPlayActive ? G.devCardPlay.type : null;
  const pieceColor = player.color ?? "red";

  const devPlayableCountsByType = useMemo(() => {
    if (!G.core || !player?.devCards || !canStartDev) return {};
    return getPlayableDevCardCounts(G.core, player.id);
  }, [G.core, player?.devCards, player.id, canStartDev]);

  const resourceCounts = useMemo(() => {
    const counts = {};
    for (const resource of player.resources ?? []) {
      counts[resource] = (counts[resource] ?? 0) + 1;
    }
    return counts;
  }, [player.resources]);

  const isActionEnabled = useCallback(
    (actionName) => {
      if (ctx.currentPlayer !== player.id.toString()) return false;
      if (ctx.activePlayers?.[player.id] !== "postRoll") return false;
      if (!G.core) return false;

      switch (actionName) {
        case "road":
          if (!canBuildRoad(G.core, player.id).ok) return false;
          return (
            buildableEdges(G.core, G.coreTopology, player.id, {
              initialPlacement: false,
            }).length > 0
          );
        case "settlement":
          if (!canBuildSettlement(G.core, player.id).ok) return false;
          return (
            buildableNodes(G.core, G.coreTopology, player.id, {
              initialPlacement: false,
            }).length > 0
          );
        case "city": {
          if (!canBuildCity(G.core, player.id).ok) return false;
          const settlements = Object.values(G.core.buildingsByNodeId).filter(
            (building) =>
              building.ownerId === player.id && building.type === "settlement"
          );
          return settlements.length > 0;
        }
        case "trade":
          return canMaritimeTrade(G.core, G.coreTopology, player.id).ok;
        case "devCard":
          if (!G.core.devDeck.length) return false;
          return canAfford(G.core.ruleset.buildCosts.devCard, player.resources);
        default:
          return false;
      }
    },
    [G.core, G.coreTopology, ctx.activePlayers, ctx.currentPlayer, player]
  );

  const actions = useMemo(
    () => [
      {
        name: "trade",
        action: onTradeClick,
        img: getThemedSvgPath(themeId, "icon_trade.svg"),
        fallbackImg: getClassicSvgPath("icon_trade.svg"),
        count: 0,
        enabled: false,
        style: null,
      },
      {
        name: "road",
        action: ({ triggerRect, preLaunchDelayMs }) =>
          onBuildAction?.("placeRoad", triggerRect, preLaunchDelayMs),
        img: getThemedSvgPath(themeId, getPieceSvgFile("road", pieceColor)),
        fallbackImg: getClassicSvgPath(getPieceSvgFile("road", pieceColor)),
        count: player.roadsRemaining,
        enabled: false,
        style: { transform: "rotate(90deg) scale(0.9)" },
        selected: buildPickup?.pieceType === "road",
        preLaunchDelayMs: BUILD_PICKUP_PRELAUNCH_DELAY_MS,
      },
      {
        name: "settlement",
        action: ({ triggerRect, preLaunchDelayMs }) =>
          onBuildAction?.("placeSettlement", triggerRect, preLaunchDelayMs),
        img: getThemedSvgPath(
          themeId,
          getPieceSvgFile("settlement", pieceColor)
        ),
        fallbackImg: getClassicSvgPath(
          getPieceSvgFile("settlement", pieceColor)
        ),
        count: player.settlementsRemaining,
        enabled: false,
        style: null,
        selected: buildPickup?.pieceType === "settlement",
        preLaunchDelayMs: BUILD_PICKUP_PRELAUNCH_DELAY_MS,
      },
      {
        name: "city",
        action: ({ triggerRect, preLaunchDelayMs }) =>
          onBuildAction?.("placeCity", triggerRect, preLaunchDelayMs),
        img: getThemedSvgPath(themeId, getPieceSvgFile("city", pieceColor)),
        fallbackImg: getClassicSvgPath(getPieceSvgFile("city", pieceColor)),
        count: player.citiesRemaining,
        enabled: false,
        style: null,
        selected: buildPickup?.pieceType === "city",
        preLaunchDelayMs: BUILD_PICKUP_PRELAUNCH_DELAY_MS,
      },
      {
        name: "devCard",
        action: onDevCardPurchase,
        img: getThemedSvgPath(themeId, "icon_devcard.svg"),
        fallbackImg: getClassicSvgPath("icon_devcard.svg"),
        preLaunchImg: getThemedSvgPath(themeId, "icon_devcard_emblem.svg"),
        preLaunchFallbackImg: getClassicSvgPath("icon_devcard_emblem.svg"),
        count: 0,
        enabled: false,
        style: null,
        preLaunchDelayMs: DEV_CARD_PRELAUNCH_DELAY_MS,
      },
      null,
    ],
    [
      buildPickup?.pieceType,
      onBuildAction,
      onDevCardPurchase,
      onTradeClick,
      pieceColor,
      player.citiesRemaining,
      player.roadsRemaining,
      player.settlementsRemaining,
      themeId,
    ]
  );

  const dynamicActions = useMemo(
    () =>
      actions.map((action) => {
        if (!action) return null;
        const pieceType = getBuildPickupPieceType(
          `place${action.name[0]?.toUpperCase() ?? ""}${action.name.slice(1)}`
        );
        return {
          ...action,
          enabled: isActionEnabled(action.name),
          selected: action.selected ?? pieceType === activePickupPieceType,
        };
      }),
    [actions, activePickupPieceType, isActionEnabled]
  );

  const canTradeNow = isActionEnabled("trade");
  const canQuickTradeResource = useCallback(
    (resource) => {
      if (!onTradeClick || !canTradeNow) return false;
      return Boolean(
        getMaritimeTradeRateIfTradable({
          core: G.core,
          coreTopology: G.coreTopology,
          playerId: player.id,
          resource,
          playerResources: player.resources,
        })
      );
    },
    [G.core, G.coreTopology, canTradeNow, onTradeClick, player.id, player.resources]
  );

  const handleResourceClick = useCallback(
    (resource) => {
      if (!onTradeClick) return;
      if (!canTradeNow) return;

      const rate = getMaritimeTradeRateIfTradable({
        core: G.core,
        coreTopology: G.coreTopology,
        playerId: player.id,
        resource,
        playerResources: player.resources,
      });

      if (!rate) return;
      onTradeClick(resource);
    },
    [G.core, G.coreTopology, canTradeNow, onTradeClick, player.id, player.resources]
  );

  const totalResources = player.resources?.length ?? 0;
  const discardLimit = G.core?.ruleset?.discardLimit ?? 7;
  const isOverLimit = totalResources > discardLimit;
  const visibleDevCards = displayDevCards ?? player.devCards ?? [];
  const showDevCardBay =
    visibleDevCards.length > 0 || Boolean(keepDevCardShellMounted);
  const timerText = formatTimer(timerMs);
  const { showStatusTimer, isLowTimerAlertActive } = getLowTimerAlertState({
    timerMs,
    statusType,
    gameStatus,
  });
  const rollEnabled = Boolean(canRoll);
  const endTurnEnabled = Boolean(canEnd);
  const turnControlMode = getTurnControlMode({
    canRoll: rollEnabled,
    canEnd: endTurnEnabled,
  });

  return {
    activeDevCardType,
    canQuickTradeResource,
    canTradeNow,
    devPlayableCountsByType,
    dynamicActions,
    endTurnEnabled,
    handleResourceClick,
    isLowTimerAlertActive,
    isOverLimit,
    resourceCounts,
    rollEnabled,
    showDevCardBay,
    showStatusTimer,
    timerText,
    totalResources,
    turnControlMode,
    visibleDevCards,
  };
}
