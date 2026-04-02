import Image from "./NextImage";
import longestRoadIcon from "../../../public/svgs/icon_longest_road.svg";
import largestArmyIcon from "../../../public/svgs/icon_largest_army.svg";
import { StatusBubble } from "./StatusBubble";
import {
  getLongestRoadLength,
  getVictoryPoints,
  getPublicVictoryPoints,
} from "@settlex/game-core";
import { getVpDisplay } from "./PlayerAvatarStatsUtils";
import { getPlayerColorOption } from "../theme/playerColors";
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
  presence
}) => {
  if (!player) return null;

  // Prefer the player's chosen color; fall back to seat-index color.
  const chosenColor = player.chosenColor;
  const seatColor = player.color;
  const chosenGradient = chosenColor
    ? getPlayerColorOption(chosenColor).gradient
    : null;
  const seatGradient = seatColor
    ? getPlayerColorOption(seatColor).gradient
    : null;
  const avatarColor = chosenGradient || seatGradient || "from-slate-500 to-slate-800";
  const currentRoadLength = core && coreTopology
    ? getLongestRoadLength(core, coreTopology, player.id)
    : 0;
  const currentArmySize = player.knightsPlayed || 0;
  const hasLongestRoad = core?.awards?.longestRoadOwnerId === player.id;
  const hasLargestArmy = core?.awards?.largestArmyOwnerId === player.id;

  const totalPoints = core ? getVictoryPoints(core, player.id) : 0;
  const publicPoints = core ? getPublicVictoryPoints(core, player.id) : 0;
  const vpDisplay = getVpDisplay({ publicPoints, totalPoints, isMe });
  const isDisconnected = presence?.status === "disconnected";
  const disconnectTimerText =
    isDisconnected && presence?.remainingMs != null
      ? formatPresenceTimer(presence.remainingMs)
      : null;

  return (
    <div className="relative">
      <div
        className={`flex items-start ${
          isDisconnected ? "seat-disconnected-pulse" : ""
        }`}
      >
        <div className="flex w-20 items-center justify-center">
          <span className="flex relative">
          {isActive && (
            <span className="absolute -top-5 left-1/2 -translate-x-1/2">
              <span className="turn-chevron" />
            </span>
          )}
          <div
            className={`h-20 w-20 rounded-md bg-gradient-to-t ring-4 ring-white flex justify-center items-center text-6xl ${
              isDisconnected
                ? "seat-disconnected-avatar"
                : ""
            } ${avatarColor} ${isActive ? "avatar-active-glow" : ""}`}
          >
            {player.emoji || "🤠"}
          </div>
          <span className="absolute right-0 top-0 z-10 h-8 -translate-y-1/2 translate-x-1/2 transform rounded-full bg-blue-50 ring-2 ring-white text-xl font-semibold flex items-center justify-center min-w-[2rem] px-1">
            {vpDisplay}
          </span>
          {isDisconnected && (
            <span className="absolute bottom-1 right-1 text-[1rem] leading-none">
              ⚠️
            </span>
          )}
          {/* Only show status bubble for opponents, not for self */}
          {!isMe && !isDisconnected && (
            <StatusBubble statusType={statusType} isVisible={isActive} />
          )}
          </span>
        </div>
        <span
          className={`rounded-r-md flex h-20 px-2 gap-x-2 items-center ring-2 ${
            isDisconnected
              ? "bg-rose-100/80 ring-white/60 seat-disconnected-panel"
              : "bg-blue-200 bg-opacity-50 ring-white/60"
          }`}
        >
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center">
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
            <div className="flex items-center">
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
        </span>
      </div>
      {isDisconnected ? (
        <span className="absolute left-1/2 top-full mt-2 inline-flex min-w-[7rem] -translate-x-1/2 items-center justify-center gap-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.03em] text-rose-700 ring-1 ring-rose-200 shadow-sm whitespace-nowrap">
          <span>Disconnected</span>
          {disconnectTimerText ? (
            <span className="inline-block min-w-[2rem] tabular-nums text-right">
              {disconnectTimerText}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
};
