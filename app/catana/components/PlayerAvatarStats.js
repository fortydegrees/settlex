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
  statsPanelChildrenClassName = "flex min-w-0 flex-1 items-center justify-center gap-x-ui-3",
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
    ? "catana-hud-glass catana-hud-glass--compact relative -ml-ui-4 flex h-20 min-w-[17.75rem] items-center rounded-l-none rounded-r-panel border-l-0 py-ui-1 pl-ui-8 pr-ui-4"
    : "catana-hud-glass catana-hud-glass--compact -ml-ui-4 flex h-20 items-center gap-x-ui-2 rounded-l-none rounded-r-panel border-l-0 px-ui-3 pl-ui-8";
  const vpBadgeClassName =
    hasExtendedStatsPanel && showStatsPanelNameplate
      ? "catana-hud-vp-badge absolute bottom-0 right-0 z-20 translate-x-1/2 translate-y-1/2 transform"
      : "catana-hud-vp-badge absolute right-0 top-0 z-10 -translate-y-1/2 translate-x-1/2 transform";
  const statsBlock = (
    <div className="flex shrink-0 flex-col gap-y-ui-1">
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
          className={`w-6 text-center drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] ${
            hasLongestRoad ? "type-hud-award-desktop-earned text-ink-hud-award" : "type-hud-award-desktop text-ink-hud-on-glass"
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
          className={`w-6 text-center drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] ${
            hasLargestArmy ? "type-hud-award-desktop-earned text-ink-hud-award" : "type-hud-award-desktop text-ink-hud-on-glass"
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
              className={`catana-hud-avatar relative z-10 h-20 w-20 bg-gradient-to-t ring-4 flex justify-center items-center text-6xl ${
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
                  className="catana-hud-divider mx-ui-4 h-14 w-px shrink-0 rounded-pill"
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
        <span className="catana-hud-presence absolute left-1/2 top-full mt-ui-2 inline-flex min-w-[7rem] -translate-x-1/2 items-center justify-center gap-ui-0 rounded-pill px-ui-2.5 py-ui-0.5 type-hud-presence whitespace-nowrap">
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
