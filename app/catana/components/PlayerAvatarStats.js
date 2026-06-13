import Image from "./NextImage";
import { useMemo } from "react";
import longestRoadIcon from "../../../public/svgs/icon_longest_road.svg";
import largestArmyIcon from "../../../public/svgs/icon_largest_army.svg";
import { AnimatedCount } from "./AnimatedCount";
import { StatusBubble } from "./StatusBubble";
import {
  getLongestRoadLength,
  getVictoryPoints,
  getPublicVictoryPoints,
} from "@settlex/game-core";
import { getVpDisplay } from "./PlayerAvatarStatsUtils";
import { getPlayerColorOption } from "../theme/playerColors";
import "./hudGlass.css";
import "./PlayerAvatarStats.css";

const formatPresenceTimer = (ms) => {
  if (ms == null) return null;
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const PlayerAvatarStats = ({
  player,
  core,
  coreTopology,
  isMe,
  isActive,
  statusType,
  presence,
  vpDisplayOverride,
  knightDisplayOverride,
  statsPanelChildren = null,
  statsPanelClassName = "",
  avatarClassName = "",
  showStatsPanelNameplate = true,
  statsPanelChildrenClassName = "flex min-w-0 flex-1 items-center justify-center gap-x-3",
}) => {
  const playerId = player?.id ?? null;
  const currentRoadLength = useMemo(
    () =>
      playerId != null && core && coreTopology
        ? getLongestRoadLength(core, coreTopology, playerId)
        : 0,
    [core, coreTopology, playerId]
  );
  const totalPoints = useMemo(
    () =>
      vpDisplayOverride?.totalPoints ??
      (playerId != null && core ? getVictoryPoints(core, playerId) : 0),
    [core, playerId, vpDisplayOverride?.totalPoints]
  );
  const publicPoints = useMemo(
    () =>
      vpDisplayOverride?.publicPoints ??
      (playerId != null && core ? getPublicVictoryPoints(core, playerId) : 0),
    [core, playerId, vpDisplayOverride?.publicPoints]
  );

  if (!player) return null;

  const avatarColor = player.color
    ? getPlayerColorOption(player.color).gradient
    : "from-slate-500 to-slate-800";
  const currentArmySize =
    knightDisplayOverride?.knightsPlayed ?? player.knightsPlayed ?? 0;
  const hasLongestRoad = core?.awards?.longestRoadOwnerId === playerId;
  const displayedLargestArmyOwnerId =
    knightDisplayOverride?.largestArmyOwnerId ?? core?.awards?.largestArmyOwnerId;
  const hasLargestArmy = displayedLargestArmyOwnerId === playerId;
  const vpDisplay = getVpDisplay({ publicPoints, totalPoints, isMe });
  const vpMotionValue = isMe ? totalPoints : publicPoints;
  const isDisconnected = presence?.status === "disconnected";
  const isIdle = presence?.status === "idle";
  const isSeatWarning = isDisconnected || isIdle;
  const presenceLabel = presence?.status === "idle" ? "Idle" : "Disconnected";
  const presenceTimerText =
    isSeatWarning && presence?.remainingMs != null
      ? formatPresenceTimer(presence.remainingMs)
      : null;
  const hasExtendedStatsPanel = Boolean(statsPanelChildren);
  const displayName =
    String(player.name ?? player.username ?? `Player ${player.id}`).trim() ||
    `Player ${player.id}`;
  const statsPanelBaseClassName = hasExtendedStatsPanel
    ? "catana-hud-glass catana-hud-glass--compact relative -ml-4 flex h-20 min-w-[17.75rem] items-center rounded-l-none rounded-r-[1.35rem] border-l-0 py-1 pl-8 pr-4"
    : "catana-hud-glass catana-hud-glass--compact -ml-4 flex h-20 items-center gap-x-2 rounded-l-none rounded-r-[1.35rem] border-l-0 px-3 pl-8";
  const vpBadgeClassName =
    hasExtendedStatsPanel && showStatsPanelNameplate
      ? "catana-hud-vp-badge absolute bottom-0 right-0 z-20 translate-x-1/2 translate-y-1/2 transform"
      : "catana-hud-vp-badge absolute right-0 top-0 z-10 -translate-y-1/2 translate-x-1/2 transform";
  const statsBlock = (
    <div className="flex shrink-0 flex-col gap-y-1">
      <div className="flex items-center" id={`p${player.id}-longest-road`}>
        <div className="w-8 h-8 flex items-center justify-center">
          <Image
            src={longestRoadIcon}
            alt="Longest road"
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        <span
          className={`w-6 text-center text-xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] ${
            hasLongestRoad ? "text-yellow-400 font-bold" : "text-white"
          }`}
        >
          {currentRoadLength}
        </span>
      </div>
      <div className="flex items-center" id={`p${player.id}-largest-army`}>
        <div className="w-8 h-8 flex items-center justify-center">
          <Image
            src={largestArmyIcon}
            alt="Largest army"
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        <span
          className={`w-6 text-center text-xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] ${
            hasLargestArmy ? "text-yellow-400 font-bold" : "text-white"
          }`}
        >
          {currentArmySize}
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <div
        className={`flex items-start ${
          isSeatWarning ? "seat-disconnected-pulse" : ""
        }`}
      >
        <div className="flex w-20 items-center justify-center">
          <span className="flex relative">
            {isActive && (
              <span className="absolute left-[-1.4rem] top-1/2 -translate-y-1/2">
                <span className="turn-chevron" />
              </span>
            )}
            <div
              className={`relative z-10 h-20 w-20 rounded-[1.15rem] bg-gradient-to-t ring-4 ring-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.58)] flex justify-center items-center text-6xl ${
                isSeatWarning ? "seat-disconnected-avatar" : ""
              } ${avatarColor} ${isActive ? "avatar-active-glow" : ""} ${avatarClassName}`}
            >
              {player.emoji || "🤠"}
            </div>
            <span className={vpBadgeClassName}>
              <AnimatedCount
                value={vpDisplay}
                motionValue={vpMotionValue}
                className="player-vp-count"
              />
            </span>
            {isSeatWarning && (
              <span className="absolute bottom-1 right-1 text-[1rem] leading-none">
                ⚠️
              </span>
            )}
            {/* Only show status bubble for opponents, not for self */}
            {!isMe && !isSeatWarning && (
              <StatusBubble statusType={statusType} isVisible={isActive} />
            )}
          </span>
        </div>
        <span
          className={`${statsPanelBaseClassName} ${
            isSeatWarning
              ? "catana-hud-glass--warning seat-disconnected-panel"
              : ""
          } ${statsPanelClassName}`}
        >
          {hasExtendedStatsPanel ? (
            <>
              {showStatsPanelNameplate ? (
                <span
                  className={`catana-hud-nameplate ${
                    isSeatWarning ? "catana-hud-nameplate--warning" : ""
                  }`}
                  title={displayName}
                >
                  {displayName}
                </span>
              ) : null}
              <span className="flex w-full items-center">
                {statsBlock}
                <span
                  className="mx-4 h-14 w-px shrink-0 rounded-full bg-sky-200/45 shadow-[1px_0_0_rgba(255,255,255,0.32)]"
                  aria-hidden={true}
                />
                <span className={statsPanelChildrenClassName}>
                  {statsPanelChildren}
                </span>
              </span>
            </>
          ) : (
            statsBlock
          )}
        </span>
      </div>
      {isSeatWarning ? (
        <span className="absolute left-1/2 top-full mt-2 inline-flex min-w-[7rem] -translate-x-1/2 items-center justify-center gap-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.03em] text-rose-700 ring-1 ring-rose-200 shadow-sm whitespace-nowrap">
          <span>{presenceLabel}</span>
          {presenceTimerText ? (
            <span className="inline-block min-w-[2rem] tabular-nums text-right">
              {presenceTimerText}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
};
