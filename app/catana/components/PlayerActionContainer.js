/* eslint-disable @next/next/no-img-element */
import { Dock } from "./ActionsDock/Dock";
import { DockCard } from "./ActionsDock/DockCard";
import { DevCardDisplay } from "./DevCardDisplay";
import { PlayerAvatarStats } from "./PlayerAvatarStats";
import { TurnControlCluster } from "./TurnControlCluster";
import { AnimatedCount } from "./AnimatedCount";
import { getBadgeClasses } from "./CardStackStyles";
import React, { useCallback, useEffect } from "react";
import { useDie } from "./Die";
import { buildDiceAnimationPair } from "./diceAnimationPlan";
import { useEffectListener } from "bgio-effects/react";
import {
  getVictoryPoints,
  getPublicVictoryPoints,
} from "@settlex/game-core";
import { getBuildPickupPieceType } from "../utils/playerAction";
import { useLocalPlayerDockModel } from "./useLocalPlayerDockModel";
import "./hudGlass.css";
import {
  RESOURCE_ICON_FILES_BY_RESOURCE,
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "../theme/themes";

const FALLBACK_DICE_ROLL_MS = 1000;
const FALLBACK_DICE_SLOWDOWN_START_MS = 400;

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

export const CardIcon = ({
  resourceCount,
  resource,
  player,
  onResourceClick,
  themeId,
  isLast = false,
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
      className={`flex items-center ${isLast ? "" : "mr-6"} ${onResourceClick ? "cursor-pointer" : ""}`}
      id={`p${player}-${resource}`}
      onClick={onResourceClick ? handleClick : undefined}
      
    >
      <div className="w-7 text-center leading-none select-none text-white mr-1 text-3xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
        <AnimatedCount
          value={resourceCount}
          className="resource-dock-count"
          ariaLabel={`${resourceCount} ${resource}`}
        />
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
  effectsBus = null,
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
  knightDisplayOverride,
  isActive,
  statusType,
  gameStatus,
  canRoll,
  canEnd,
  timerMs,
  themeId,
  showTurnControls = true,
  layoutOffsetX = 0,
}) => {
  const { G, ctx, moves } = bgioProps;
  const SHOW_PLAYER_HAND_BADGES = false;

  const startBuildPickup = useCallback(
    (playerAction, triggerRect, preLaunchDelayMs = 0) => {
      const pieceType = getBuildPickupPieceType(playerAction);
      if (!pieceType) return;

      setPlayerAction(playerAction);
      setBuildPickup({
        pieceType,
        originRect: copyTriggerRect(triggerRect),
        startedAtMs: Date.now(),
        launchDelayMs: preLaunchDelayMs
      });
    },
    [setBuildPickup, setPlayerAction]
  );

  const startDevCardPurchaseReveal = useCallback(
    ({
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
    },
    [G.core, moves, onDevCardPurchaseStart, player.devCards, player.id]
  );

  const [Die, rollTo] = useDie(G.diceRoll[0]);
  const [Die2, rollTo2] = useDie(G.diceRoll[1]);
  const clientPlayerID = bgioProps.playerID;
  const isMe = clientPlayerID === player.id;
  const playerHudRef = React.useRef(null);
  const localResourceRailRef = React.useRef(null);
  const [localDockAnchorStyle, setLocalDockAnchorStyle] = React.useState(null);
  const {
    activeDevCardType,
    canQuickTradeResource,
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
  } = useLocalPlayerDockModel({
    G,
    ctx,
    player,
    clientPlayerID,
    buildPickup,
    displayDevCards,
    keepDevCardShellMounted,
    onTradeClick,
    onBuildAction: startBuildPickup,
    onDevCardPurchase: startDevCardPurchaseReveal,
    canRoll,
    canEnd,
    timerMs,
    statusType,
    gameStatus,
    themeId,
  });
  const isSeatWarning =
    presence?.status === "disconnected" || presence?.status === "idle";

  const playDiceRoll = useCallback(
    ({ dice, timeline = {} }) => {
      if (!Array.isArray(dice) || dice.length < 2) return;
      const [firstDieAnimation, secondDieAnimation] = buildDiceAnimationPair({
        dice,
        timeline
      });
      rollTo(firstDieAnimation);
      rollTo2(secondDieAnimation);
    },
    [rollTo, rollTo2]
  );

  useEffect(() => {
    if (!effectsBus) return undefined;
    return effectsBus.on("dice:roll:timeline", (event) => {
      playDiceRoll({
        dice: event.payload?.dice,
        timeline: event.payload?.timeline
      });
    });
  }, [effectsBus, playDiceRoll]);

  const updateLocalDockAnchor = useCallback(() => {
    const hudNode = playerHudRef.current;
    const railNode = localResourceRailRef.current;
    if (!hudNode || !railNode) {
      setLocalDockAnchorStyle(null);
      return;
    }

    const hudRect = hudNode.getBoundingClientRect();
    const railRect = railNode.getBoundingClientRect();
    const nextStyle = {
      left: Math.round(railRect.left - hudRect.left),
      width: Math.round(railRect.width),
    };

    setLocalDockAnchorStyle((currentStyle) => {
      if (
        currentStyle?.left === nextStyle.left &&
        currentStyle?.width === nextStyle.width
      ) {
        return currentStyle;
      }
      return nextStyle;
    });
  }, []);

  useEffect(() => {
    updateLocalDockAnchor();
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    updateLocalDockAnchor();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateLocalDockAnchor)
        : null;
    if (playerHudRef.current) observer?.observe(playerHudRef.current);
    if (localResourceRailRef.current) observer?.observe(localResourceRailRef.current);

    window.addEventListener("resize", updateLocalDockAnchor);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateLocalDockAnchor);
    };
  }, [updateLocalDockAnchor]);

  // dice roll animation
  useEffectListener(
    "roll",
    (dice) => {
      if (effectsBus) return;
      playDiceRoll({
        dice,
        timeline: {
          rollMs: FALLBACK_DICE_ROLL_MS,
          slowdownStartMs: FALLBACK_DICE_SLOWDOWN_START_MS
        }
      });
    },
    [effectsBus, playDiceRoll]
  );
  const devCardBayClassName = [
    "local-devcard-bay",
    showDevCardBay ? "local-devcard-bay--visible" : "local-devcard-bay--empty",
  ].join(" ");
  const localDockStyle = localDockAnchorStyle
    ? {
        left: `${localDockAnchorStyle.left}px`,
        width: `${localDockAnchorStyle.width}px`,
      }
    : {
        left: 0,
        visibility: "hidden",
        width: 0,
      };

  const rollContent = (
    <>
      <Die dieSize="3.15rem" />
      <Die2 dieSize="3.15rem" />
    </>
  );

  return (
    <div className="fixed bottom-4 left-0 right-0 pointer-events-none px-4">
      <div className="relative flex items-end">
        <div
          ref={playerHudRef}
          className="absolute left-1/2 bottom-0 flex items-end pointer-events-auto -translate-x-1/2"
          style={{
            left: layoutOffsetX
              ? `calc(50% + ${Math.round(layoutOffsetX)}px)`
              : undefined,
          }}
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
            knightDisplayOverride={knightDisplayOverride}
            statsPanelClassName={
              !isSeatWarning && isOverLimit ? "catana-hud-glass--danger" : ""
            }
            showStatsPanelNameplate={false}
            statsPanelChildrenClassName="flex min-w-0 flex-1 items-center justify-start gap-x-3"
            statsPanelChildren={
              <>
                <div
                  ref={localResourceRailRef}
                  className="relative flex h-20 items-end pl-4 pr-3"
                >
                  <div className="mb-4 flex self-end">
                    {Object.keys(RESOURCE_ICON_FILES_BY_RESOURCE).map((resource) => {
                      const canQuickTrade = canQuickTradeResource(resource);
                      return (
                      <CardIcon
                        resourceCount={resourceCounts[resource] ?? 0}
                        key={resource}
                        resource={resource}
                        isLast={
                          resource ===
                          Object.keys(RESOURCE_ICON_FILES_BY_RESOURCE).at(-1)
                        }
                        //TODO: change this for more players:
                        player={player.id}
                          onResourceClick={
                            canQuickTrade ? handleResourceClick : null
                          }
                          themeId={themeId}
                        />
                      );
                    })}
                  </div>
                  {SHOW_PLAYER_HAND_BADGES && (
                    <div
                      className={getBadgeClasses(
                        isOverLimit ? "danger" : "default"
                      )}
                    >
                      {totalResources}
                    </div>
                  )}
                </div>
                <div className={devCardBayClassName}>
                  {showDevCardBay && (
                    <>
                      <span
                        className="ml-0 mr-4 mb-3 h-14 w-px shrink-0 rounded-full bg-sky-200/45 shadow-[1px_0_0_rgba(255,255,255,0.32)]"
                        aria-hidden={true}
                      />
                      <DevCardDisplay
                        cards={visibleDevCards}
                        playerId={player.id}
                        playableCountsByType={devPlayableCountsByType}
                        onPlayCard={(card) => moves.playDevCardStart(card)}
                        activeCardType={activeDevCardType}
                        showCountBadge={SHOW_PLAYER_HAND_BADGES}
                        containerRef={devCardDisplayRef}
                        forceMount={Boolean(keepDevCardShellMounted)}
                        embedded={true}
                      />
                    </>
                  )}
                </div>
              </>
            }
          />
          <div
            className="absolute bottom-0 h-20 pointer-events-none"
            style={localDockStyle}
          >
            <Dock>
              {dynamicActions.map((action, index) =>
                action ? (
                  <DockCard key={action.name ?? index} action={action} />
                ) : (
                  <span key={`empty-${index}`} />
                )
              )}
            </Dock>
          </div>
        </div>

        <div className="pointer-events-none flex-1 flex items-end justify-end self-end pr-0">
          {showTurnControls ? (
            <TurnControlCluster
              mode={turnControlMode}
              statusText={gameStatus ? gameStatus.title : null}
              timerText={timerText}
              showTimer={showStatusTimer}
              isTimerLow={isLowTimerAlertActive}
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
