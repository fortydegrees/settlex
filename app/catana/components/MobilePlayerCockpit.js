/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPublicVictoryPoints,
  getLongestRoadLength,
  getVictoryPoints,
} from "@settlex/game-core";
import { DockCard } from "./ActionsDock/DockCard";
import { AnimatedCount } from "./AnimatedCount";
import { MobileDevCardButton } from "./MobileDevCardButton";
import { MobileDevCardTray } from "./MobileDevCardTray";
import { MobileInventoryBorderGlide } from "./MobileInventoryBorderGlide";
import { MiniDiceFace } from "./MiniDiceFace";
import { MobilePrimaryTurnButton } from "./MobilePrimaryTurnButton";
import { useLocalPlayerDockModel } from "./useLocalPlayerDockModel";
import { getBuildPickupPieceType } from "../utils/playerAction";
import { getPlayerColorOption } from "../theme/playerColors";
import {
  RESOURCE_ICON_FILES_BY_RESOURCE,
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "../theme/themes";
import "./hudGlass.css";

const RESOURCE_ORDER = Object.keys(RESOURCE_ICON_FILES_BY_RESOURCE);

const mobileMetaButtonIconClassName = "h-5 w-5";

const normalizeCommandDice = (diceRoll) => {
  if (!Array.isArray(diceRoll) || diceRoll.length < 2) return null;
  const dice = diceRoll.slice(0, 2).map((value) => Number(value));
  if (dice.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    return null;
  }
  return dice;
};

const LogIcon = ({ className = mobileMetaButtonIconClassName } = {}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 7h9" />
    <path d="M8 12h9" />
    <path d="M8 17h9" />
    <circle cx="5" cy="7" r="1" />
    <circle cx="5" cy="12" r="1" />
    <circle cx="5" cy="17" r="1" />
  </svg>
);

const ChatIcon = ({ className = mobileMetaButtonIconClassName } = {}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6.5 7.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4.5 3v-3H6.5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" />
  </svg>
);

const MobileMetaFeedTrigger = ({ activePanel, onOpen }) => (
  <div
    className="mobile-command-row__feed-trigger grid h-[3.85rem] grid-cols-2 overflow-hidden rounded-[1.15rem] border border-white/[0.42] bg-white/[0.22] text-slate-800 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.58),inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-xl"
    data-mobile-meta-feed-trigger="true"
    data-allow-interaction="true"
  >
    <button
      type="button"
      className={`catana-mobile-feed-control flex items-center justify-center border-r border-white/[0.24] transition-[background-color,transform] duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none ${
        activePanel === "log" ? "bg-white/[0.5]" : "hover:bg-white/[0.24]"
      }`}
      onClick={() => onOpen?.("log")}
      aria-label="Open game log"
      aria-pressed={activePanel === "log" ? "true" : "false"}
    >
      <LogIcon />
    </button>
    <button
      type="button"
      className={`catana-mobile-feed-control flex items-center justify-center transition-[background-color,transform] duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none ${
        activePanel === "chat" ? "bg-white/[0.5]" : "hover:bg-white/[0.24]"
      }`}
      onClick={() => onOpen?.("chat")}
      aria-label="Open chat"
      aria-pressed={activePanel === "chat" ? "true" : "false"}
    >
      <ChatIcon />
    </button>
  </div>
);

const copyTriggerRect = (triggerRect) => {
  if (!triggerRect) return null;
  return {
    left: triggerRect.left,
    top: triggerRect.top,
    width: triggerRect.width,
    height: triggerRect.height,
    right: triggerRect.right,
    bottom: triggerRect.bottom,
  };
};

const MobileStatChip = ({ id, iconSrc, label, value, isAwarded }) => (
  <span
    id={id}
    className="flex min-w-[2.95rem] items-center justify-start gap-0.5 leading-none"
    aria-label={`${label}: ${value}`}
  >
    <img
      src={iconSrc}
      alt=""
      className="h-5 w-5 object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.36)]"
      draggable={false}
    />
    <AnimatedCount
      value={value}
      className={`w-5 text-center text-[1.08rem] drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] ${
        isAwarded ? "text-yellow-400 font-bold" : "text-white"
      }`}
      ariaLabel={`${label}: ${value}`}
    />
  </span>
);

const MobileResourceCount = ({
  playerId,
  resource,
  count,
  canQuickTrade,
  onResourceClick,
  themeId,
}) => {
  const iconSrc = getResourceIconPath(themeId, resource);
  const iconFallback = getClassicResourceIconPath(resource);
  const content = (
    <>
      <img
        src={iconSrc}
        alt=""
        className="h-6 w-6 object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.38)] min-[400px]:h-7 min-[400px]:w-7"
        draggable={false}
        onError={(event) => handleThemeImageError(event, iconFallback)}
      />
      <span className="text-[0.95rem] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(15,23,42,0.48)] min-[400px]:text-[1rem]">
        <AnimatedCount
          value={count}
          className="resource-dock-count"
          ariaLabel={`${count} ${resource}`}
        />
      </span>
    </>
  );

  if (canQuickTrade) {
    return (
      <button
        type="button"
        id={`p${playerId}-${resource}`}
        className="flex min-w-[1.9rem] flex-col items-center justify-end gap-0.5 rounded-[0.75rem] px-0.5 py-1 transition hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-white/75 min-[400px]:min-w-[2.2rem]"
        onClick={() => onResourceClick(resource)}
        aria-label={`Trade ${resource}`}
        data-allow-interaction="true"
      >
        {content}
      </button>
    );
  }

  return (
    <span
      id={`p${playerId}-${resource}`}
      className="flex min-w-[1.9rem] flex-col items-center justify-end gap-0.5 px-0.5 py-1 min-[400px]:min-w-[2.2rem]"
    >
      {content}
    </span>
  );
};

export function MobilePlayerCockpit({
  setPlayerAction,
  buildPickup,
  setBuildPickup,
  effectsBus = null,
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
  activePlayerName,
  canRoll,
  canEnd,
  timerMs,
  themeId,
  activeMobileMetaPanel = null,
  onMobileMetaPanelOpen,
  showTurnControls = true,
  diceRoll = null,
}) {
  const { G, ctx, moves } = bgioProps;
  const clientPlayerID = bgioProps.playerID;
  const [isDevTrayOpen, setIsDevTrayOpen] = useState(false);
  const emitHaptic = useCallback(
    (payload) => {
      const name = typeof payload === "string" ? payload : payload?.name;
      if (!name) return;
      effectsBus?.emit({ type: "haptic", payload: { name } });
    },
    [effectsBus]
  );

  const startBuildPickup = useCallback(
    (playerAction, triggerRect, preLaunchDelayMs = 0) => {
      const pieceType = getBuildPickupPieceType(playerAction);
      if (!pieceType) return;

      setPlayerAction(playerAction);
      setBuildPickup({
        pieceType,
        originRect: copyTriggerRect(triggerRect),
        startedAtMs: Date.now(),
        launchDelayMs: preLaunchDelayMs,
      });
    },
    [setBuildPickup, setPlayerAction]
  );

  const startDevCardPurchaseReveal = useCallback(
    ({ triggerRect, preLaunchDelayMs = 0 } = {}) => {
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

  const {
    activeDevCardType,
    canQuickTradeResource,
    devPlayableCountsByType,
    dynamicActions,
    endTurnEnabled,
    handleResourceClick,
    isOverLimit,
    resourceCounts,
    rollEnabled,
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

  const showPrimaryAction = turnControlMode !== "inactive";
  const showCommandRow = showTurnControls;
  const hasVisibleDevCards = visibleDevCards.length > 0;
  const showMobileDevCardButton =
    hasVisibleDevCards || Boolean(keepDevCardShellMounted);
  const mobileActions = useMemo(
    () =>
      dynamicActions.map((action) => {
        if (!action) return null;
        return {
          ...action,
          action: (args) => {
            emitHaptic({ name: "ui:action:press" });
            action.action?.(args);
          }
        };
      }),
    [dynamicActions, emitHaptic]
  );
  const passiveCommandDice =
    showPrimaryAction || statusType !== "thinking"
      ? null
      : normalizeCommandDice(diceRoll);
  const passiveCommandLabel =
    gameStatus?.title ??
    (activePlayerName != null ? `${activePlayerName}'s turn` : "Waiting");
  const avatarColor = player.color
    ? getPlayerColorOption(player.color).gradient
    : "from-slate-500 to-slate-800";
  const currentRoadLength = G.core && G.coreTopology
    ? getLongestRoadLength(G.core, G.coreTopology, player.id)
    : 0;
  const currentArmySize =
    knightDisplayOverride?.knightsPlayed ?? player.knightsPlayed ?? 0;
  const hasLongestRoad = G.core?.awards?.longestRoadOwnerId === player.id;
  const displayedLargestArmyOwnerId =
    knightDisplayOverride?.largestArmyOwnerId ?? G.core?.awards?.largestArmyOwnerId;
  const hasLargestArmy = displayedLargestArmyOwnerId === player.id;
  const mobileVpDisplay =
    vpDisplayOverride?.totalPoints ??
    (G.core ? getVictoryPoints(G.core, player.id) : 0);
  const isSeatWarning =
    presence?.status === "disconnected" || presence?.status === "idle";

  useEffect(() => {
    if (!hasVisibleDevCards) {
      setIsDevTrayOpen(false);
    }
  }, [hasVisibleDevCards]);

  const handleDevTrayToggle = useCallback(() => {
    if (!hasVisibleDevCards) return;
    emitHaptic({ name: "ui:tray:toggle" });
    setIsDevTrayOpen((current) => !current);
  }, [emitHaptic, hasVisibleDevCards]);

  const handleDevTrayClose = useCallback(() => {
    setIsDevTrayOpen(false);
  }, []);

  const handleMobileDevCardPlay = useCallback(
    (cardType) => {
      emitHaptic({ name: "ui:action:press" });
      moves.playDevCardStart(cardType);
      setIsDevTrayOpen(false);
    },
    [emitHaptic, moves]
  );

  const handleMobileResourceClick = useCallback(
    (resource) => {
      emitHaptic({ name: "ui:action:press" });
      handleResourceClick(resource);
    },
    [emitHaptic, handleResourceClick]
  );

  return (
    <div className="mobile-player-cockpit-shell pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[28rem] flex-col gap-2">
        <div
          className="mobile-player-cockpit flex flex-col"
          data-mobile-player-cockpit="true"
          data-allow-interaction="true"
        >
          <div
            className={`relative flex h-[3.15rem] items-end justify-center gap-4 overflow-visible transition-[margin,transform] duration-200 ease-out ${
              isDevTrayOpen
                ? "z-[70] -mb-5"
                : "z-20 -mb-5"
            }`}
            data-mobile-action-dock={isDevTrayOpen ? "dev-tray-open" : "closed"}
          >
            {mobileActions.filter(Boolean).map((action) => (
              <DockCard key={action.name} action={action} />
            ))}
          </div>

          <div
            className={`mobile-player-inventory relative flex min-w-0 flex-col rounded-[1.25rem] border px-2.5 pb-2.5 pt-5 backdrop-blur-2xl transition-[background-color,border-color,box-shadow,padding] duration-200 ease-out ${
              isOverLimit
                ? "border-rose-300/80 bg-rose-400/[0.3] shadow-[0_18px_46px_-26px_rgba(190,18,60,0.68),0_0_0_1px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_0_24px_rgba(244,63,94,0.18)] ring-1 ring-rose-200/65"
                : "border-white/[0.28] bg-white/[0.14] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.72),inset_0_1px_0_rgba(255,255,255,0.24)]"
            } ${isActive ? "mobile-player-inventory--active" : ""}`}
            data-mobile-inventory-tone={isOverLimit ? "danger" : "default"}
          >
            {isActive ? <MobileInventoryBorderGlide /> : null}

            {hasVisibleDevCards ? (
              <div
                className={`grid w-full transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
                  isDevTrayOpen
                    ? "mb-1 grid-rows-[1fr] opacity-100"
                    : "mb-0 grid-rows-[0fr] opacity-0"
                }`}
                data-mobile-devcard-expander={isDevTrayOpen ? "open" : "closed"}
              >
                <div className="min-h-0 overflow-hidden">
                  <MobileDevCardTray
                    cards={visibleDevCards}
                    playableCountsByType={devPlayableCountsByType}
                    activeCardType={activeDevCardType}
                    onPlayCard={handleMobileDevCardPlay}
                    onClose={handleDevTrayClose}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex w-full min-w-0 items-center gap-1.5 min-[400px]:gap-2.5">
            <div className="relative flex shrink-0 items-center">
              {isActive ? (
                <span className="absolute left-[-1.1rem] top-1/2 -translate-y-1/2">
                  <span className="turn-chevron" />
                </span>
              ) : null}
              <div
                className={`relative flex h-[3.65rem] w-[3.65rem] items-center justify-center rounded-[0.9rem] bg-gradient-to-t text-[2.45rem] ring-2 ${
                  isSeatWarning ? "seat-disconnected-avatar" : ""
                } ${
                  isOverLimit
                    ? "ring-rose-300 shadow-[0_16px_32px_-20px_rgba(190,18,60,0.82),0_0_0_1px_rgba(255,255,255,0.28)]"
                    : "ring-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.68)]"
                } ${avatarColor}`}
                data-mobile-avatar-tone={isOverLimit ? "danger" : "default"}
              >
                {player.emoji || "🤠"}
                <span className="absolute left-0 top-0 z-10 flex h-5 min-w-5 -translate-x-[35%] -translate-y-1/2 transform items-center justify-center rounded-full border border-sky-200/65 bg-slate-50/95 px-1 text-[0.78rem] font-semibold leading-none text-slate-800 shadow-[0_0_0_2px_rgba(255,255,255,0.56),0_8px_16px_-14px_rgba(15,23,42,0.72)]">
                  <AnimatedCount
                    value={mobileVpDisplay}
                    className="player-vp-count"
                  />
                </span>
                {isSeatWarning ? (
                  <span className="absolute bottom-1 right-1 text-[0.9rem] leading-none">
                    ⚠️
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-1 pr-0">
              <MobileStatChip
                id={`p${player.id}-longest-road`}
                iconSrc="/svgs/icon_longest_road.svg"
                label="Longest road"
                value={currentRoadLength}
                isAwarded={hasLongestRoad}
              />
              <MobileStatChip
                id={`p${player.id}-largest-army`}
                iconSrc="/svgs/icon_largest_army.svg"
                label="Largest army"
                value={currentArmySize}
                isAwarded={hasLargestArmy}
              />
            </div>

            <span
              className="-ml-1 h-10 w-px shrink-0 rounded-full bg-sky-100/35 shadow-[1px_0_0_rgba(255,255,255,0.2)]"
              aria-hidden={true}
            />

            <div
              id={`p${player.id}-resources`}
              className="flex min-w-0 flex-1 items-end justify-around gap-0 min-[400px]:gap-0.5"
            >
              {RESOURCE_ORDER.map((resource) => (
                <MobileResourceCount
                  key={resource}
                  playerId={player.id}
                  resource={resource}
                  count={resourceCounts[resource] ?? 0}
                  canQuickTrade={canQuickTradeResource(resource)}
                  onResourceClick={handleMobileResourceClick}
                  themeId={themeId}
                />
              ))}
            </div>

            {showMobileDevCardButton ? (
              <MobileDevCardButton
                cards={visibleDevCards}
                playerId={player.id}
                playableCountsByType={devPlayableCountsByType}
                isOpen={isDevTrayOpen}
                onToggle={handleDevTrayToggle}
                containerRef={devCardDisplayRef}
                forceMount={Boolean(keepDevCardShellMounted)}
              />
            ) : null}
            </div>

          </div>

        </div>

        {showCommandRow ? (
          <div
            className="grid grid-cols-[6.25rem_minmax(0,1fr)] gap-2"
            data-mobile-command-row="true"
          >
            <MobileMetaFeedTrigger
              activePanel={activeMobileMetaPanel}
              onOpen={onMobileMetaPanelOpen}
            />
            {showPrimaryAction ? (
              <MobilePrimaryTurnButton
                mode={turnControlMode}
                canRoll={rollEnabled}
                canEnd={endTurnEnabled}
                onHaptic={emitHaptic}
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
            ) : (
              <div
                className="mobile-command-row__status flex h-[3.85rem] min-w-0 items-center justify-center rounded-[1.15rem] border border-white/[0.38] bg-white/[0.2] px-3 text-center text-[0.95rem] font-extrabold leading-tight text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.56),inset_0_1px_0_rgba(255,255,255,0.26)] backdrop-blur-xl"
                data-mobile-command-status="true"
                data-allow-interaction="true"
              >
                <span className="flex min-w-0 max-w-full items-center justify-center gap-2 drop-shadow-[0_1px_1px_rgba(15,23,42,0.45)]">
                  <span className="min-w-0 overflow-hidden whitespace-normal [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {passiveCommandLabel}
                  </span>
                  {passiveCommandDice ? (
                    <>
                      <span className="sr-only">
                        {` / Rolled ${passiveCommandDice[0]} and ${passiveCommandDice[1]}`}
                      </span>
                      <span
                        className="inline-flex shrink-0 items-center gap-1"
                        aria-hidden="true"
                      >
                        {passiveCommandDice.map((die, index) => (
                          <MiniDiceFace
                            key={`${die}-${index}`}
                            value={die}
                            className="h-6 w-6"
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                    </>
                  ) : null}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
