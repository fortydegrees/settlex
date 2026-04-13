/* eslint-disable @next/next/no-img-element */
import { Dock } from "./ActionsDock/Dock";
import { DockCard } from "./ActionsDock/DockCard";
import { DevCardDisplay } from "./DevCardDisplay";
import { PlayerAvatarStats } from "./PlayerAvatarStats";
import { TurnControlCluster } from "./TurnControlCluster";
import { getBadgeClasses } from "./CardStackStyles";
import React, { useMemo } from "react";
import { useDie } from "./Die";
import { useEffectListener } from "bgio-effects/react";
import {
  canBuildRoad,
  canBuildSettlement,
  canBuildCity,
  canMaritimeTrade,
  canAfford,
  getPlayableDevCardCounts,
  buildableNodes,
  buildableEdges,
  getVictoryPoints,
  getPublicVictoryPoints,
} from "@settlex/game-core";
import { getMaritimeTradeRateIfTradable } from "../utils/trade";
import { getBuildPickupPieceType } from "../utils/playerAction";
import { getTurnControlMode } from "../utils/turnControlMode";
import {
  RESOURCE_ICON_FILES_BY_RESOURCE,
  getClassicResourceIconPath,
  getClassicSvgPath,
  getResourceIconPath,
  getThemedSvgPath,
  handleThemeImageError,
} from "../theme/themes";
import { getPieceSvgFile } from "../theme/pieceAssets.js";

const BUILD_PICKUP_PRELAUNCH_DELAY_MS = 132;
const DEV_CARD_PRELAUNCH_DELAY_MS = 320;
const LOW_TIMER_THRESHOLD_SECONDS = 5;

const getTimerSeconds = (ms) => {
  if (ms == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(ms / 1000));
};

const formatTimer = (ms) => {
  if (ms == null) return null;
  const total = getTimerSeconds(ms);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const CardIcon = ({
  resourceCount,
  resource,
  player,
  onResourceClick,
  themeId,
}) => {
  const handleClick = () => {
    if (onResourceClick) {
      onResourceClick(resource);
    }
  };
  const iconSrc = getResourceIconPath(themeId, resource);
  const iconFallback = getClassicResourceIconPath(resource);

  return (
    <div
      className={`flex items-center mr-6 ${onResourceClick ? "cursor-pointer" : ""}`}
      id={`p${player}-${resource}`}
      onClick={onResourceClick ? handleClick : undefined}
      
    >
      <div className="w-7 text-center leading-none select-none text-white mr-1 text-3xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
        {resourceCount}
      </div>
      <img
        src={iconSrc}
        alt=""
        className="h-10 w-10 object-contain"
        draggable={false}
        onError={(event) => handleThemeImageError(event, iconFallback)}
      />
    </div>
  );
};

export const PlayerActionContainer = ({
  setPlayerAction,
  buildPickup,
  setBuildPickup,
  bgioProps,
  player,
  presence,
  onTradeClick,
  onDevCardPurchaseStart,
  devCardDisplayRef,
  displayDevCards,
  keepDevCardShellMounted,
  vpDisplayOverride,
  isActive,
  statusType,
  gameStatus,
  canRoll,
  canEnd,
  timerMs,
  themeId,
  showTurnControls = true,
}) => {
  const { G, ctx, moves } = bgioProps;
  const SHOW_PLAYER_HAND_BADGES = false;
  const activePickupPieceType = buildPickup?.pieceType ?? null;

  const copyTriggerRect = (triggerRect) => {
    if (!triggerRect) return null;
    return {
      left: triggerRect.left,
      top: triggerRect.top,
      width: triggerRect.width,
      height: triggerRect.height,
      right: triggerRect.right,
      bottom: triggerRect.bottom
    };
  };

  const startBuildPickup = (
    playerAction,
    triggerRect,
    preLaunchDelayMs = 0
  ) => {
    const pieceType = getBuildPickupPieceType(playerAction);
    if (!pieceType) return;

    setPlayerAction(playerAction);
    setBuildPickup({
      pieceType,
      originRect: copyTriggerRect(triggerRect),
      startedAtMs: Date.now(),
      launchDelayMs: preLaunchDelayMs
    });
  };

  const startDevCardPurchaseReveal = ({
    triggerRect,
    preLaunchDelayMs = 0,
  } = {}) => {
    const totalPoints = G.core ? getVictoryPoints(G.core, player.id) : 0;
    const publicPoints = G.core ? getPublicVictoryPoints(G.core, player.id) : 0;

    onDevCardPurchaseStart?.({
      playerId: player.id,
      triggerRect: copyTriggerRect(triggerRect),
      preLaunchDelayMs,
      beforeCards: Array.isArray(player.devCards) ? [...player.devCards] : [],
      vpSnapshot: {
        publicPoints,
        totalPoints,
      },
      startedAtMs: Date.now(),
    });
    moves.buyDevCard();
  };

  const [Die, rollTo] = useDie(G.diceRoll[0]);
  const [Die2, rollTo2] = useDie(G.diceRoll[1]);
  const clientPlayerID = bgioProps.playerID;
  const isMe = clientPlayerID === player.id;
  const stage = ctx.activePlayers?.[player.id];
  const isDevStage = stage === "preRoll" || stage === "postRoll";
  const devPlayActive = G.devCardPlay && G.devCardPlay.playerId === player.id;
  const canStartDev =
    isMe && ctx.currentPlayer === player.id && isDevStage && !devPlayActive;
  const devPlayableCountsByType = useMemo(() => {
    if (!G.core || !player?.devCards || !canStartDev) return {};
    return getPlayableDevCardCounts(G.core, player.id);
  }, [G.core, player?.devCards, player.id, canStartDev]);
  const resourceCounts = useMemo(() => {
    const counts = {};
    for (const resource of player.resources) {
      counts[resource] = (counts[resource] ?? 0) + 1;
    }
    return counts;
  }, [player.resources]);
  const timerText = formatTimer(timerMs);
  const showStatusTimer = gameStatus?.showTimer !== false && Boolean(timerText);
  const isStatusTimerLow = showStatusTimer && getTimerSeconds(timerMs) <= LOW_TIMER_THRESHOLD_SECONDS;
  const isSeatWarning =
    presence?.status === "disconnected" || presence?.status === "idle";
  const pieceColor = player.color ?? "red";

  const activeDevCardType = devPlayActive ? G.devCardPlay.type : null;

  //dice roll animation
  useEffectListener(
    "roll",
    (dice) => {
      rollTo(dice[0]);
      rollTo2(dice[1]);
    },
    []
  );
  const ACTIONS = [
    {
      name: "trade",
      action: onTradeClick, // Opens the modal
      img: getThemedSvgPath(themeId, "icon_trade.svg"), // Placeholder icon for trade, maybe use a custom one later
      fallbackImg: getClassicSvgPath("icon_trade.svg"),
      count: 0,
      enabled: ctx.currentPlayer === player.id && ctx.phase === 'main', // Only enable trade during main phase & turn
      style: null, 
    },
    {
      name: "road",
      action: ({ triggerRect, preLaunchDelayMs }) =>
        startBuildPickup("placeRoad", triggerRect, preLaunchDelayMs),
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
        startBuildPickup("placeSettlement", triggerRect, preLaunchDelayMs),
      img: getThemedSvgPath(themeId, getPieceSvgFile("settlement", pieceColor)),
      fallbackImg: getClassicSvgPath(getPieceSvgFile("settlement", pieceColor)),
      count: player.settlementsRemaining,
      enabled: false,
      style: null,
      selected: buildPickup?.pieceType === "settlement",
      preLaunchDelayMs: BUILD_PICKUP_PRELAUNCH_DELAY_MS,
    },
    {
      name: "city",
      action: ({ triggerRect, preLaunchDelayMs }) =>
        startBuildPickup("placeCity", triggerRect, preLaunchDelayMs),
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
      action: startDevCardPurchaseReveal,
      img: getThemedSvgPath(themeId, "icon_devcard.svg"),
      fallbackImg: getClassicSvgPath("icon_devcard.svg"),
      preLaunchImg: getThemedSvgPath(themeId, "icon_devcard_emblem.svg"),
      preLaunchFallbackImg: getClassicSvgPath("icon_devcard_emblem.svg"),
      count: 0,
      enabled: false,
      style: null,
      preLaunchDelayMs: DEV_CARD_PRELAUNCH_DELAY_MS,
    },
    null
  ];

  const isActionEnabled = (actionName) => {
    // UI-level checks (boardgame.io state)
    if (ctx.currentPlayer !== player.id.toString()) return false;
    if (ctx.activePlayers?.[player.id] !== "postRoll") {
        if (actionName === 'devCard') console.log(`DevCard disabled: Wrong phase/stage. Current: ${ctx.activePlayers?.[player.id]}`);
        return false;
    }
    if (!G.core) return false;

    // Game rule checks (from game-core)
    switch (actionName) {
      case 'road':
        if (!canBuildRoad(G.core, player.id).ok) return false;
        // Check if there are any buildable edges
        return buildableEdges(G.core, G.coreTopology, player.id, { initialPlacement: false }).length > 0;
      case 'settlement':
        if (!canBuildSettlement(G.core, player.id).ok) return false;
        // Check if there are any buildable nodes
        return buildableNodes(G.core, G.coreTopology, player.id, { initialPlacement: false }).length > 0;
      case 'city':
        if (!canBuildCity(G.core, player.id).ok) return false;
        // Check if player has any settlements to upgrade
        // City build rule: must replace an existing settlement of the player
        const settlements = Object.values(G.core.buildingsByNodeId).filter(
          b => b.ownerId === player.id && b.type === 'settlement'
        );
        return settlements.length > 0;
      case 'trade':
        // Check if player has enough resources to trade at ANY rate
        return canMaritimeTrade(G.core, G.coreTopology, player.id).ok;
      case 'devCard':
        if (!G.core.devDeck.length) {
            console.log("DevCard disabled: Deck empty");
            return false;
        }
        const affordable = canAfford(G.core.ruleset.buildCosts.devCard, player.resources);
        if (!affordable) {
             console.log("DevCard disabled: Cant afford", { cost: G.core.ruleset.buildCosts.devCard, resources: player.resources });
        }
        return affordable;
      default:
        return false;
    }
  };

  const dynamicActions = ACTIONS.map((action) => {
    if (!action) return null;
    const pieceType = getBuildPickupPieceType(`place${action.name[0]?.toUpperCase() ?? ""}${action.name.slice(1)}`);
    return {
      ...action,
      enabled: isActionEnabled(action.name),
      selected: action.selected ?? pieceType === activePickupPieceType,
    };
  });

  const canTradeNow = isActionEnabled("trade");
  const rollEnabled = Boolean(canRoll);
  const endTurnEnabled = Boolean(canEnd);
  const turnControlMode = getTurnControlMode({
    canRoll: rollEnabled,
    canEnd: endTurnEnabled,
  });

  const canQuickTradeResource = (resource) => {
    if (!onTradeClick || !canTradeNow) return false;
    return !!getMaritimeTradeRateIfTradable({
      core: G.core,
      coreTopology: G.coreTopology,
      playerId: player.id,
      resource,
      playerResources: player.resources
    });
  };

  const handleResourceClick = (resource) => {
    if (!onTradeClick) return;
    if (!canTradeNow) return;

    const rate = getMaritimeTradeRateIfTradable({
      core: G.core,
      coreTopology: G.coreTopology,
      playerId: player.id,
      resource,
      playerResources: player.resources
    });

    if (!rate) return;
    onTradeClick(resource);
  };

  // Calculate if player is over discard limit
  const totalResources = player.resources.length;
  const discardLimit = G.core?.ruleset?.discardLimit ?? 7;
  const isOverLimit = totalResources > discardLimit;

  // Determine container styling based on limit status
  const containerStyle = isSeatWarning
    ? "bg-rose-100/80 ring-white/60 seat-disconnected-panel seat-disconnected-pulse"
    : isOverLimit
    ? "bg-rose-500 bg-opacity-40 ring-rose-500"
    : "bg-blue-200 bg-opacity-50 ring-white/60";
  const rollContent = (
    <>
      <Die dieSize="3.5rem" />
      <Die2 dieSize="3.5rem" />
    </>
  );

  return (
    <div className="fixed bottom-4 left-0 right-0 pointer-events-none px-4">
      <div className="relative flex items-end">
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 flex items-end pointer-events-auto"
        data-allow-interaction="true"
      >
        {/* Avatar + centered dock */}
        <PlayerAvatarStats
          player={player}
          presence={presence}
          core={G.core}
          coreTopology={G.coreTopology}
          isMe={isMe}
          isActive={isActive}
          statusType={statusType}
          vpDisplayOverride={vpDisplayOverride}
        />

        <div className="relative">
          <div className={`relative h-20 ml-4 mr-4 flex pl-4 rounded-md ring-2 transition-colors duration-300 ${containerStyle}`}>
            <Dock>
            {dynamicActions.map((action, index) =>
              action ? (
                <DockCard key={action.name ?? index} action={action} />
              ) : (
                <span key={`empty-${index}`} />
              )
            )}
            </Dock>
            <div className="flex self-end mb-4">
              {Object.keys(RESOURCE_ICON_FILES_BY_RESOURCE).map((resource) => {
                const canQuickTrade = canQuickTradeResource(resource);
                return (
                  <CardIcon
                    resourceCount={resourceCounts[resource] ?? 0}
                    key={resource}
                    resource={resource}
                    //TODO: change this for more players:
                    player={player.id}
                    onResourceClick={canQuickTrade ? handleResourceClick : null}
                    themeId={themeId}
                  />
                );
              })}
            </div>
            {SHOW_PLAYER_HAND_BADGES && (
              <div className={getBadgeClasses(isOverLimit ? "danger" : "default")}>
                {totalResources}
              </div>
            )}
          </div>
          {/* Dev Card Display */}
          <div className="absolute left-full ml-0 bottom-[-2px]">
            <DevCardDisplay
              cards={displayDevCards ?? player.devCards}
              playableCountsByType={devPlayableCountsByType}
              onPlayCard={(card) => moves.playDevCardStart(card)}
              activeCardType={activeDevCardType}
              showCountBadge={SHOW_PLAYER_HAND_BADGES}
              containerRef={devCardDisplayRef}
              forceMount={Boolean(keepDevCardShellMounted)}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none flex-1 flex items-end justify-end self-end pr-2 sm:pr-3 md:pr-4 lg:pr-4">
        {showTurnControls ? (
          <TurnControlCluster
            mode={turnControlMode}
            statusText={gameStatus ? gameStatus.title : null}
            timerText={timerText}
            showTimer={showStatusTimer}
            isTimerLow={isStatusTimerLow}
            rollContent={rollContent}
            onRoll={rollEnabled ? () => moves.rollDice() : undefined}
            onEndTurn={
              endTurnEnabled
                ? () => {
                    setPlayerAction(null);
                    setBuildPickup(null);
                    moves.endTurn();
                  }
                : undefined
            }
          />
        ) : null}
      </div>
      </div>
    </div>
  );
};
